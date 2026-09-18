import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { renderUpdateRecommendation } from "./recommendation.js";

const resourceUri = "ui://customization-update/recommendation.html";
const appPath = fileURLToPath(new URL("./recommendation.html", import.meta.url));

export function createServer(): McpServer {
	const server = new McpServer({
		name: "Customization Update",
		version: "1.0.0",
	});

	registerAppTool(
		server,
		"show_update_recommendation",
		{
			title: "Show customization update recommendation",
			description: "Render an agent customization update recommendation with an approval button that hands the complete delegation prompt back to the origin chat.",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: z.object({
				title: z.string().min(1),
				summary: z.string().min(1),
				sourceRepository: z.string().min(1),
				sourceFile: z.string().min(1),
				proposedChange: z.string().min(1),
				futureBehavior: z.string().min(1),
				originSessionTitle: z.string().min(1),
				originSessionLink: z.string().url(),
			}),
			_meta: {
				ui: {
					resourceUri,
				},
			},
		},
		async (recommendation) => {
			const rendered = renderUpdateRecommendation(recommendation);
			return {
				content: [{
					type: "text",
					text: JSON.stringify(rendered),
				}],
				structuredContent: rendered,
			};
		},
	);

	registerAppResource(
		server,
		resourceUri,
		resourceUri,
		{ mimeType: RESOURCE_MIME_TYPE },
		async () => ({
			contents: [{
				uri: resourceUri,
				mimeType: RESOURCE_MIME_TYPE,
				text: await readFile(appPath, "utf8"),
			}],
		}),
	);

	return server;
}

await createServer().connect(new StdioServerTransport());
