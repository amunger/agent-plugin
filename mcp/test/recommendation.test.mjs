import assert from "node:assert/strict";
import { test } from "node:test";
import { readRecommendationResult, renderUpdateRecommendation } from "../dist/recommendation.js";
import { recommendation } from "./helpers/server.mjs";

test("builds a traceable ready-to-go delegation prompt", () => {
	const rendered = renderUpdateRecommendation({
		title: "Delegate updates",
		summary: "Add an inline action.",
		sourceRepository: "amunger/agent-plugin",
		sourceFile: "instructions/example.instructions.md",
		proposedChange: "Render a delegation card.",
		futureBehavior: "A button creates an update session.",
		originSessionTitle: "Origin chat",
		originSessionLink: "agent-host-session://example",
	});

	assert.match(rendered.readyPrompt, /Origin session link: agent-host-session:\/\/example/);
	assert.match(rendered.readyPrompt, /Source repository: amunger\/agent-plugin/);
	assert.match(rendered.delegationRequest, /Use create_session/);
	assert.match(rendered.delegationRequest, /^\/btw Delegate/);
	assert.match(rendered.delegationRequest, /--- BEGIN READY PROMPT ---/);
});

test("reads structured results and text-only MCP projections without losing the ready prompt", () => {
	const rendered = renderUpdateRecommendation(recommendation);
	assert.deepEqual(readRecommendationResult({ structuredContent: rendered }), rendered);
	assert.deepEqual(readRecommendationResult({
		content: [
			{ type: "text", text: "A recommendation follows." },
			{ type: "text", text: JSON.stringify(rendered) },
		],
	}), rendered);
	assert.equal(
		rendered.delegationRequest.split("--- BEGIN READY PROMPT ---\n")[1].split("\n--- END READY PROMPT ---")[0],
		rendered.readyPrompt,
	);
});

test("rejects failed, missing, malformed, and incomplete results", () => {
	const rendered = renderUpdateRecommendation(recommendation);
	for (const result of [
		{ isError: true, structuredContent: rendered },
		{},
		{ content: [{ type: "text", text: "not JSON" }] },
		{ content: [{ type: "image", text: JSON.stringify(rendered) }] },
		{ structuredContent: { ...rendered, readyPrompt: "" } },
		{ structuredContent: { ...rendered, delegationRequest: " " } },
		{ structuredContent: null, content: [{ type: "text", text: JSON.stringify(rendered) }] },
	]) {
		assert.throws(() => readRecommendationResult(result), /recommendation/i);
	}
});
