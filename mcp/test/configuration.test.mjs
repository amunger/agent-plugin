import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

test("MCP configuration points to a packaged server entrypoint", async () => {
	const pluginRoot = new URL("../../", import.meta.url);
	const configuration = JSON.parse(
		await readFile(new URL(".mcp.json", pluginRoot), "utf8"),
	);
	const server = configuration.mcpServers?.["customization-update"];

	assert.equal(server?.command, "node");
	assert.deepEqual(server?.args, ["mcp/dist/server.mjs"]);
	await access(new URL(server.args[0], pluginRoot));
});
