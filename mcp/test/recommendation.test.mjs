import assert from "node:assert/strict";
import { test } from "node:test";
import { renderUpdateRecommendation } from "../dist/recommendation.js";

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
	assert.match(rendered.delegationRequest, /--- BEGIN READY PROMPT ---/);
});
