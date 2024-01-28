import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
import * as pep723Installer from '../extension';

suite('Extension Test Suite', () => {
	// vscode.window.showInformationMessage('Start all tests.');

	test('Checks example script', () => {
		fetch('./example.py')
			.then(response => response.text())
			.then(script => {
				const metadata = pep723Installer.readMetadata(script);
				assert.notStrictEqual(metadata, undefined, "Expected the script metadata to be read from the example script.");
			});
	});
});
