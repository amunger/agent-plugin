import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as vscode from 'vscode';

interface ProductMetadata {
	readonly commit: string;
	readonly date: string;
}

interface PackageMetadata {
	readonly dependencies: Readonly<Record<string, string>>;
}

interface VersionMetadata {
	readonly version: string;
}

interface BackgroundMetadata {
	readonly version: string;
	readonly commit: string;
	readonly buildDate: string;
	readonly copilotVersion: string;
	readonly copilotSdkVersion: string;
	readonly updateMode: string;
	readonly machineLabel: string;
}

const fingerprintKey = 'lastFingerprint';
const machineLabelKey = 'machineLabel';
const activityLogName = 'activity.jsonl';
const generatedFilePattern = /^agents-build-background-\d{8}-\d{9}\.svg$/;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const output = vscode.window.createOutputChannel('Agents Build Background');
	const activityLogUri = vscode.Uri.joinPath(context.globalStorageUri, activityLogName);
	await fs.mkdir(context.globalStorageUri.fsPath, { recursive: true });
	await logActivity(activityLogUri, output, 'activated', {
		extensionVersion: context.extension.packageJSON.version,
		vscodeVersion: vscode.version,
		appRoot: vscode.env.appRoot,
	});
	let refreshQueue = Promise.resolve();

	const enqueueRefresh = (force: boolean, reason: string): void => {
		refreshQueue = refreshQueue
			.then(() => refreshBackground(context, output, activityLogUri, force, reason))
			.catch(async (error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				output.appendLine(`[error] ${message}`);
				await logActivity(activityLogUri, output, 'failed', { reason, message });
				output.show(true);
				void vscode.window.showErrorMessage(`Agents background update failed: ${message}`);
			});
	};

	context.subscriptions.push(
		output,
		vscode.commands.registerCommand('agentsBuildBackground.refresh', () => {
			enqueueRefresh(true, 'command');
		}),
		vscode.commands.registerCommand('agentsBuildBackground.showActivityLog', async () => {
			const document = await vscode.workspace.openTextDocument(activityLogUri);
			await vscode.window.showTextDocument(document);
		}),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (
				event.affectsConfiguration('update.mode')
				|| event.affectsConfiguration('agentsBuildBackground.machineLabel')
			) {
				enqueueRefresh(false, 'configuration');
			}
		}),
	);

	enqueueRefresh(false, 'startup');
}

async function refreshBackground(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel,
	activityLogUri: vscode.Uri,
	force: boolean,
	reason: string,
): Promise<void> {
	const metadata = await readBackgroundMetadata(context);
	const fingerprint = JSON.stringify(metadata);
	const previousFingerprint = context.globalState.get<string>(fingerprintKey);
	const configuredImage = getConfiguredImageUri();
	const configuredImageExists = configuredImage ? await fileExists(configuredImage.fsPath) : false;
	await logActivity(activityLogUri, output, 'checked', {
		reason,
		force,
		metadata,
		previousFingerprint,
		configuredImage: configuredImage?.toString(),
		configuredImageExists,
	});

	if (
		!force
		&& configuredImageExists
		&& previousFingerprint === fingerprint
	) {
		output.appendLine(`[unchanged] ${metadata.version} ${metadata.commit.slice(0, 10)}`);
		await logActivity(activityLogUri, output, 'unchanged', {
			reason,
			version: metadata.version,
			commit: metadata.commit,
		});
		return;
	}

	const imagesDirectory = vscode.Uri.joinPath(context.globalStorageUri, 'images');
	await fs.mkdir(imagesDirectory.fsPath, { recursive: true });

	const imageUri = vscode.Uri.joinPath(imagesDirectory, createImageName());
	await fs.writeFile(imageUri.fsPath, renderSvg(metadata), { encoding: 'utf8', flag: 'wx' });

	try {
		const agentsConfiguration = vscode.workspace.getConfiguration('chat.agentSessions');
		const imageFileUri = pathToFileURL(imageUri.fsPath).toString();
		await agentsConfiguration.update(
			'preferredDarkBackgroundImage',
			imageFileUri,
			vscode.ConfigurationTarget.Global,
		);
		await agentsConfiguration.update(
			'backgroundImageLayout',
			'bottom-left',
			vscode.ConfigurationTarget.Global,
		);
		await context.globalState.update(fingerprintKey, fingerprint);
		await context.globalState.update(machineLabelKey, metadata.machineLabel);
		await deleteOlderImages(imagesDirectory.fsPath, imageUri.fsPath);
	} catch (error: unknown) {
		await fs.rm(imageUri.fsPath, { force: true });
		throw error;
	}

	output.appendLine(`[updated] ${imageUri.fsPath}`);
	await logActivity(activityLogUri, output, 'updated', {
		reason,
		image: pathToFileURL(imageUri.fsPath).toString(),
		version: metadata.version,
		commit: metadata.commit,
	});
	if (force) {
		await vscode.window.showInformationMessage(
			`Agents background updated for VS Code ${metadata.version}.`,
		);
	}
}

async function logActivity(
	activityLogUri: vscode.Uri,
	output: vscode.OutputChannel,
	event: string,
	details: Readonly<Record<string, unknown>>,
): Promise<void> {
	const entry = JSON.stringify({
		timestamp: new Date().toISOString(),
		event,
		...details,
	});
	try {
		await fs.appendFile(activityLogUri.fsPath, `${entry}\n`, 'utf8');
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		output.appendLine(`[logging error] ${message}`);
		throw new Error(`Unable to append activity log ${activityLogUri.fsPath}: ${message}`);
	}
}

async function readBackgroundMetadata(context: vscode.ExtensionContext): Promise<BackgroundMetadata> {
	const product = await readJsonFile(
		path.join(vscode.env.appRoot, 'product.json'),
		isProductMetadata,
		'VS Code product metadata',
	);
	const packageMetadata = await readJsonFile(
		path.join(vscode.env.appRoot, 'package.json'),
		isPackageMetadata,
		'VS Code package metadata',
	);
	const copilotVersion = packageMetadata.dependencies['@github/copilot']
		?? (await readJsonFile(
			path.join(
				vscode.env.appRoot,
				'extensions',
				'copilot',
				'node_modules',
				'@github',
				'copilot',
				'package.json',
			),
			isVersionMetadata,
			'Bundled Copilot package metadata',
		)).version;
	const copilotSdkVersion = packageMetadata.dependencies['@github/copilot-sdk'];

	if (!copilotSdkVersion) {
		throw new Error(`Copilot SDK dependency metadata is missing from ${path.join(vscode.env.appRoot, 'package.json')}`);
	}

	const configuredMachineLabel = vscode.workspace
		.getConfiguration('agentsBuildBackground')
		.get<string>('machineLabel', '')
		.trim();
	const persistedMachineLabel = context.globalState.get<string>(machineLabelKey)?.trim();
	const previousMachineLabel = await readCurrentImageMachineLabel();
	const machineLabel = configuredMachineLabel
		|| persistedMachineLabel
		|| previousMachineLabel
		|| os.hostname().toLowerCase();

	if (!isPlainMachineLabel(machineLabel)) {
		throw new Error('The configured machine label is empty or contains control characters.');
	}

	return {
		version: vscode.version,
		commit: product.commit,
		buildDate: formatDate(product.date),
		copilotVersion,
		copilotSdkVersion,
		updateMode: vscode.workspace.getConfiguration('update').get<string>('mode', 'default'),
		machineLabel,
	};
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
		&& !Number.isNaN(Date.parse(value.date));
}

function isPackageMetadata(value: unknown): value is PackageMetadata {
	if (!isRecord(value) || !isRecord(value.dependencies)) {
		return false;
	}
	return Object.values(value.dependencies).every((dependency) => typeof dependency === 'string');
}

function isVersionMetadata(value: unknown): value is VersionMetadata {
	return isRecord(value)
		&& typeof value.version === 'string'
		&& value.version.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getConfiguredImageUri(): vscode.Uri | undefined {
	const configuredValue = vscode.workspace
		.getConfiguration('chat.agentSessions')
		.get<string>('preferredDarkBackgroundImage');
	if (!configuredValue) {
		return undefined;
	}

	try {
		const uri = vscode.Uri.parse(configuredValue, true);
		return uri.scheme === 'file' ? uri : undefined;
	} catch {
		return undefined;
	}
}

async function readCurrentImageMachineLabel(): Promise<string | undefined> {
	const uri = getConfiguredImageUri();
	if (!uri) {
		return undefined;
	}

	try {
		const svg = await fs.readFile(uri.fsPath, 'utf8');
		const match = /<agents-background\s+machine="([^"]*)"\s*\/>/.exec(svg);
		const label = match?.[1] ? decodeXml(match[1]).trim() : undefined;
		return label && isPlainMachineLabel(label) ? label : undefined;
	} catch (error: unknown) {
		if (isMissingFileError(error)) {
			return undefined;
		}
		throw error;
	}
}

function decodeXml(value: string): string {
	return value.replace(/&(amp|quot|apos|lt|gt);/g, (entity, name: string) => {
		const entities: Readonly<Record<string, string>> = {
			amp: '&',
			quot: '"',
			apos: "'",
			lt: '<',
			gt: '>',
		};
		return entities[name] ?? entity;
	});
}

function isPlainMachineLabel(value: string): boolean {
	return value.length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch (error: unknown) {
		if (isMissingFileError(error)) {
			return false;
		}
		throw error;
	}
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error
		&& 'code' in error
		&& (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function createImageName(): string {
	const iso = new Date().toISOString();
	const timestamp = `${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}${iso.slice(20, 23)}`;
	return `agents-build-background-${timestamp}.svg`;
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(value));
}

function renderSvg(metadata: BackgroundMetadata): string {
	const machineLabel = escapeXml(metadata.machineLabel);
	const updateMode = escapeXml(metadata.updateMode.toUpperCase());
	const modeColor = metadata.updateMode === 'default' ? '#71ff8d' : '#ffbf4a';
	const updatedAt = escapeXml(formatDate(new Date().toISOString()));

	return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="253" viewBox="0 0 220 253">
  <metadata><agents-background machine="${machineLabel}" /></metadata>
  <defs>
    <radialGradient id="screen" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#08230f"/><stop offset="0.72" stop-color="#031308"/><stop offset="1" stop-color="#010704"/></radialGradient>
    <linearGradient id="scanlines" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient>
    <pattern id="scanlinePattern" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="url(#scanlines)"/></pattern>
    <filter id="phosphorGlow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="1" y="1" width="218" height="251" rx="9" fill="#020503" stroke="#174d25" stroke-width="2"/><rect x="6" y="6" width="208" height="241" rx="5" fill="url(#screen)"/>
  <g fill="#71ff8d" font-family="Cascadia Mono, Consolas, monospace" filter="url(#phosphorGlow)">
    <text x="16" y="48" font-size="18" font-weight="700" letter-spacing="1.5">${escapeXml(metadata.machineLabel.toUpperCase())}</text>
    <line x1="17" y1="56" x2="203" y2="56" stroke="#71ff8d" stroke-width="1" opacity="0.65"/>
    <g font-size="12.5"><text x="17" y="79">&gt; <tspan fill="${modeColor}">${updateMode}</tspan> update mode</text><text x="17" y="101">&gt; VS CODE</text><text x="29" y="119">${escapeXml(metadata.version)}</text><text x="17" y="140">&gt; ${escapeXml(metadata.commit.slice(0, 10))}</text><text x="17" y="161" font-size="11.5">&gt; ${escapeXml(metadata.buildDate)}</text><text x="17" y="188">&gt; copilot: ${escapeXml(metadata.copilotVersion)}</text><text x="17" y="209">&gt; copilot-sdk:</text><text x="29" y="227">${escapeXml(metadata.copilotSdkVersion)}</text></g>
    <text x="203" y="242" text-anchor="end" font-size="9" opacity="0.65">updated ${updatedAt}</text>
  </g><rect x="6" y="6" width="208" height="241" rx="5" fill="url(#scanlinePattern)" pointer-events="none"/>
</svg>
`;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

async function deleteOlderImages(directory: string, activeImagePath: string): Promise<void> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	await Promise.all(entries.map(async (entry) => {
		if (!entry.isFile() || !generatedFilePattern.test(entry.name)) {
			return;
		}
		const candidate = path.join(directory, entry.name);
		if (candidate !== activeImagePath) {
			await fs.rm(candidate, { force: true });
		}
	}));
}
