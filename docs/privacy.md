# Privacy

Last updated: 2026-09-12

ChatGPT Action Launcher is an independent browser extension. It is not affiliated with, sponsored by, or endorsed by OpenAI.

## Data the extension accesses

When a user explicitly invokes an action, the extension may access the active browser tab's URL, page title, and text selected by the user. Only values referenced by the action template are meaningful to the rendered prompt. The extension does not crawl pages, inspect browsing history, read cookies, or access unrelated tabs.

The extension also interacts with the ChatGPT composer on `chatgpt.com` and `chat.openai.com` to fill the rendered prompt. If Auto-submit is enabled for the action, it clicks ChatGPT's send control after filling the composer.

## Data stored locally

Action names, prompt templates, ordering, and Auto-submit settings are stored in the browser's extension-local storage. This information is not uploaded by the extension. Removing the extension or clearing its extension storage may remove saved actions.

## Data shared with third parties

The extension has no backend, user accounts, cloud synchronization, telemetry, analytics, advertising, or data broker integration. It does not send data to the project maintainers.

When the user invokes an action, the rendered prompt is sent to the ChatGPT website through the user's existing browser session. ChatGPT and its operator may process that prompt according to the user's ChatGPT account, applicable terms, and privacy settings. The extension does not use the OpenAI API and does not request, store, or transmit an OpenAI API key.

## Permissions

The extension uses `activeTab`, `scripting`, and `storage`. `activeTab` and `scripting` support the user-initiated capture of active-tab context; `storage` supports local action persistence. Permanent host access is limited to the two ChatGPT domains needed by the ChatGPT content script. See the [README permission table](../README.md#permissions) for the detailed mapping.

## User control

Users choose when an action is invoked and can edit or delete saved actions from the popup. Users should avoid placing confidential information in prompts or selected text unless they understand how it will be processed by the ChatGPT website.

## Changes and contact

This statement may be updated when the extension's data practices change. Any future collection, remote service, or permission expansion should be documented before release. Questions can be raised through the repository's GitHub issue tracker.
