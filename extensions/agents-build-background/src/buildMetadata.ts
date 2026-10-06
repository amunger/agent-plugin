import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface CopilotVersions {
	readonly runtime?: string;
	readonly sdk?: string;
}

interface ProductMetadata {
	readonly commit: string;
	readonly date: string;
	readonly copilotVersions?: CopilotVersions;
}

interface PackageMetadata {
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly copilotRuntimeVersion?: string;
}

interface VersionMetadata {
	readonly version: string;
	readonly copilotCliVersion?: string;
}

interface BuildMetadata {
	readonly commit: string;
	readonly date: string;
	readonly copilotVersion: string;
	readonly copilotSdkVersion: string;
}

export async function readBuildMetadata(appRoot: string): Promise<BuildMetadata> {
	const product = await readJsonFile(
		path.join(appRoot, 'product.json'),
		isProductMetadata,
		'VS Code product metadata',
	);
	let copilotVersion = product.copilotVersions?.runtime;
	let copilotSdkVersion = product.copilotVersions?.sdk;

	if (!copilotVersion || !copilotSdkVersion) {
		const packageMetadata = await readJsonFile(
			path.join(appRoot, 'package.json'),
			isPackageMetadata,
			'VS Code package metadata',
		);
		const sdkMetadata = await readOptionalPackageManifest('Copilot SDK', [
			path.join(appRoot, 'node_modules', '@github', 'copilot-sdk', 'package.json'),
			path.join(appRoot, 'node_modules.asar.unpacked', '@github', 'copilot-sdk', 'package.json'),
			path.join(appRoot, 'node_modules.asar.unpacked', '@github', `copilot-sdk-${process.platform}-${process.arch}`, 'package.json'),
			path.join(appRoot, 'node_modules', '@github', `copilot-sdk-${process.platform}-${process.arch}`, 'package.json'),
		]);

		copilotSdkVersion ??= sdkMetadata?.version ?? packageMetadata.dependencies?.['@github/copilot-sdk'];
		copilotVersion ??= packageMetadata.copilotRuntimeVersion ?? sdkMetadata?.copilotCliVersion;
		if (!copilotVersion) {
			const copilotMetadata = await readOptionalPackageManifest('Copilot', [
				path.join(appRoot, 'extensions', 'copilot', 'node_modules', '@github', 'copilot', 'package.json'),
				path.join(appRoot, 'node_modules', '@github', 'copilot', 'package.json'),
				path.join(appRoot, 'node_modules.asar.unpacked', '@github', 'copilot', 'package.json'),
			]);
			copilotVersion = copilotMetadata?.version ?? packageMetadata.dependencies?.['@github/copilot'];
		}
	}

	if (!copilotVersion || !copilotSdkVersion) {
		throw new Error(`Copilot ${!copilotVersion ? 'runtime' : 'SDK'} version metadata is missing under ${appRoot}.`);
	}

	return {
		commit: product.commit,
		date: product.date,
		copilotVersion: formatCopilotVersion(copilotVersion),
		copilotSdkVersion: formatCopilotVersion(copilotSdkVersion),
	};
}

async function readOptionalPackageManifest(
	label: string,
	manifestPaths: readonly string[],
): Promise<VersionMetadata | undefined> {
	for (const manifestPath of manifestPaths) {
		try {
			return await readJsonFile(manifestPath, isVersionMetadata, `${label} package metadata`);
		} catch (error: unknown) {
			if (!isMissingFileError(error)) {
				throw error;
			}
		}
	}
	return undefined;
}

async function readJsonFile<T>(
	filePath: string,
	guard: (value: unknown) => value is T,
	label: string,
): Promise<T> {
	const text = await fs.readFile(filePath, 'utf8');
	const value: unknown = JSON.parse(text);
	if (!guard(value)) {
		throw new Error(`${label} is invalid: ${filePath}`);
	}
	return value;
}

function isProductMetadata(value: unknown): value is ProductMetadata {
	if (!isRecord(value)) {
		return false;
	}
	return typeof value.commit === 'string'
		&& value.commit.length >= 10
		&& typeof value.date === 'string'
		&& !Number.isNaN(Date.parse(value.date))
		&& (value.copilotVersions === undefined || (
			isRecord(value.copilotVersions)
			&& isOptionalVersion(value.copilotVersions.runtime)
			&& isOptionalVersion(value.copilotVersions.sdk)
		));
}

function isPackageMetadata(value: unknown): value is PackageMetadata {
	return isRecord(value)
		&& isOptionalVersion(value.copilotRuntimeVersion)
		&& (value.dependencies === undefined || (
			isRecord(value.dependencies)
			&& Object.values(value.dependencies).every(dependency => typeof dependency === 'string')
		));
}

function isVersionMetadata(value: unknown): value is VersionMetadata {
	return isRecord(value)
		&& typeof value.version === 'string'
		&& value.version.length > 0
		&& isOptionalVersion(value.copilotCliVersion);
}

function isOptionalVersion(value: unknown): value is string | undefined {
	return value === undefined || (typeof value === 'string' && value.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error
		&& 'code' in error
		&& (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function formatCopilotVersion(version: string): string {
	// Match VS Code's About dialog without changing the installed packages.
	return version.replace(/-(?:canary|unstable)(?=\.|$)/, '').replace(/\.unsigned$/, '');
}
