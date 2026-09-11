const childProcess = require('child_process');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

function runUpdate(outputChannel) {
	const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles;
	if (!programFiles) {
		throw new Error('The Windows Program Files directory could not be resolved.');
	}

	const executable = path.join(programFiles, 'PowerShell', '7', 'pwsh.exe');
	const script = path.join(os.homedir(), '.copilot', 'agents-build-background', 'Update-AgentsBackground.ps1');

	outputChannel.clear();
	outputChannel.appendLine(`Running ${script}`);

	return new Promise((resolve, reject) => {
		childProcess.execFile(
			executable,
			['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script],
			{ windowsHide: true },
			(error, stdout, stderr) => {
				if (stdout) {
					outputChannel.append(stdout);
				}
				if (stderr) {
					outputChannel.append(stderr);
				}
				if (error) {
					reject(error);
					return;
				}
				resolve();
			}
		);
	});
}

function activate(context) {
	const outputChannel = vscode.window.createOutputChannel('Agents Build Background');
	context.subscriptions.push(outputChannel);

	let updatePromise;
	const update = trigger => {
		if (!updatePromise) {
			updatePromise = runUpdate(outputChannel).finally(() => {
				updatePromise = undefined;
			});
		}

		return vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Updating Agents Build Background'
			},
			() => updatePromise
		).then(() => {
			vscode.window.showInformationMessage(`Agents build background update ran ${trigger}.`);
		}, error => {
			outputChannel.show(true);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Unable to update the Agents build background: ${message}`);
		});
	};

	const command = vscode.commands.registerCommand('agentsBuildBackground.update', async () => {
		await update('manually');
	});
	context.subscriptions.push(command);

	void update('automatically after startup');
}

module.exports = { activate };
