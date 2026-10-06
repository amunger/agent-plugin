import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as vscode from 'vscode';
import { readBuildMetadata } from './buildMetadata';
import { formatDate, renderSvg, type BackgroundMetadata } from './backgroundSvg';

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
	const build = await readBuildMetadata(vscode.env.appRoot);

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
		commit: build.commit,
		buildDate: formatDate(build.date),
		copilotVersion: build.copilotVersion,
		copilotSdkVersion: build.copilotSdkVersion,
		updateMode: vscode.workspace.getConfiguration('update').get<string>('mode', 'default'),
		machineLabel,
	};
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
