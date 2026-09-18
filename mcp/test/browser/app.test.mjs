import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { connectTestServer, recommendation } from "../helpers/server.mjs";

let browser;
let server;
let client;
let origin;
let result;

before(async () => {
	client = await connectTestServer();
	result = await client.callTool({ name: "show_update_recommendation", arguments: recommendation });
	const resource = await client.readResource({ uri: "ui://customization-update/recommendation.html" });
	const host = await build({
		entryPoints: [fileURLToPath(new URL("./host.mjs", import.meta.url))],
		bundle: true,
		format: "esm",
		platform: "browser",
		write: false,
	});
	server = createServer((request, response) => {
		const path = new URL(request.url, "http://localhost").pathname;
		const routes = {
			"/": ["text/html", '<!doctype html><title>MCP App test host</title><iframe id="app" title="Recommendation" style="width:700px;height:400px;border:0" sandbox="allow-scripts"></iframe><p id="host-status">Waiting for the App.</p><script type="module" src="/host.js"></script>'],
			"/host.js": ["text/javascript", host.outputFiles[0].text],
			"/app": ["text/html", resource.contents[0].text],
			"/result": ["application/json", JSON.stringify(result)],
		};
		const route = routes[path];
		response.writeHead(route ? 200 : 404, { "Content-Type": route?.[0] ?? "text/plain" });
		response.end(route?.[1] ?? "Not found");
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	origin = `http://127.0.0.1:${server.address().port}`;
	browser = await chromium.launch(process.env.MCP_APP_BROWSER
		? { executablePath: process.env.MCP_APP_BROWSER }
		: { channel: "msedge" });
});

after(async () => {
	await browser?.close();
	if (server) {
		await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	}
	await client?.close();
});

async function openApp(t, mode = "") {
	const page = await browser.newPage();
	t.after(() => page.close());
	await page.goto(`${origin}/?mode=${mode}`);
	await page.waitForFunction(() => window.testHost?.ready);
	return { page, app: page.frameLocator("#app") };
}

for (const mode of ["structured", "text"]) {
	test(`${mode} result renders collapsed details and delegates only after a click`, async (t) => {
		const { page, app } = await openApp(t, mode);
		await app.getByText("Customization update recommendation", { exact: true }).waitFor();
		assert.equal(await app.locator("details").evaluate((element) => element.open), false);
		assert.equal(await app.getByRole("button", { name: "Delegate change", includeHidden: true }).isVisible(), false);
		assert.ok(await app.locator("body").evaluate((element) => element.getBoundingClientRect().height) <= 32);
		assert.equal(await app.locator("body").innerText(), "Customization update recommendation");
		assert.deepEqual(await page.evaluate(() => window.testHost.messages), []);
		await app.locator("summary").press("Enter");
		assert.equal(await app.locator("details").evaluate((element) => element.open), true);
		assert.equal(await app.locator("#customization").innerText(), recommendation.sourceFile);
		assert.equal(await app.locator("#source").innerText(), recommendation.sourceRepository);
		assert.equal(await app.locator("#proposed-change").innerText(), recommendation.proposedChange);
		await app.getByRole("button", { name: "Delegate change" }).click();
		await page.waitForFunction(() => window.testHost.messages.length === 1);
		assert.deepEqual(await page.evaluate(() => window.testHost.messages), [{
			role: "user",
			content: [{ type: "text", text: result.structuredContent.delegationRequest }],
		}]);
		assert.equal(await app.getByRole("button", { name: "Delegate change" }).isDisabled(), true);
		await app.getByText(/Press Send/).waitFor();
		assert.match(await app.getByRole("status").innerText(), /\/btw.*independent session/);
		assert.deepEqual(await page.evaluate(() => window.testHost.errors), []);
	});
}

test("missing result details leave a visible error, not a blank hidden card", async (t) => {
	const { app } = await openApp(t, "invalid");
	await app.getByText(/not available/).waitFor();
	assert.equal(await app.locator("#card").isHidden(), true);
	assert.equal(await app.getByRole("status").isVisible(), true);
	assert.match(await app.getByRole("status").innerText(), /not available/);
});

test("rejected messages can be retried without claiming a session was created", async (t) => {
	const { page, app } = await openApp(t);
	await app.locator("summary").click();
	await page.evaluate(() => { window.testHost.reject = true; });
	await app.getByRole("button", { name: "Delegate change" }).click();
	await app.getByText(/host rejected/).waitFor();
	assert.equal(await app.getByRole("button", { name: "Delegate change" }).isEnabled(), true);
	assert.deepEqual(await page.evaluate(() => window.testHost.messages), []);
	await page.evaluate(() => { window.testHost.reject = false; });
	await app.getByRole("button", { name: "Delegate change" }).click();
	await page.waitForFunction(() => window.testHost.messages.length === 1);
	await app.getByText(/Request handed to chat/).waitFor();
	assert.match(await app.getByRole("status").innerText(), /Request handed to chat/);
});

test("a narrow card stays one line and replacement recommendations collapse again", async (t) => {
	const { page, app } = await openApp(t);
	await page.locator("#app").evaluate((element) => { element.style.width = "320px"; });
	assert.ok(await app.locator("body").evaluate((element) => element.getBoundingClientRect().height) <= 32);
	await app.locator("summary").click();
	await page.evaluate((value) => window.testHost.sendResult(value), result);
	await app.locator("details:not([open])").waitFor();
	assert.equal(await app.getByRole("button", { name: "Delegate change", includeHidden: true }).isVisible(), false);
});

test("a failed result clears the previous actionable recommendation", async (t) => {
	const { page, app } = await openApp(t);
	await page.evaluate(() => window.testHost.sendResult({ isError: true, content: [] }));
	await app.getByText(/recommendation tool failed/).waitFor();
	assert.equal(await app.locator("#card").isHidden(), true);
	assert.equal(await app.getByRole("button", { name: "Delegate change", includeHidden: true }).isDisabled(), true);
	assert.deepEqual(await page.evaluate(() => window.testHost.messages), []);
});
