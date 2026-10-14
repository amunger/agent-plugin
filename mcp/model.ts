import { z } from "zod";

const text = z.string().trim().min(1);

export function pathKey(value: string): string {
	const windows = /^[a-z]:[\\/]|^(?:\\\\|\/\/)/i.test(value);
	const normalized = value.replaceAll("\\", "/").replace(/\/+/g, "/").replace(/\/+$/, "");
	return windows ? normalized.toLowerCase() : normalized;
}

const directoryPath = z.string().min(1).refine((value) => {
	const normalized = value.replaceAll("\\", "/");
	return (/^(?:[a-z]:[\\/]|\/|\\\\)/i.test(value)
		&& !/[\u0000-\u001f*?]/.test(value)
		&& !normalized.split("/").some((part) => part === "." || part === "..")
		&& !/^(?:\/+|[a-z]:\/*|\/\/[^/]+\/[^/]+\/*)$/i.test(normalized));
}, "Use an absolute, non-root directory path without wildcards or dot segments.");

export const candidateSchema = z.object({
	path: directoryPath,
	kind: z.enum(["build-artifacts", "cache", "dependencies", "worktree", "other"]),
	repositoryPath: directoryPath.optional().describe("For worktrees, the canonical main checkout path from git worktree list. Used for repository grouping; never a cleanup target."),
	bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
	lastModifiedAt: z.iso.datetime({ offset: true }),
	risk: z.enum(["recoverable", "possible-data-loss"]),
	reason: text,
	evidence: z.array(text).min(1),
	recovery: text,
});

export const recommendationSchema = z.object({
	title: text,
	scope: text.describe("Machine and inspected roots; recommendations apply only there."),
	candidates: z.array(candidateSchema).max(100),
});

export type Candidate = z.infer<typeof candidateSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export interface Review extends Recommendation {
	readonly reviewedAt: string;
}

export function createReview(input: unknown, now = new Date()): Review {
	const recommendation = recommendationSchema.parse(input);
	const keys = new Set<string>();
	for (const entry of recommendation.candidates) {
		const age = now.getTime() - Date.parse(entry.lastModifiedAt);
		if (age < 0) {
			throw new Error(`Modification time is in the future: ${entry.path}`);
		}
		const minimumDays = entry.risk === "recoverable" ? 7 : 30;
		if (entry.kind === "worktree" && age <= minimumDays * 86_400_000) {
			throw new Error(`Worktree must be over ${minimumDays} days old: ${entry.path}`);
		}
		const key = pathKey(entry.path);
		for (const existing of keys) {
			if (key === existing || key.startsWith(`${existing}/`) || existing.startsWith(`${key}/`)) {
				throw new Error(`Overlapping cleanup directories: ${entry.path}`);
			}
		}
		keys.add(key);
	}
	return {
		...recommendation,
		candidates: [...recommendation.candidates].sort((a, b) => b.bytes - a.bytes),
		reviewedAt: now.toISOString(),
	};
}

export function readReview(result: {
	isError?: boolean;
	structuredContent?: unknown;
	content?: ReadonlyArray<{ type: string; text?: string }>;
}): Review {
	if (result.isError) {
		throw new Error("The cleanup recommendation tool failed. Request a new review.");
	}
	let value = result.structuredContent;
	if (value === undefined) {
		const block = result.content?.find((item) => item.type === "text" && item.text);
		if (!block?.text) {
			throw new Error("Cleanup recommendation details are missing.");
		}
		value = JSON.parse(block.text);
	}
	const parsed = recommendationSchema.extend({ reviewedAt: z.iso.datetime() }).parse(value);
	return createReview(parsed, new Date(parsed.reviewedAt));
}

export function formatBytes(bytes: number): string {
	if (bytes >= 2 ** 30) {
		return `${(bytes / 2 ** 30).toFixed(2)} GiB`;
	}
	return `${(bytes / 2 ** 20).toFixed(1)} MiB`;
}

export interface CandidateGroup {
	readonly repositoryPath?: string;
	readonly candidates: Candidate[];
	readonly bytes: number;
}

export function groupCandidates(candidates: readonly Candidate[]): CandidateGroup[] {
	const repositories = new Map<string, Candidate[]>();
	const ungrouped: CandidateGroup[] = [];
	for (const entry of candidates) {
		if (entry.kind === "worktree" && entry.repositoryPath) {
			const key = pathKey(entry.repositoryPath);
			const members = repositories.get(key) ?? [];
			members.push(entry);
			repositories.set(key, members);
		} else {
			ungrouped.push({ candidates: [entry], bytes: entry.bytes });
		}
	}
	const groups: CandidateGroup[] = [...repositories.values()].map((members) => ({
		repositoryPath: members[0]?.repositoryPath,
		candidates: [...members].sort((a, b) => b.bytes - a.bytes),
		bytes: members.reduce((sum, entry) => sum + entry.bytes, 0),
	}));
	return [...groups, ...ungrouped].sort((a, b) => {
		const aWorktree = a.candidates[0]?.kind === "worktree";
		const bWorktree = b.candidates[0]?.kind === "worktree";
		return Number(bWorktree) - Number(aWorktree) || b.bytes - a.bytes;
	});
}

export function buildCleanupPrompt(review: Review, paths: ReadonlySet<string>): string {
	const selected = review.candidates.filter((entry) => paths.has(entry.path));
	if (selected.length === 0 || selected.length !== paths.size) {
		throw new Error("Select at least one directory from this review.");
	}
	return [
		"Confirmed cleanup for the following entries:",
		...selected.map((entry) => entry.path),
	].join("\n");
}
