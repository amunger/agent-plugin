export interface UpdateRecommendation {
	readonly title: string;
	readonly summary: string;
	readonly sourceRepository: string;
	readonly sourceFile: string;
	readonly proposedChange: string;
	readonly futureBehavior: string;
	readonly originSessionTitle: string;
	readonly originSessionLink: string;
}

export interface RenderedUpdateRecommendation extends UpdateRecommendation {
	readonly operation: "customization-update" | "plugin-publish";
	readonly cardTitle: string;
	readonly actionLabel: string;
	readonly subjectLabel: string;
	readonly delegationRequest: string;
	readonly readyPrompt: string;
}

interface RecommendationToolResult {
	readonly isError?: boolean;
	readonly structuredContent?: unknown;
	readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
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
		"operation",
		"cardTitle",
		"actionLabel",
		"subjectLabel",
		"delegationRequest",
		"readyPrompt",
	].every((key) => typeof candidate[key] === "string" && candidate[key].trim().length > 0);
}

export function readRecommendationResult(result: RecommendationToolResult): RenderedUpdateRecommendation {
	if (result.isError) {
		throw new Error("The recommendation tool failed. Ask the agent to try again.");
	}
	if (result.structuredContent !== undefined) {
		if (isRenderedRecommendation(result.structuredContent)) {
			return result.structuredContent;
		}
		throw new Error("The recommendation details were invalid.");
	}

	// Some hosts project only MCP content blocks, dropping structuredContent.
	for (const block of result.content ?? []) {
		if (block.type !== "text" || !block.text) {
			continue;
		}
		let value: unknown;
		try {
			value = JSON.parse(block.text);
		} catch (error: unknown) {
			if (error instanceof SyntaxError) {
				continue;
			}
			throw error;
		}
		if (isRenderedRecommendation(value)) {
			return value;
		}
	}
	throw new Error("The recommendation details were not available. Ask the agent for the text recommendation.");
}

export function renderUpdateRecommendation(
	recommendation: UpdateRecommendation,
): RenderedUpdateRecommendation {
	return renderRecommendation(recommendation, "customization-update");
}

export function renderPluginPublishRecommendation(
	recommendation: UpdateRecommendation,
): RenderedUpdateRecommendation {
	return renderRecommendation(recommendation, "plugin-publish");
}

function renderRecommendation(
	recommendation: UpdateRecommendation,
	operation: RenderedUpdateRecommendation["operation"],
): RenderedUpdateRecommendation {
	if (operation === "plugin-publish") {
		const readyPrompt = [
			"Publish the approved local agent plugin changes described below.",
			"",
			`Origin session: ${recommendation.originSessionTitle}`,
			`Origin session link: ${recommendation.originSessionLink}`,
			`Source repository: ${recommendation.sourceRepository}`,
			`Plugin manifest: ${recommendation.sourceFile}`,
			"",
			`Local state: ${recommendation.title}`,
			recommendation.summary,
			"",
			"Publishing task:",
			recommendation.proposedChange,
			"",
			"Expected outcome:",
			recommendation.futureBehavior,
			"",
			"Instructions:",
			"- Treat the button press in the origin session as approval to publish the existing local plugin update.",
			"- Work in the source repository named above and locate its source checkout before acting.",
			"- Inspect the status, diff, validation evidence, branch, upstream, and remote before committing or pushing.",
			"- Do not add unrelated source changes. Bump the plugin version only when repository publishing rules still require it.",
			"- Commit uncommitted plugin changes using repository conventions, fetch and rebase without dropping work, then push without force.",
			"- Verify the worktree is clean and the branch is zero ahead and zero behind its upstream.",
			"- If the local changes are missing, unsafe, ambiguous, or blocked, stop and report the evidence instead of claiming publication.",
			"- Keep the origin session link in the completion summary for traceability.",
		].join("\n");

		return {
			...recommendation,
			operation,
			cardTitle: "Local plugin changes ready",
			actionLabel: "Publish plugin update",
			subjectLabel: "Plugin manifest",
			delegationRequest: [
				"/btw Publish the approved local agent plugin update now.",
				"Use create_session with relationship \"independent\" and resolve the source repository below as its workspace.",
				"Use the following text as the new session's initial prompt exactly as written:",
				"",
				"--- BEGIN READY PROMPT ---",
				readyPrompt,
				"--- END READY PROMPT ---",
			].join("\n"),
			readyPrompt,
		};
	}

	const readyPrompt = [
		"Implement the approved agent customization change described below.",
		"",
		`Origin session: ${recommendation.originSessionTitle}`,
		`Origin session link: ${recommendation.originSessionLink}`,
		`Source repository: ${recommendation.sourceRepository}`,
		`Source file: ${recommendation.sourceFile}`,
		"",
		`Recommendation: ${recommendation.title}`,
		recommendation.summary,
		"",
		"Proposed change:",
		recommendation.proposedChange,
		"",
		"Expected future behavior:",
		recommendation.futureBehavior,
		"",
		"Instructions:",
		"- Treat the button press in the origin session as approval for this change.",
		"- Work in the source repository named above and locate its source checkout before editing.",
		"- Inspect related customizations and repository guidance before making changes.",
		"- Make the smallest complete source change, update classification metadata and documentation when applicable, and validate it.",
		"- Keep the origin session link in the completion summary for traceability.",
	].join("\n");

	const delegationRequest = [
		"/btw Delegate the approved agent customization update now.",
		"Use create_session with relationship \"independent\" and resolve the source repository below as its workspace.",
		"Use the following text as the new session's initial prompt exactly as written:",
		"",
		"--- BEGIN READY PROMPT ---",
		readyPrompt,
		"--- END READY PROMPT ---",
	].join("\n");

	return {
		...recommendation,
		operation,
		cardTitle: "Customization update recommendation",
		actionLabel: "Delegate change",
		subjectLabel: "Skill / instruction",
		delegationRequest,
		readyPrompt,
	};
}
