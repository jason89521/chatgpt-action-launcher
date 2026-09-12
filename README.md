# ChatGPT Action Launcher

ChatGPT Action Launcher is a small Chromium browser extension for launching reusable prompt templates in a new ChatGPT conversation.

From the popup, choose an action while viewing any page. The extension captures the active tab's URL, title, and optional selected text, renders those values into the action's prompt template, and opens ChatGPT with the result.

This project is independent and is not affiliated with or endorsed by OpenAI.

## What the MVP does

- Lists saved actions in a popup.
- Creates, edits, deletes, and reorders actions.
- Stores actions locally in browser extension storage.
- Supports `{{url}}` (active tab URL), `{{title}}` (active tab title), and `{{selection}}` (selected text).
- Opens a new ChatGPT conversation for every action launch.
- Fills the rendered prompt into ChatGPT's composer.
- Optionally submits the prompt automatically when an action has **Auto-submit** enabled.

The extension does not parse GitHub or any other website. GitHub is only an example use case; the action's prompt determines how captured context is interpreted.

The MVP does not include an OpenAI API integration, API-key storage, a backend, user accounts, cloud sync, telemetry, analytics, a prompt marketplace, workflow chaining, or Firefox/Safari release support.

## Prompt templates

Create an action with a name and a prompt template. When the action is launched, supported variables are replaced deterministically with values from the active tab. Missing values become an empty string. Unknown variables produce an error instead of silently changing the prompt.

Example:

```text
Review this page:
{{url}}

The page title is: {{title}}

Consider this selected passage:
{{selection}}
```

The rendered prompt is shown in the popup before the launch completes. The extension only sends that rendered prompt to ChatGPT after the user invokes an action. It does not collect or send page content beyond the URL, title, and selected text used by the template.

## Permissions

The extension requests these Manifest V3 permissions:

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Temporarily access the active tab when the user invokes an action, so the extension can read its URL and title. |
| `scripting` | Run a small function in the active tab to read the text currently selected by the user. |
| `storage` | Save and load action names, templates, ordering, and Auto-submit settings locally. |

It also declares host permissions for `https://chatgpt.com/*` and `https://chat.openai.com/*`. These allow the dedicated ChatGPT content script to receive a launch message and interact with the ChatGPT composer. No other site has permanent host access.

Some pages, such as browser settings, extension stores, and other restricted browser pages, do not allow script injection. An action launched there may fail visibly because the active page context cannot be accessed.

## How ChatGPT automation works

Launching an action sends a request to the extension background service. The service opens a new `chatgpt.com` tab and retries communication with the ChatGPT content script for a bounded period while the page loads. The content script finds the composer using a small set of known selectors, inserts the rendered prompt, and clicks the send button only when Auto-submit is enabled.

ChatGPT's web interface can change independently of this project. If its DOM, composer, or send-button behavior changes, automation may stop working or may require an update. The extension reports readiness and launch failures in the popup or on the ChatGPT page; it must not be treated as proof that a prompt was submitted when the composer cannot be used.

See [the manual smoke test](docs/chatgpt-smoke-test.md) for a release-oriented checklist.

## Local development

### Prerequisites

- Node.js 20 or a later supported LTS version.
- A Chromium-based browser such as Chrome, Edge, Brave, or Chromium.

### Install and run development mode

```sh
npm install
npm run dev
```

WXT writes the development extension to `.output/chrome-mv3-dev`. In the Chromium browser, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that directory. Keep the development process running while working so WXT can rebuild changes.

### Validate a production build

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The production build is written under `.output/`. To test it manually, load the generated Chromium MV3 directory as an unpacked extension from `chrome://extensions`.

### Project structure

- `src/actions/` — action data model, validation, normalization, ordering, and local storage.
- `src/templates/` — prompt-template interpolation.
- `src/browserContext/` — active-tab URL, title, and selection capture.
- `src/popup/` — popup and action-management UI.
- `src/chatgpt/` — ChatGPT launch protocol and DOM adapter.
- `entrypoints/background.ts` — background service handling launch requests.
- `entrypoints/chatgpt.content.ts` — ChatGPT-only content-script boundary.

## Privacy

Read the full statement in [Privacy](docs/privacy.md). In short, the MVP is local-first: it has no backend, account system, cloud sync, telemetry, or analytics, and it never asks for an OpenAI API key.

## License and affiliation

This repository is an independent open-source project. It is not affiliated with, sponsored by, or endorsed by OpenAI. Refer to the repository for the applicable license.
