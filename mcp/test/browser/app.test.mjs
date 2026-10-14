import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { before, after, test } from "node:test";
import { chromium } from "playwright-core";
import { startPreview } from "../../preview/server.mjs";

let browser;
let preview;
before(async () => {
	preview = await startPreview();
	browser = await chromium.launch(process.env.MCP_APP_BROWSER ? { executablePath: process.env.MCP_APP_BROWSER } : { channel: "msedge" });
});
after(async () => {
	await browser?.close();
	await preview?.close();
});
async function openApp(t, mode = "") {
	const page = await browser.newPage();
	t.after(() => page.close());
	await page.goto(`${preview.origin}/?mode=${mode}`);
	await page.waitForFunction(() => window.previewHost?.ready);
	return { page, app: page.frameLocator("#app") };
}

for (const mode of ["structured", "text"]) {
	test(`${mode}: unchecked defaults, selected-only prompt, one handoff, no real cleanup`, async (t) => {
		const { page, app } = await openApp(t, mode);
		const checkboxes = app.locator("#candidates input");
		assert.equal(await checkboxes.count(), 3);
		assert.equal(await app.locator("#candidates input:checked").count(), 0);
		assert.equal(await app.locator("#cleanup").isDisabled(), true);
		assert.deepEqual(await page.evaluate(() => window.previewHost.messages), []);
		await checkboxes.nth(0).check();
		assert.match(await app.locator("#selection").innerText(), /^2 directories selected \/ 12.00 GiB/);
		await app.locator("#cleanup").click();
		await page.waitForFunction(() => window.previewHost.messages.length === 1);
		const messages = await page.evaluate(() => window.previewHost.messages);
		assert.equal(messages[0].role, "user");
		const prompt = messages[0].content[0].text;
		assert.equal(prompt, [
			"Confirmed cleanup for the following entries:",
			"Q:\\example\\jupyter.worktrees\\completed-notebooks",
			"Q:\\example\\jupyter.worktrees\\old-test-run",
		].join("\n"));
		assert.equal(await app.locator("#cleanup").isDisabled(), true);
		assert.equal(await checkboxes.nth(1).isDisabled(), true);
		await app.getByText(/prompt handed to chat/).waitFor();
		assert.deepEqual(await page.evaluate(() => window.previewHost.errors), []);
	});
}

test("risk labels are informational and selection needs no extra acknowledgement", async (t) => {
	const { app } = await openApp(t);
	const originalHeight = await app.locator("body").evaluate((body) => body.getBoundingClientRect().height);
	await app.locator(".risky input").check();
	assert.equal(await app.locator("#risk-area, #acknowledge").count(), 0);
	assert.equal(await app.locator("input").count(), await app.locator("#candidates input").count());
	assert.match(await app.locator(".risky .metadata").innerText(), /Possible data loss/);
	assert.equal(await app.locator("body").evaluate((body) => body.getBoundingClientRect().height), originalHeight);
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
	await app.locator("#candidates input").nth(0).check();
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
	await app.locator("#clear").click();
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
	await app.locator("#select-recoverable").click();
	assert.equal(await app.locator("#candidates input:checked").count(), 2);
	assert.equal(await app.locator(".risky input").isChecked(), false);
	assert.match(await app.locator("#selection").innerText(), /^3 directories selected \/ 60.00 GiB/);
});

test("host rejection is visible and allows retry without a success claim", async (t) => {
	const { page, app } = await openApp(t);
	await page.evaluate(() => { window.previewHost.reject = true; });
	await app.locator("#candidates input").nth(0).check();
	await app.locator("#cleanup").click();
	await app.getByText(/host rejected/).waitFor();
	assert.deepEqual(await page.evaluate(() => window.previewHost.messages), []);
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
	await page.evaluate(() => { window.previewHost.reject = false; });
	await app.locator("#cleanup").click();
	await page.waitForFunction(() => window.previewHost.messages.length === 1);
});

test("malformed results invalidate old selections and a fresh result resets them", async (t) => {
	const { page, app } = await openApp(t);
	await app.locator("#candidates input").nth(0).check();
	await page.evaluate(() => window.previewHost.sendResult({ isError: true, content: [] }));
	await app.getByText(/Cannot load review/).waitFor();
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
	assert.equal(await app.locator("#candidates input").count(), 0);
	await page.evaluate((result) => window.previewHost.sendResult(result), preview.result);
	await app.locator("#candidates input").nth(0).waitFor();
	assert.equal(await app.locator("#candidates input:checked").count(), 0);
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
});

test("untrusted descriptions are text and layout remains usable at narrow widths", async (t) => {
	const { page, app } = await openApp(t);
	const result = structuredClone(preview.result);
	result.structuredContent.candidates[0].reason = '<img src=x onerror="window.injected=true">';
	await page.evaluate((value) => window.previewHost.sendResult(value), result);
	await app.locator(".candidate").last().locator("summary").click();
	await app.getByText(result.structuredContent.candidates[0].reason, { exact: true }).waitFor();
	assert.equal(await app.locator("img").count(), 0);
	await page.setViewportSize({ width: 360, height: 900 });
	assert.equal(await app.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth), true);
	await app.locator("#candidates input").nth(0).focus();
	await app.locator("#candidates input").nth(0).press("Space");
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
});

test("empty review and invalid initial result are explicit and non-actionable", async (t) => {
	const { page, app } = await openApp(t, "invalid");
	await app.getByText(/Cannot load review/).waitFor();
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
	const result = structuredClone(preview.result);
	result.structuredContent.candidates = [];
	await page.evaluate((value) => window.previewHost.sendResult(value), result);
	await app.getByText(/No directories meet/).waitFor();
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
});

test("exported standalone example works offline and captures only selected entries", async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "cleanup-example-test-"));
	t.after(() => rm(directory, { recursive: true }));
	const file = path.join(directory, "example.html");
	await writeFile(file, preview.html);
	const page = await browser.newPage();
	t.after(() => page.close());
	await page.context().setOffline(true);
	await page.goto(pathToFileURL(file).href);
	await page.waitForFunction(() => window.previewHost?.ready);
	const app = page.frameLocator("#app");
	await app.locator("#select-recoverable").click();
	await app.locator("#cleanup").click();
	await page.waitForFunction(() => window.previewHost.messages.length === 1);
	const prompt = await page.locator("#prompt").innerText();
	assert.equal(prompt.split("\n").length, 4);
	assert.equal(prompt.split("\n")[0], "Confirmed cleanup for the following entries:");
	assert.ok(!prompt.includes("completed-validation"));
	assert.ok(!prompt.includes("unfinished-experiment"));
	assert.match(await page.locator("#host-status").innerText(), /does not send it to chat/);
});

test("repositories are single compact entries ranked by total, with all members in Details", async (t) => {
	const { page, app } = await openApp(t);
	assert.deepEqual(await app.locator(".candidate strong").allTextContents(), [
		"jupyter (2 worktrees)",
		"vscode (2 worktrees)",
		"Q:\\example\\copilot-runtime\\build-output",
	]);
	assert.deepEqual(await app.locator(".candidate .size").allTextContents(), [
		"12.00 GiB", "10.19 GiB", "48.00 GiB",
	]);
	for (const width of [1080, 360]) {
		await page.setViewportSize({ width, height: 900 });
		const heights = await app.locator(".candidate").evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
		assert.ok(heights.every((height) => height <= 56), `Rows exceed 56px at ${width}px: ${heights}`);
		assert.equal(await app.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth), true);
	}
	const first = app.locator(".candidate").first();
	await first.locator("summary").click();
	await first.getByText("Q:\\example\\jupyter.worktrees\\completed-notebooks", { exact: true }).waitFor();
	await first.getByText("Q:\\example\\jupyter.worktrees\\old-test-run", { exact: true }).waitFor();
	assert.equal(await first.locator("input").count(), 1);
	assert.equal(await app.locator("#candidates input:checked").count(), 0);
});

test("repository selection is atomic and mixed-risk groups submit all member paths only", async (t) => {
	const { page, app } = await openApp(t);
	const repo = app.getByRole("checkbox", { name: "Q:\\example\\vscode: 2 candidate worktrees", exact: true });
	await repo.check();
	assert.match(await app.locator("#selection").innerText(), /^2 directories selected \/ 10.19 GiB/);
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
	await repo.uncheck();
	assert.match(await app.locator("#selection").innerText(), /^0 directories selected/);
	assert.equal(await app.locator("#cleanup").isDisabled(), true);
	await repo.check();
	await app.locator("#select-recoverable").click();
	assert.equal(await app.locator("#cleanup").isEnabled(), true);
	await app.locator("#clear").click();
	assert.equal(await app.locator("#candidates input:checked").count(), 0);
	await repo.check();
	await app.locator("#cleanup").click();
	await page.waitForFunction(() => window.previewHost.messages.length === 1);
	assert.equal(await page.locator("#prompt").innerText(), [
		"Confirmed cleanup for the following entries:",
		"Q:\\example\\worktrees\\completed-validation",
		"Q:\\example\\worktrees\\unfinished-experiment",
	].join("\n"));
});

test("worktrees without repository metadata remain selectable individual entries", async (t) => {
	const { page, app } = await openApp(t);
	const result = structuredClone(preview.result);
	const worktree = result.structuredContent.candidates.find((entry) => entry.kind === "worktree" && entry.risk === "recoverable");
	delete worktree.repositoryPath;
	result.structuredContent.candidates = [worktree];
	await page.evaluate((value) => window.previewHost.sendResult(value), result);
	const checkbox = app.getByRole("checkbox", { name: worktree.path, exact: true });
	await checkbox.check();
	assert.equal(await app.locator("#candidates input").count(), 1);
	await app.locator("#cleanup").click();
	await page.waitForFunction(() => window.previewHost.messages.length === 1);
	assert.equal(await page.locator("#prompt").innerText(), `Confirmed cleanup for the following entries:\n${worktree.path}`);
});
