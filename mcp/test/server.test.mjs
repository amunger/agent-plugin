import assert from "node:assert/strict";
import { test } from "node:test";
import { connectTestServer, publishRecommendation, recommendation } from "./helpers/server.mjs";

test("packaged stdio server exposes the App and a lossless text result", async (t) => {
	const client = await connectTestServer();
	t.after(() => client.close());
	const { tools } = await client.listTools();
	assert.equal(tools.length, 2);
	const tool = tools.find((candidate) => candidate.name === "show_update_recommendation");
	assert.ok(tool);
	assert.equal(tool.name, "show_update_recommendation");
	assert.equal(tool.annotations.readOnlyHint, true);
	assert.equal(tool.annotations.openWorldHint, false);
	const uri = tool._meta.ui.resourceUri;
	assert.equal(uri, "ui://customization-update/recommendation.html");

	const result = await client.callTool({ name: tool.name, arguments: recommendation });
	assert.notEqual(result.isError, true);
	assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
	assert.match(result.structuredContent.readyPrompt, /Origin session link: agent-host-session:/);
	assert.match(result.structuredContent.delegationRequest, /relationship "independent"/);

	const resource = await client.readResource({ uri });
	assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
	assert.match(resource.contents[0].text, /Delegate change/);
	assert.doesNotMatch(resource.contents[0].text, /\/\* APP_SCRIPT \*\//);
});

test("packaged stdio server exposes a publish action", async (t) => {
	const client = await connectTestServer();
	t.after(() => client.close());
	const { tools } = await client.listTools();
	const tool = tools.find((candidate) => candidate.name === "show_plugin_publish_recommendation");
	assert.ok(tool);
	assert.equal(tool.annotations.readOnlyHint, true);
	assert.equal(tool.annotations.openWorldHint, false);

	const result = await client.callTool({ name: tool.name, arguments: publishRecommendation });
	assert.notEqual(result.isError, true);
	assert.equal(result.structuredContent.operation, "plugin-publish");
	assert.equal(result.structuredContent.actionLabel, "Publish plugin update");
	assert.match(result.structuredContent.readyPrompt, /push without force/);
});

test("packaged server rejects incomplete recommendations", async (t) => {
	const client = await connectTestServer();
	t.after(() => client.close());
	const result = await client.callTool({
		name: "show_update_recommendation",
		arguments: { ...recommendation, originSessionLink: "not a URL" },
	});
	assert.equal(result.isError, true);
});
