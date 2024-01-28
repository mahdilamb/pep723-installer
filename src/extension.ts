// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const exec = require('child_process').execSync;
const COMMAND_ID = 'pep723-installer.install';
type RegexGroups = { type: string, content: string };
type RegexMatch = (RegExpExecArray & { groups: RegexGroups });
type Metadata = {
	'requires-python'?: string
	'dependencies'?: string[]
};

export const pythonInterpreterAndVersion = async (): Promise<[string, string]> => {
	/**
	 * Get the python interpreter and it's version.
	 */
	const pythonExecutable = (await vscode.extensions.getExtension('ms-python.python')?.exports.environment.getActiveEnvironmentPath()).path || 'python3';


	return [pythonExecutable, exec(`${pythonExecutable} --version`,
		{ encoding: 'utf-8' }).match(/Python (.*)/)[1]];
};

export const readMetadata = (script: string) => {
	/**
	 * Read the metadata according to PEP723.
	 */
	// https://peps.python.org/pep-0723/
	const name = 'script';
	const regex = /^# \/\/\/ (?<type>[a-zA-Z0-9-]+)$\s(?<content>(^#(| .*)$\s)+)^# \/\/\/$/gm;
	let match: RegexGroups | undefined = undefined;
	let m: RegexMatch;
	while ((m = regex.exec(script) as RegexMatch) !== null) {
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		if (m.groups.type === name) {
			if (match !== undefined) {
				throw Error(`Multiple ${name} blocks found`);
			}
			match = m.groups;
		}
	}
	if (match === undefined) {
		return;
	}
	var toml = require('toml');

	return toml.parse(match?.content.split('\n')?.map(line => line.slice(line.startsWith("#") ? 2 : 1)).join('\n')) as Metadata;
};
const install = async (metadata: Metadata) => {
	/**
	 * Install the script based on the requirements.
	 */
	let pythonVersionSpec;
	if (pythonVersionSpec = metadata['requires-python']) {
		const semver = require('semver');
		const [executable, version] = await pythonInterpreterAndVersion();
		if (!semver.satisfies(version, pythonVersionSpec)) {
			vscode.window.showErrorMessage(`The current script requires python ${pythonVersionSpec}`);
			return;
		}
		let dependencies;
		if (dependencies = metadata.dependencies) {
			(vscode.window.activeTerminal || vscode.window.createTerminal()).sendText(`${executable} -m pip install ${dependencies.map(dep => `"${dep}"`).join(' ')}`);

		}
	}
};
export function activate({ subscriptions }: vscode.ExtensionContext) {

	let metadata: Metadata | undefined = undefined;

	subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async () => {
		metadata && await install(metadata);
	}));
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = COMMAND_ID;
	statusBarItem.text = "Install [PEP723]";
	const updateStatusBarItem = () => {
		const editor = vscode.window.activeTextEditor;
		if (editor?.document.languageId !== "python") {
			statusBarItem.hide();
			return;
		}
		metadata = readMetadata(editor.document.getText());
		if (metadata === undefined) {
			statusBarItem.hide();
			return;
		}
		statusBarItem.show();
	};
	subscriptions.push(statusBarItem);

	subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	subscriptions.push(vscode.workspace.onDidChangeTextDocument(updateStatusBarItem));
	updateStatusBarItem();

}

// This method is called when your extension is deactivated
export function deactivate() { }
