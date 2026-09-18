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
		delegationRequest,
		readyPrompt,
	};
}
