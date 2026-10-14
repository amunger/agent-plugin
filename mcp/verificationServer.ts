/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { readFile } from "node:fs/promises";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { verificationPlanText } from "./verification.js";

const server = new McpServer({ name: "Verification plan", version: "1.0.0" });
const resourceUri = "ui://verification/plan.html";

registerAppTool(server, "show_verification_plan", {
	title: "Show verification plan",
	description: "Show a high-level verification plan with a final button that sends 'go ahead and verify' to this same chat. Rendering does not execute verification.",
	annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
	inputSchema: z.object({
		title: z.string().trim().min(1),
		summary: z.string().trim().min(1),
		checks: z.array(z.string().trim().min(1)).min(1).max(10),
		limitations: z.string().trim().min(1),
	}),
	_meta: { ui: { resourceUri } },
}, async plan => ({
	content: [{ type: "text", text: verificationPlanText(plan) }],
	structuredContent: { ...plan },
}));

registerAppResource(server, resourceUri, resourceUri, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
	contents: [{
		uri: resourceUri,
		mimeType: RESOURCE_MIME_TYPE,
		text: await readFile(new URL("./verification.html", import.meta.url), "utf8"),
	}],
}));

await server.connect(new StdioServerTransport());
