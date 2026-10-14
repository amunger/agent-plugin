/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

export interface VerificationPlan {
	readonly title: string;
	readonly summary: string;
	readonly checks: readonly string[];
	readonly limitations: string;
}

export const verificationPrompt = "go ahead and verify";

export function isVerificationPlan(value: unknown): value is VerificationPlan {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return typeof candidate.title === "string" && candidate.title.trim().length > 0
		&& typeof candidate.summary === "string" && candidate.summary.trim().length > 0
		&& typeof candidate.limitations === "string" && candidate.limitations.trim().length > 0
		&& Array.isArray(candidate.checks) && candidate.checks.length > 0 && candidate.checks.length <= 10
		&& candidate.checks.every(check => typeof check === "string" && check.trim().length > 0);
}

export function verificationPlanText(plan: VerificationPlan): string {
	return [
		plan.title,
		plan.summary,
		...plan.checks.map(check => `- ${check}`),
		`Limits/readiness: ${plan.limitations}`,
		'Reply "go ahead and verify" to run this plan in this chat.',
	].join("\n");
}
