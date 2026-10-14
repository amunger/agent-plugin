import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const appHtml = await readFile(new URL("../../dist/verification.html", import.meta.url), "utf8");
const host = await build({
	stdin: {
		contents: `
			import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
			const { html, inputOnly } = window.testData;
			const state = window.verificationHost = { ready: false, messages: [], errors: [] };
			const bridge = new AppBridge(null, { name: "Verification test host", version: "1" },
				{ message: { text: {} } }, { hostContext: { theme: "dark" } });
			bridge.onerror = error => state.errors.push(error.message);
			bridge.onmessage = async message => { state.messages.push(message); return {}; };
			bridge.oninitialized = async () => {
				const plan = { title: "Verify rollout", summary: "Check the exact build.", checks: ["Compare paired account fields."], limitations: "Wait for ingestion." };
				await bridge.sendToolInput({ arguments: plan });
				await bridge.sendToolResult(inputOnly ? { content: [] } : { content: [], structuredContent: plan });
				state.ready = true;
			};
			const frame = document.getElementById("app");
			await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
			frame.srcdoc = html;
		`,
		resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
	},
	bundle: true,
	format: "esm",
	platform: "browser",
	write: false,
});

for (const inputOnly of [true, false]) {
	test(`verification button uses real MCP bridge and keyboard (${inputOnly ? "input-only" : "structured result"})`, { timeout: 30000 }, async t => {
		const browser = await chromium.launch(process.env.MCP_APP_BROWSER ? { executablePath: process.env.MCP_APP_BROWSER } : { channel: "msedge" });
		t.after(() => browser.close());
		const page = await browser.newPage();
		const data = JSON.stringify({ html: appHtml, inputOnly }).replaceAll("<", "\\u003c");
		await page.setContent(`<!doctype html><iframe id="app" title="Verification plan" sandbox="allow-scripts"></iframe><script>window.testData=${data};</script><script type="module">${host.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`);
		await page.waitForFunction(() => window.verificationHost?.ready);
		const app = page.frameLocator("#app");
		const button = app.getByRole("button", { name: "Go Ahead and Verify" });
		assert.equal(await button.isEnabled(), true);
		assert.equal(await app.getByRole("heading", { name: "Verify rollout" }).count(), 1);
		assert.deepEqual(await page.evaluate(() => window.verificationHost.messages), []);
		await button.focus();
		await page.keyboard.press("Enter");
		await page.waitForFunction(() => window.verificationHost.messages.length === 1);
		assert.deepEqual(await page.evaluate(() => window.verificationHost.messages), [{
			role: "user", content: [{ type: "text", text: "go ahead and verify" }],
		}]);
		assert.equal(await button.isDisabled(), true);
		await app.getByRole("status").getByText("Verification requested in this chat.").waitFor();
		assert.deepEqual(await page.evaluate(() => window.verificationHost.errors), []);
	});
}
