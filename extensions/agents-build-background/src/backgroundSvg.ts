export interface BackgroundMetadata {
	readonly version: string;
	readonly commit: string;
	readonly buildDate: string;
	readonly copilotVersion: string;
	readonly copilotSdkVersion: string;
	readonly updateMode: string;
	readonly machineLabel: string;
}

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(value));
}

export function renderSvg(metadata: BackgroundMetadata, updatedAt = new Date().toISOString()): string {
	const machineLabel = escapeXml(metadata.machineLabel);
	const updateMode = escapeXml(metadata.updateMode.toUpperCase());
	const modeColor = metadata.updateMode === 'default' ? '#71ff8d' : '#ffbf4a';
	const versionLines: string[] = [];
	let lineY = 188;

	const appendVersion = (label: string, version: string, inline: boolean): void => {
		const text = `> ${label}: ${version}`;
		if (inline && text.length <= 24) {
			versionLines.push(`<text x="17" y="${lineY}">${escapeXml(text)}</text>`);
		} else {
			versionLines.push(`<text x="17" y="${lineY}">&gt; ${label}:</text>`);
			for (let offset = 0; offset < version.length; offset += 22) {
				lineY += 18;
				versionLines.push(`<text x="29" y="${lineY}">${escapeXml(version.slice(offset, offset + 22))}</text>`);
			}
		}
	};

	appendVersion('copilot', metadata.copilotVersion, true);
	lineY += 21;
	appendVersion('copilot-sdk', metadata.copilotSdkVersion, false);
	const footerY = lineY + 15;
	const height = footerY + 11;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${height}" viewBox="0 0 220 ${height}" role="img" aria-labelledby="background-title background-description">
  <title id="background-title">${machineLabel} build information</title>
  <desc id="background-description">VS Code ${escapeXml(metadata.version)}, commit ${escapeXml(metadata.commit)}, Copilot ${escapeXml(metadata.copilotVersion)}, Copilot SDK ${escapeXml(metadata.copilotSdkVersion)}.</desc>
  <metadata><agents-background machine="${machineLabel}" /></metadata>
  <defs>
    <radialGradient id="screen" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#08230f"/><stop offset="0.72" stop-color="#031308"/><stop offset="1" stop-color="#010704"/></radialGradient>
    <linearGradient id="scanlines" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient>
    <pattern id="scanlinePattern" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="url(#scanlines)"/></pattern>
    <filter id="phosphorGlow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="1" y="1" width="218" height="${height - 2}" rx="9" fill="#020503" stroke="#174d25" stroke-width="2"/><rect x="6" y="6" width="208" height="${height - 12}" rx="5" fill="url(#screen)"/>
  <g fill="#71ff8d" font-family="Cascadia Mono, Consolas, monospace" filter="url(#phosphorGlow)">
    <text x="16" y="48" font-size="18" font-weight="700" letter-spacing="1.5">${escapeXml(metadata.machineLabel.toUpperCase())}</text>
    <line x1="17" y1="56" x2="203" y2="56" stroke="#71ff8d" stroke-width="1" opacity="0.65"/>
    <g font-size="12.5"><text x="17" y="79">&gt; <tspan fill="${modeColor}">${updateMode}</tspan> update mode</text><text x="17" y="101">&gt; VS CODE</text><text x="29" y="119">${escapeXml(metadata.version)}</text><text x="17" y="140">&gt; ${escapeXml(metadata.commit.slice(0, 10))}</text><text x="17" y="161" font-size="11.5">&gt; ${escapeXml(metadata.buildDate)}</text>${versionLines.join('')}</g>
    <text x="203" y="${footerY}" text-anchor="end" font-size="9" opacity="0.65">updated ${escapeXml(formatDate(updatedAt))}</text>
  </g><rect x="6" y="6" width="208" height="${height - 12}" rx="5" fill="url(#scanlinePattern)" pointer-events="none"/>
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
