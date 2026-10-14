import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { test } from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const plan = {
	title: "Verify attribution",
	summary: "Inspect the exact deployed revision.",
	checks: ["Compare SDK and host events for the same operation."],
	limitations: "Wait for sufficient post-rollout traffic.",
};

const appBuild = await build({
	entryPoints: [fileURLToPath(new URL("../verificationApp.ts", import.meta.url))],
	bundle: true,
	format: "iife",
	platform: "browser",
	write: false,
	plugins: [{
		name: "mock-host",
		setup(builder) {
			builder.onResolve({ filter: /^@modelcontextprotocol\/ext-apps$/ }, () => ({ path: "host", namespace: "mock" }));
			builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
				contents: "export const App=globalThis.MockApp; export const applyDocumentTheme=()=>{}; export const applyHostStyleVariables=()=>{};",
			}));
		},
	}],
});

async function loadApp(sendMessage = async () => ({})) {
	class Element {
		textContent = "";
		disabled = true;
		children = [];
		listeners = new Map();
		replaceChildren(...children) { this.children = children; }
		addEventListener(event, listener) { this.listeners.set(event, listener); }
		click() { return this.listeners.get("click")(); }
	}
	const elements = new Map(["title", "summary", "checks", "limitations", "verify", "status"].map(id => [id, new Element()]));
	let app;
	const errors = [];
	class MockApp {
		constructor() { app = this; }
		async connect() { }
		getHostContext() { return { theme: "dark" }; }
		sendMessage = sendMessage;
	}
	vm.runInNewContext(appBuild.outputFiles[0].text, {
		MockApp,
		AbortSignal,
		console: { error: error => errors.push(error) },
		document: {
			getElementById: id => elements.get(id),
			createElement: () => new Element(),
		},
	});
	await new Promise(resolve => setImmediate(resolve));
	return { app, elements, errors };
}

test("input-only hosts render a safe overview and send only the exact same-chat prompt once", async () => {
	const messages = [];
	const { app, elements } = await loadApp(async message => { messages.push(JSON.parse(JSON.stringify(message))); return {}; });
	assert.equal(elements.get("verify").disabled, true);
	app.ontoolinput({ arguments: { ...plan, summary: "<img src=x onerror=alert(1)>" } });
	assert.equal(elements.get("summary").textContent, "<img src=x onerror=alert(1)>");
	assert.equal(elements.get("checks").children[0].textContent, plan.checks[0]);
	assert.equal(elements.get("verify").disabled, false);
	assert.equal(messages.length, 0, "Rendering must never start verification");
	await elements.get("verify").click();
	app.ontoolresult({ structuredContent: plan });
	await elements.get("verify").click();
	assert.deepEqual(messages, [{ role: "user", content: [{ type: "text", text: "go ahead and verify" }] }]);
	assert.equal(elements.get("verify").disabled, true);
	assert.equal(elements.get("status").textContent, "Verification requested in this chat.");
});

test("invalid plans cannot enable verification; a missing result does not erase valid tool input", async () => {
	const { app, elements } = await loadApp();
	for (const value of [null, {}, { ...plan, checks: [] }, { ...plan, checks: [" "] }, { ...plan, checks: [5] }]) {
		app.ontoolresult({ structuredContent: value });
		assert.equal(elements.get("verify").disabled, true);
	}
	app.ontoolinput({ arguments: plan });
	app.ontoolresult({});
	assert.equal(elements.get("verify").disabled, false);
	assert.equal(elements.get("title").textContent, plan.title);
});

test("known rejection permits retry but uncertain delivery does not resend", async () => {
	let calls = 0;
	const { app, elements } = await loadApp(async () => {
		calls++;
		if (calls === 1) { return { isError: true }; }
		throw new Error("Transport timed out");
	});
	app.ontoolresult({ structuredContent: plan });
	await elements.get("verify").click();
	assert.equal(elements.get("verify").disabled, false);
	assert.match(elements.get("status").textContent, /rejected/);
	await elements.get("verify").click();
	await elements.get("verify").click();
	assert.equal(calls, 2);
	assert.equal(elements.get("verify").disabled, true);
	assert.match(elements.get("status").textContent, /could not be confirmed/);
});

test("packaged server exposes the plan, text fallback, and accessible button resource", { timeout: 15000 }, async () => {
	const server = spawn(process.execPath, [fileURLToPath(new URL("../dist/verificationServer.mjs", import.meta.url))], { stdio: ["pipe", "pipe", "pipe"] });
	const pending = new Map();
	let nextId = 0;
	let stderr = "";
	server.stderr.on("data", data => { stderr += data; });
	const reader = createInterface({ input: server.stdout });
	reader.on("line", line => {
		const message = JSON.parse(line);
		const request = pending.get(message.id);
		if (!request) { return; }
		pending.delete(message.id);
		if (message.error) { request.reject(new Error(JSON.stringify(message.error))); } else { request.resolve(message.result); }
	});
	server.on("exit", code => {
		for (const request of pending.values()) { request.reject(new Error(`Server exited (${code}): ${stderr}`)); }
		pending.clear();
	});
	function request(method, params) {
		return new Promise((resolve, reject) => {
			const id = ++nextId;
			pending.set(id, { resolve, reject });
			server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
		});
	}
	try {
		await request("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "verification-test", version: "1" } });
		server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
		const tools = await request("tools/list", {});
		const tool = tools.tools.find(tool => tool.name === "show_verification_plan");
		assert.ok(tool);
		assert.equal(tool.annotations.readOnlyHint, true);
		const config = JSON.parse(await readFile(new URL("../../.mcp.json", import.meta.url), "utf8"));
		assert.equal(config.mcpServers.verification.args[0], "${PLUGIN_ROOT}/mcp/dist/verificationServer.mjs");
		const result = await request("tools/call", { name: tool.name, arguments: plan });
		assert.deepEqual(result.structuredContent, plan);
		assert.match(result.content[0].text, /Reply "go ahead and verify"/);
		const resource = await request("resources/read", { uri: tool._meta.ui.resourceUri });
		const html = resource.contents[0].text;
		assert.match(html, /<button id="verify" type="button" disabled>Go Ahead and Verify<\/button>/);
		assert.match(html, /role="status" aria-live="polite"/);
		assert.match(html, /:focus-visible/);
		assert.ok(!html.includes("/* APP_SCRIPT */"));
		const invalid = await request("tools/call", { name: tool.name, arguments: { ...plan, checks: [] } }).catch(error => error);
		assert.ok(invalid instanceof Error || invalid.isError, "Reject incomplete plans");
	} finally {
		reader.close();
		server.kill();
	}
});

test("verification skill is registered in the maintenance catalog", async () => {
	const root = new URL("../../", import.meta.url);
	const catalog = JSON.parse(await readFile(new URL("customization-catalog.json", root), "utf8"));
	const entries = catalog.customizations.filter(entry => entry.path === "skills/prepare-verification/SKILL.md");
	assert.equal(entries.length, 1);
	assert.equal(entries[0].category, "workflow-enhancement");
	const skill = await readFile(new URL(entries[0].path, root), "utf8");
	assert.match(skill, /^---\r?\nname: prepare-verification\r?\n/);
	assert.match(skill, /show_verification_plan/);
	assert.match(skill, /Do not append prose after the card/);
});
