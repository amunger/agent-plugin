import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

const result = await (await fetch("/result")).json();
const mode = new URL(location.href).searchParams.get("mode");
const bridge = new AppBridge(
	null,
	{ name: "Recommendation test host", version: "1.0.0" },
	{ message: { text: {} } },
	{ hostContext: { theme: "light" } },
);
const state = window.testHost = {
	ready: false,
	messages: [],
	reject: false,
	errors: [],
	sendResult: (value) => bridge.sendToolResult(value),
};
bridge.onerror = (error) => {
	state.errors.push(error.message);
	document.getElementById("host-status").textContent = error.message;
};
bridge.onmessage = async (message) => {
	if (state.reject) {
		return { isError: true };
	}
	state.messages.push(message);
	document.getElementById("host-status").textContent = "Message received; no session was created by this test host.";
	return {};
};
bridge.oninitialized = async () => {
	await bridge.sendToolInput({ arguments: result.structuredContent });
	if (mode === "text") {
		await bridge.sendToolResult({ content: result.content });
	} else if (mode === "invalid") {
		await bridge.sendToolResult({ content: [] });
	} else {
		await bridge.sendToolResult(result);
	}
	state.ready = true;
};
const iframe = document.getElementById("app");
await bridge.connect(new PostMessageTransport(iframe.contentWindow, iframe.contentWindow));
iframe.src = "/app";
