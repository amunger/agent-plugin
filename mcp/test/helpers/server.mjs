import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

export const recommendation = {
	title: "Report failed validation commands",
	summary: "Keep failed validation attempts visible in the completion summary.",
	sourceRepository: "https://github.com/amunger/agent-plugin",
	sourceFile: "instructions/validation-reporting.instructions.md",
	proposedChange: "Include each failing validation command, with secrets redacted.",
	futureBehavior: "A later successful retry does not conceal a failed attempt.",
	originSessionTitle: "Manual recommendation test",
	originSessionLink: "agent-host-session://copilotcli/manual-recommendation-test",
};

export const publishRecommendation = {
	title: "Plugin changes are local and validated",
	summary: "The customization update is complete but has not been pushed.",
	sourceRepository: "https://github.com/amunger/agent-plugin",
	sourceFile: "plugin.json",
	proposedChange: "Review, commit, rebase, and push the existing local changes.",
	futureBehavior: "The source branch is clean and synchronized with remote main.",
	originSessionTitle: "Local plugin maintenance",
	originSessionLink: "agent-host-session://copilotcli/local-plugin-maintenance",
};

export async function connectTestServer() {
	const client = new Client({ name: "recommendation-test", version: "1.0.0" });
	const transport = new StdioClientTransport({
		command: process.execPath,
		args: ["mcp/dist/server.mjs"],
		cwd: fileURLToPath(new URL("../../../", import.meta.url)),
		stderr: "pipe",
	});
	try {
		await client.connect(transport);
		return client;
	} catch (error) {
		await transport.close();
		throw error;
	}
}
