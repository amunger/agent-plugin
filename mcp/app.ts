import {
	App,
	applyDocumentTheme,
	applyHostStyleVariables,
	type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { readRecommendationResult, type RenderedUpdateRecommendation } from "./recommendation.js";

const app = new App({ name: "Customization Update Recommendation", version: "1.0.0" });
const card = getElement("card");
const cardTitle = getElement("card-title");
const subjectLabel = getElement("subject-label");
const customization = getElement("customization");
const source = getElement("source");
const proposedChange = getElement("proposed-change");
const delegateButton = getElement("delegate");
const status = getElement("status");
let recommendation: RenderedUpdateRecommendation | undefined;

function getElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}
	return element;
}

function applyHostContext(context: McpUiHostContext): void {
	if (context.theme) {
		applyDocumentTheme(context.theme);
	}
	if (context.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}
}

function render(value: RenderedUpdateRecommendation): void {
	recommendation = value;
	cardTitle.textContent = value.cardTitle;
	subjectLabel.textContent = value.subjectLabel;
	customization.textContent = value.sourceFile;
	source.textContent = value.sourceRepository;
	proposedChange.textContent = value.proposedChange;
	delegateButton.textContent = value.actionLabel;
	card.removeAttribute("open");
	card.hidden = false;
	delegateButton.removeAttribute("disabled");
	status.textContent = "";
}

app.ontoolresult = (result) => {
	try {
		render(readRecommendationResult(result));
	} catch (error: unknown) {
		console.error(error);
		recommendation = undefined;
		card.hidden = true;
		delegateButton.setAttribute("disabled", "true");
		status.textContent = error instanceof Error ? error.message : "The recommendation could not be loaded.";
	}
};

app.onhostcontextchanged = applyHostContext;
app.onerror = (error) => {
	console.error(error);
	status.textContent = "The recommendation card could not connect to the host.";
};

delegateButton.addEventListener("click", async () => {
	if (!recommendation) {
		status.textContent = "The recommendation is still loading.";
		return;
	}

	delegateButton.setAttribute("disabled", "true");
	status.textContent = "Requesting delegation...";
	try {
		const result = await app.sendMessage(
			{
				role: "user",
				content: [{ type: "text", text: recommendation.delegationRequest }],
			},
			{ signal: AbortSignal.timeout(10_000) },
		);
		if (result.isError) {
			throw new Error("The host rejected the delegation request. Check that the chat input is empty, then try again.");
		}
		status.textContent = "Request handed to chat. Press Send if needed; /btw asks a side chat to create the independent session.";
	} catch (error: unknown) {
		console.error(error);
		status.textContent = error instanceof Error ? error.message : "Delegation failed.";
		delegateButton.removeAttribute("disabled");
	}
});

async function connect(): Promise<void> {
	await app.connect();
	const context = app.getHostContext();
	if (context) {
		applyHostContext(context);
	}
}

void connect().catch((error: unknown) => {
	console.error(error);
	status.textContent = "The recommendation card could not connect to the host.";
});
