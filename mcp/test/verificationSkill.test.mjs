import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);

test("verification uses the registered scheduling skill, not an MCP server or app", async () => {
	const config = JSON.parse(await readFile(new URL(".mcp.json", root), "utf8"));
	assert.deepEqual(Object.keys(config.mcpServers), ["disk-cleanup"]);
	for (const removed of ["verification.ts", "verificationApp.ts", "verificationServer.ts", "verification.html", "dist/verification.html", "dist/verificationServer.mjs"]) {
		await assert.rejects(access(new URL(`mcp/${removed}`, root)), { code: "ENOENT" });
	}
	const catalog = JSON.parse(await readFile(new URL("customization-catalog.json", root), "utf8"));
	const entries = catalog.customizations.filter(entry => entry.path === "skills/prepare-verification/SKILL.md");
	assert.equal(entries.length, 1);
	assert.equal(entries[0].category, "workflow-enhancement");
	assert.equal(entries[0].integrationRole, "standalone");
	const skill = await readFile(new URL(entries[0].path, root), "utf8");
	assert.match(skill, /^---\r?\nname: prepare-verification\r?\n/);
	assert.match(skill, /description: ".*schedule.*self-deleting/);
	assert.match(skill, /timing is unspecified, ask when to run/);
	assert.match(skill, /first occurrence/);
	assert.match(skill, /Create the automation \*\*disabled\*\*/);
	assert.match(skill, /returned automation\/provider IDs/);
	assert.match(skill, /disable its schedule before verification/);
	assert.match(skill, /delete this automation by ID, even if verification failed or was blocked/);
	assert.doesNotMatch(skill, /show_verification_plan|Go Ahead and Verify/);
	assert.ok(skill.trim().split(/\s+/).length < 400, "Keep the workflow concise");
});
