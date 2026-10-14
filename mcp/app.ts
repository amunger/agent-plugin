import { App, applyDocumentTheme, applyHostStyleVariables, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { buildCleanupPrompt, formatBytes, groupCandidates, readReview, type CandidateGroup, type Review } from "./model.ts";

function element(id: string): HTMLElement {
	const value = document.getElementById(id);
	if (!value) {
		throw new Error(`Missing UI element: ${id}`);
	}
	return value;
}

const app = new App({ name: "Disk cleanup", version: "0.2.0" });
const list = element("candidates");
const cleanup = element("cleanup");
const status = element("status");
const selectRecoverable = element("select-recoverable");
const clear = element("clear");
const selected = new Set<string>();
const choices = new Map<HTMLInputElement, CandidateGroup>();
let review: Review | undefined;
let connected = false;
let busy = false;
let submitted = false;
let generation = 0;

function update(): void {
	const entries = review?.candidates.filter((entry) => selected.has(entry.path)) ?? [];
	element("selection").textContent = `${entries.length} directories selected / ${formatBytes(entries.reduce((sum, entry) => sum + entry.bytes, 0))} estimated`;
	for (const [input, group] of choices) {
		input.checked = group.candidates.every((entry) => selected.has(entry.path));
	}
	cleanup.toggleAttribute("disabled", !connected || busy || submitted || !entries.length);
	for (const control of [selectRecoverable, clear, ...list.querySelectorAll("input")]) {
		control.toggleAttribute("disabled", busy || submitted);
	}
}

function render(value: Review): void {
	generation++;
	review = value;
	selected.clear();
	submitted = false;
	busy = false;
	element("title").textContent = value.title;
	element("scope").textContent = value.scope;
	element("reviewed").textContent = `Reviewed ${new Date(value.reviewedAt).toLocaleString()}. Sizes are estimates; evidence must be rechecked before removal.`;
	list.replaceChildren();
	choices.clear();
	let index = 0;
	for (const group of groupCandidates(value.candidates)) {
		const first = group.candidates[0];
		if (!first) {
			continue;
		}
		const target = group.repositoryPath ?? first.path;
		const risky = group.candidates.some((entry) => entry.risk === "possible-data-loss");
		const card = document.createElement("article");
		card.className = risky ? "candidate risky" : "candidate";
		const label = document.createElement("label");
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = `candidate-${index++}`;
		checkbox.setAttribute("aria-label", group.repositoryPath ? `${target}: ${group.candidates.length} candidate worktrees` : target);
		choices.set(checkbox, group);
		checkbox.addEventListener("change", () => {
			for (const entry of group.candidates) {
				if (checkbox.checked) {
					selected.add(entry.path);
				} else {
					selected.delete(entry.path);
				}
			}
			update();
		});
		const path = document.createElement("strong");
		const name = target.replace(/[\\/]+$/, "").split(/[\\/]/).at(-1) ?? target;
		path.textContent = group.repositoryPath ? `${name} (${group.candidates.length} worktrees)` : target;
		path.title = target;
		label.append(checkbox, path);
		const size = document.createElement("span");
		size.className = "size";
		size.textContent = formatBytes(group.bytes);
		const header = document.createElement("div");
		header.className = "candidate-header";
		header.append(label, size);
		const metadata = document.createElement("span");
		metadata.className = "metadata";
		const latestActivity = Math.max(...group.candidates.map((entry) => Date.parse(entry.lastModifiedAt)));
		const age = Math.floor((Date.parse(value.reviewedAt) - latestActivity) / 86_400_000);
		metadata.textContent = `${risky ? "Possible data loss" : "Recoverable"} / ${age}d${group.candidates.length > 1 ? "+" : ""} inactive`;
		metadata.title = `Latest activity: ${new Date(latestActivity).toLocaleString()}`;
		const details = document.createElement("details");
		const summary = document.createElement("summary");
		const detailsLabel = document.createElement("span");
		detailsLabel.textContent = "Details";
		summary.append(metadata, detailsLabel);
		details.append(summary);
		if (group.repositoryPath) {
			const scope = document.createElement("p");
			scope.textContent = `Repository: ${target}. Selects only the ${group.candidates.length} candidate worktrees listed below, not the main checkout or other worktrees.`;
			details.append(scope);
		}
		for (const entry of group.candidates) {
			const member = document.createElement("section");
			member.className = "candidate-detail";
			const fullPath = document.createElement("p");
			fullPath.textContent = entry.path;
			const modified = document.createElement("p");
			modified.textContent = `${formatBytes(entry.bytes)} / ${entry.kind} / ${entry.risk === "recoverable" ? "Recoverable" : "Possible data loss"} / Updated ${new Date(entry.lastModifiedAt).toLocaleString()}`;
			const reason = document.createElement("p");
			reason.textContent = entry.reason;
			const evidence = document.createElement("ul");
			for (const fact of entry.evidence) {
				const item = document.createElement("li");
				item.textContent = fact;
				evidence.append(item);
			}
			const recovery = document.createElement("p");
			recovery.textContent = `Recovery: ${entry.recovery}`;
			member.append(fullPath, modified, reason, evidence, recovery);
			details.append(member);
		}
		card.append(header, details);
		list.append(card);
	}
	if (!value.candidates.length) {
		list.textContent = "No directories meet the cleanup criteria in this scope.";
	}
	status.textContent = "";
	update();
}

function theme(context: McpUiHostContext): void {
	if (context.theme) {
		applyDocumentTheme(context.theme);
	}
	if (context.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}
}

app.ontoolresult = (result) => {
	try {
		render(readReview(result));
	} catch (error: unknown) {
		generation++;
		review = undefined;
		selected.clear();
		choices.clear();
		list.replaceChildren();
		status.textContent = `Cannot load review: ${error instanceof Error ? error.message : String(error)}`;
		update();
	}
};
app.onhostcontextchanged = theme;
app.onerror = (error) => {
	status.textContent = `MCP App error: ${error.message}`;
};

selectRecoverable.addEventListener("click", () => {
	for (const group of choices.values()) {
		if (group.candidates.every((entry) => entry.risk === "recoverable")) {
			for (const entry of group.candidates) {
				selected.add(entry.path);
			}
		}
	}
	update();
});
clear.addEventListener("click", () => {
	selected.clear();
	update();
});
cleanup.addEventListener("click", async () => {
	if (!review || cleanup.hasAttribute("disabled")) {
		return;
	}
	const currentGeneration = generation;
	busy = true;
	status.textContent = "Sending cleanup request to chat...";
	update();
	try {
		const result = await app.sendMessage({
			role: "user",
			content: [{ type: "text", text: buildCleanupPrompt(review, selected) }],
		});
		if (currentGeneration !== generation) {
			return;
		}
		if (result.isError) {
			throw new Error("The host rejected the request. Check the chat input before retrying.");
		}
		submitted = true;
		status.textContent = "Cleanup prompt handed to chat. Send it if your host requires confirmation. No files have been deleted by this app.";
	} catch (error: unknown) {
		if (currentGeneration === generation) {
			status.textContent = `Request failed: ${error instanceof Error ? error.message : String(error)} Check chat before retrying to avoid duplicate requests.`;
		}
	} finally {
		if (currentGeneration === generation) {
			busy = false;
			update();
		}
	}
});

try {
	await app.connect();
	const context = app.getHostContext();
	if (context) {
		theme(context);
	}
	connected = true;
	update();
} catch (error: unknown) {
	status.textContent = `Cannot connect to the MCP host: ${error instanceof Error ? error.message : String(error)}`;
	update();
}
