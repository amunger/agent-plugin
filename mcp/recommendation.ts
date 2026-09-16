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
		"Delegate the approved agent customization update now.",
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
