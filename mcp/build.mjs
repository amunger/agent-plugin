import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const outputDirectory = new URL("./dist/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const appBuild = await build({
	entryPoints: [fileURLToPath(new URL("./app.ts", import.meta.url))],
	bundle: true,
	format: "iife",
	minify: true,
	platform: "browser",
	target: "es2022",
	write: false,
});
const appScript = appBuild.outputFiles[0]?.text;
if (!appScript) {
	throw new Error("The MCP App bundle did not produce JavaScript.");
}

const template = await readFile(new URL("./recommendation.html", import.meta.url), "utf8");
if (!template.includes("/* APP_SCRIPT */")) {
	throw new Error("The MCP App HTML template is missing its script placeholder.");
}
await writeFile(
	new URL("./dist/recommendation.html", import.meta.url),
	template.replace(
		"/* APP_SCRIPT */",
		() => appScript.replaceAll("</script", "<\\/script"),
	),
);

await build({
	entryPoints: [fileURLToPath(new URL("./server.ts", import.meta.url))],
	bundle: true,
	format: "esm",
	minify: true,
	outfile: fileURLToPath(new URL("./dist/server.mjs", import.meta.url)),
	platform: "node",
	target: "node20",
});

await build({
	entryPoints: [fileURLToPath(new URL("./recommendation.ts", import.meta.url))],
	bundle: true,
	format: "esm",
	minify: true,
	outfile: fileURLToPath(new URL("./dist/recommendation.js", import.meta.url)),
	platform: "node",
	target: "node20",
});
