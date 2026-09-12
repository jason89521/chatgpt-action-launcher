# ChatGPT Action Launcher

A lightweight browser extension for turning reusable prompts into one-click ChatGPT actions.

The goal is simple: while browsing any page, open the extension popup, choose an action, and launch a **new ChatGPT conversation** with a saved prompt. Actions can optionally interpolate browser context such as the current URL, page title, or selected text.

> Status: early development. The MVP is not released yet.

## Why

Many ChatGPT workflows are repetitive:

1. copy a URL or selected text,
2. open ChatGPT,
3. start a new chat,
4. paste the context,
5. paste or rewrite the same instruction,
6. submit it.

ChatGPT Action Launcher turns that sequence into a reusable action in the browser UI.

## MVP

The first version will support:

- an extension popup that lists saved actions;
- creating, editing, deleting, and reordering actions;
- reusable prompt templates;
- template variables:
  - `{{url}}` — current page URL;
  - `{{title}}` — current page title;
  - `{{selection}}` — currently selected text;
- opening a new ChatGPT conversation;
- filling the rendered prompt into the ChatGPT composer;
- automatically submitting the prompt;
- local persistence in browser extension storage;
- one built-in example action for evaluating whether the current GitHub issue is suitable for a smaller coding agent.

Example:

```text
Review this GitHub issue:
{{url}}

Decide whether it is small and well-scoped enough for a lightweight coding agent.
If it is not, split it into smaller implementation tickets.
```

The extension itself does not need to understand GitHub. The action template decides how the current browser context should be interpreted.

## Product principles

### Generic actions, not site-specific workflows

The core abstraction is an **action** containing a reusable prompt. GitHub is only the first use case.

### Minimal permissions

The extension should request only the permissions required for the feature being used. It should not require broad read access to every page merely to obtain the active tab's URL, title, or selection.

### Local-first

Saved actions live in browser extension storage. The MVP has no account system, backend, telemetry, analytics, or cloud sync.

### No OpenAI API key

The extension uses the user's existing ChatGPT web session. It does not call the OpenAI API and should never ask users to paste an OpenAI API key.

### Transparent ChatGPT automation

The extension needs limited automation on `chatgpt.com` to populate and submit the composer. This integration is intentionally isolated so changes to ChatGPT's UI can be repaired without affecting action storage or template rendering.

## Planned architecture

The MVP is expected to use:

- [WXT](https://wxt.dev/) for browser-extension tooling;
- React + TypeScript for extension UI;
- Manifest V3;
- browser extension storage for persisted actions;
- a small template-rendering layer for browser-context variables;
- a dedicated ChatGPT content-script adapter for composer automation.

The initial target is Chromium-based browsers. Cross-browser support is welcome later, but it is not an MVP requirement.

## Privacy

The intended MVP:

- has no backend;
- has no telemetry or analytics;
- does not collect saved prompts;
- does not collect ChatGPT conversations;
- does not require an OpenAI API key;
- only sends a rendered prompt to ChatGPT when the user explicitly invokes an action.

A detailed privacy statement will be added before publishing the extension to an extension store.

## Development

Implementation work is tracked in GitHub Issues. The repository-level guidance for coding agents lives in [AGENTS.md](./AGENTS.md).

Once the bootstrap issue is implemented, local development and build commands will be documented here.

## Disclaimer

This is an independent open-source project and is not affiliated with or endorsed by OpenAI.
