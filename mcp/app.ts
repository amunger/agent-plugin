import {
	App,
	applyDocumentTheme,
	applyHostStyleVariables,
	type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { RenderedUpdateRecommendation } from "./recommendation.js";

const app = new App({ name: "Customization Update Recommendation", version: "1.0.0" });
const card = getElement("card");
const title = getElement("title");
const summary = getElement("summary");
const source = getElement("source");
const proposedChange = getElement("proposed-change");
const futureBehavior = getElement("future-behavior");
const delegateButton = getElement("delegate");
const status = getElement("status");
let recommendation: RenderedUpdateRecommendation | undefined;

function getElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}
	return element;
}

function applyHostContext(context: McpUiHostContext): void {
	if (context.theme) {
		applyDocumentTheme(context.theme);
	}
	if (context.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}
}

function render(value: RenderedUpdateRecommendation): void {
	recommendation = value;
	title.textContent = value.title;
	summary.textContent = value.summary;
	source.textContent = `${value.sourceRepository} - ${value.sourceFile}`;
	proposedChange.textContent = value.proposedChange;
	futureBehavior.textContent = value.futureBehavior;
	card.hidden = false;
}

function isRenderedRecommendation(value: unknown): value is RenderedUpdateRecommendation {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return [
		"title",
		"summary",
		"sourceRepository",
		"sourceFile",
		"proposedChange",
		"futureBehavior",
		"originSessionTitle",
		"originSessionLink",
		"delegationRequest",
		"readyPrompt",
	].every((key) => typeof candidate[key] === "string");
}

app.ontoolresult = (result) => {
	const value: unknown = result.structuredContent;
	if (!isRenderedRecommendation(value)) {
		status.textContent = "The recommendation details were not available.";
		return;
	}
	render(value);
};

app.onhostcontextchanged = applyHostContext;
app.onerror = (error) => {
	console.error(error);
	status.textContent = "The recommendation card could not connect to the host.";
};

delegateButton.addEventListener("click", async () => {
	if (!recommendation) {
		status.textContent = "The recommendation is still loading.";
		return;
	}

	delegateButton.setAttribute("disabled", "true");
	status.textContent = "Starting delegation...";
	try {
		const result = await app.sendMessage(
			{
				role: "user",
				content: [{ type: "text", text: recommendation.delegationRequest }],
			},
			{ signal: AbortSignal.timeout(10_000) },
		);
		if (result.isError) {
			throw new Error("The host rejected the delegation request.");
		}
		status.textContent = "Delegation request sent.";
	} catch (error: unknown) {
		console.error(error);
		status.textContent = error instanceof Error ? error.message : "Delegation failed.";
		delegateButton.removeAttribute("disabled");
	}
});

async function connect(): Promise<void> {
	await app.connect();
	const context = app.getHostContext();
	if (context) {
		applyHostContext(context);
	}
}

void connect().catch((error: unknown) => {
	console.error(error);
	status.textContent = "The recommendation card could not connect to the host.";
});
