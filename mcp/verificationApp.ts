/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { App, applyDocumentTheme, applyHostStyleVariables, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { isVerificationPlan, verificationPrompt } from "./verification.js";

const app = new App({ name: "Verification Plan", version: "1.0.0" });
function getElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}
	return element;
}
const title = getElement("title");
const summary = getElement("summary");
const checks = getElement("checks");
const limitations = getElement("limitations");
const button = getElement("verify") as HTMLButtonElement;
const status = getElement("status");
let ready = false;
let submitted = false;
let connected = false;

function render(value: unknown): void {
	if (!isVerificationPlan(value)) {
		if (!ready) {
			status.textContent = "The verification plan is unavailable. Ask for a new plan in chat.";
		}
		return;
	}
	title.textContent = value.title;
	summary.textContent = value.summary;
	checks.replaceChildren(...value.checks.map(check => {
		const item = document.createElement("li");
		item.textContent = check;
		return item;
	}));
	limitations.textContent = value.limitations;
	ready = true;
	button.disabled = !connected || submitted;
}

function applyContext(context: McpUiHostContext): void {
	if (context.theme) {
		applyDocumentTheme(context.theme);
	}
	if (context.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}
}

app.ontoolinput = input => render(input.arguments);
app.ontoolresult = result => render(result.structuredContent);
app.onhostcontextchanged = applyContext;
app.onerror = error => {
	console.error(error);
	status.textContent = "The verification card encountered a host error. Check this chat before sending again.";
};
button.addEventListener("click", async () => {
	if (!ready || !connected || submitted) {
		return;
	}
	submitted = true;
	button.disabled = true;
	status.textContent = "Sending request to this chat...";
	try {
		const result = await app.sendMessage({
			role: "user",
			content: [{ type: "text", text: verificationPrompt }],
		}, { signal: AbortSignal.timeout(10_000) });
		if (result.isError) {
			submitted = false;
			button.disabled = false;
			status.textContent = 'The host rejected the request. Retry or type "go ahead and verify" in this chat.';
			return;
		}
		status.textContent = "Verification requested in this chat.";
	} catch (error: unknown) {
		console.error(error);
		// A transport timeout does not prove the host failed to accept the request.
		status.textContent = 'Delivery could not be confirmed. Check this chat before typing "go ahead and verify" yourself.';
	}
});

void app.connect().then(() => {
	connected = true;
	const context = app.getHostContext();
	if (context) {
		applyContext(context);
	}
	button.disabled = !ready || submitted;
}).catch((error: unknown) => {
	console.error(error);
	status.textContent = 'This host cannot connect the verification card. Type "go ahead and verify" in this chat instead.';
});
