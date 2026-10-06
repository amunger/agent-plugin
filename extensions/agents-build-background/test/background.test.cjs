const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { readBuildMetadata } = require('../out/buildMetadata');
const { renderSvg } = require('../out/backgroundSvg');

const product = {
	commit: '2a59476c9bfcb90b3ddc372c36762471b7dfad1c',
	date: '2026-10-06T10:15:52+02:00',
};
const runtime = '1.0.92-4.unstable.r37397886721.gad270aa';
const sdk = '1.0.17.37397886721.gad270aa';

async function createBuild(t, files) {
	const appRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-background-test-'));
	t.after(() => fs.rm(appRoot, { recursive: true, force: true }));
	for (const [relativePath, value] of Object.entries(files)) {
		const filePath = path.join(appRoot, ...relativePath.split('/'));
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, JSON.stringify(value));
	}
	return appRoot;
}

test('uses the About dialog product versions instead of the stale extension runtime', async t => {
	const appRoot = await createBuild(t, {
		'product.json': { ...product, copilotVersions: { runtime, sdk: '1.0.17-unstable.37397886721.gad270aa.unsigned' } },
		'package.json': { dependencies: { '@github/copilot-sdk': '1.0.17-preview.5' } },
		'extensions/copilot/node_modules/@github/copilot/package.json': { version: '1.0.73' },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: runtime,
		copilotSdkVersion: sdk,
	});
});

test('complete product versions do not require dependency manifests', async t => {
	const appRoot = await createBuild(t, {
		'product.json': { ...product, copilotVersions: { runtime: '1.0.92-canary.10.gabc.unsigned', sdk } },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: '1.0.92.10.gabc',
		copilotSdkVersion: sdk,
	});
});

test('prefers root runtime metadata and installed SDK version over stale dependencies', async t => {
	const appRoot = await createBuild(t, {
		'product.json': product,
		'package.json': {
			copilotRuntimeVersion: runtime,
			dependencies: { '@github/copilot': '1.0.73', '@github/copilot-sdk': '^1.0.17' },
		},
		'node_modules/@github/copilot-sdk/package.json': { version: sdk, copilotCliVersion: '1.0.73' },
		'extensions/copilot/node_modules/@github/copilot/package.json': { version: '1.0.73' },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: runtime,
		copilotSdkVersion: sdk,
	});
});

for (const moduleDirectory of ['node_modules', 'node_modules.asar.unpacked']) {
	test(`uses the SDK-owned runtime in ${moduleDirectory}`, async t => {
		const appRoot = await createBuild(t, {
			'product.json': product,
			'package.json': { dependencies: {} },
			[`${moduleDirectory}/@github/copilot-sdk/package.json`]: { version: sdk, copilotCliVersion: runtime },
			'extensions/copilot/node_modules/@github/copilot/package.json': { version: '1.0.73' },
		});
		assert.deepEqual(await readBuildMetadata(appRoot), {
			...product,
			copilotVersion: runtime,
			copilotSdkVersion: sdk,
		});
	});
}

test('supports unpacked SDK platform manifests', async t => {
	const appRoot = await createBuild(t, {
		'product.json': product,
		'package.json': { copilotRuntimeVersion: runtime },
		[`node_modules.asar.unpacked/@github/copilot-sdk-${process.platform}-${process.arch}/package.json`]: { version: sdk },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: runtime,
		copilotSdkVersion: sdk,
	});
});

test('retains legacy extension-manifest and dependency-declaration fallbacks', async t => {
	const appRoot = await createBuild(t, {
		'product.json': product,
		'package.json': { dependencies: { '@github/copilot-sdk': '0.1.23' } },
		'extensions/copilot/node_modules/@github/copilot/package.json': { version: '1.0.73' },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: '1.0.73',
		copilotSdkVersion: '0.1.23',
	});
});

test('fills missing product versions without replacing the provided runtime', async t => {
	const appRoot = await createBuild(t, {
		'product.json': { ...product, copilotVersions: { runtime } },
		'package.json': { dependencies: { '@github/copilot': '1.0.73', '@github/copilot-sdk': sdk } },
	});
	assert.deepEqual(await readBuildMetadata(appRoot), {
		...product,
		copilotVersion: runtime,
		copilotSdkVersion: sdk,
	});
});

test('fails on invalid product versions rather than displaying stale package versions', async t => {
	const appRoot = await createBuild(t, {
		'product.json': { ...product, copilotVersions: { runtime: 42, sdk } },
		'package.json': { dependencies: { '@github/copilot': '1.0.73', '@github/copilot-sdk': sdk } },
	});
	await assert.rejects(readBuildMetadata(appRoot), /VS Code product metadata is invalid/);
});

test('fails on invalid installed SDK metadata rather than using the declaration', async t => {
	const appRoot = await createBuild(t, {
		'product.json': product,
		'package.json': { copilotRuntimeVersion: runtime, dependencies: { '@github/copilot-sdk': sdk } },
		'node_modules/@github/copilot-sdk/package.json': { version: '' },
	});
	await assert.rejects(readBuildMetadata(appRoot), /Copilot SDK package metadata is invalid/);
});

test('fails explicitly when runtime metadata is missing', async t => {
	const appRoot = await createBuild(t, {
		'product.json': product,
		'package.json': { dependencies: { '@github/copilot-sdk': sdk } },
	});
	await assert.rejects(readBuildMetadata(appRoot), /Copilot runtime version metadata is missing/);
});

function svgMetadata(copilotVersion, copilotSdkVersion) {
	return {
		version: '1.141.0-insider',
		commit: product.commit,
		buildDate: 'Oct 6, 2026, 1:15 AM',
		copilotVersion,
		copilotSdkVersion,
		updateMode: 'default',
		machineLabel: 'copilot+ laptop',
	};
}

test('renders exact full canary versions on bounded lines without clipping', () => {
	const metadata = svgMetadata(runtime, sdk);
	const svg = renderSvg(metadata, product.date);
	const lines = [...svg.matchAll(/<text x="29" y="(?<y>\d+)">(?<text>[^<]*)<\/text>/g)]
		.filter(match => Number(match.groups.y) >= 188);
	assert.deepEqual(lines.map(match => match.groups.text), [
		runtime.slice(0, 22),
		runtime.slice(22),
		sdk.slice(0, 22),
		sdk.slice(22),
	]);
	assert.match(svg, /height="307" viewBox="0 0 220 307"/);
	assert.match(svg, /x="203" y="296"/);
	assert.equal(renderSvg(metadata, product.date), svg);
});

test('preserves the original layout for short versions', () => {
	const svg = renderSvg(svgMetadata('1.0.73', '0.1.23'), product.date);
	assert.match(svg, /height="253" viewBox="0 0 220 253"/);
	assert.match(svg, /x="17" y="188">&gt; copilot: 1\.0\.73/);
	assert.match(svg, /x="29" y="227">0\.1\.23/);
});

test('escapes image metadata and accessible descriptions', () => {
	const svg = renderSvg({
		...svgMetadata('1.0.73', '0.1.23'),
		machineLabel: '<test & "machine">',
	}, product.date);
	assert.match(svg, /machine="&lt;test &amp; &quot;machine&quot;&gt;"/);
	assert.match(svg, /<title id="background-title">&lt;test &amp; &quot;machine&quot;&gt; build information<\/title>/);
	assert.match(svg, /role="img" aria-labelledby="background-title background-description"/);
});
