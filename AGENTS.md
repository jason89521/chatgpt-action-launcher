# AGENTS.md

## Project goal

Build a small, reliable browser extension that lets a user launch reusable prompts into a new ChatGPT conversation from a popup UI.

Keep the product generic. GitHub is an initial use case, not a hard-coded product dependency.

## MVP boundaries

The MVP includes:

- a popup action launcher;
- action CRUD and ordering;
- prompt templates;
- `{{url}}`, `{{title}}`, and `{{selection}}` interpolation;
- opening a new ChatGPT conversation;
- filling and automatically submitting the rendered prompt;
- local persistence.

The MVP explicitly does **not** include:

- an OpenAI API integration;
- API-key storage;
- a backend or user accounts;
- cloud sync;
- telemetry or analytics;
- a prompt marketplace;
- complex workflow chaining;
- site-specific GitHub parsing;
- Firefox/Safari support as a release requirement.

Do not expand scope without an issue that explicitly changes these boundaries.

## Technical direction

Use WXT, React, and TypeScript unless an issue explicitly changes the stack.

Prefer small modules with clear seams:

- action domain/storage;
- template rendering;
- browser-context capture;
- popup/editor UI;
- ChatGPT page automation.

Keep ChatGPT DOM knowledge isolated behind a dedicated adapter/content-script boundary. UI selectors and retry/readiness logic for ChatGPT must not leak into the action model or popup components.

## Permissions and privacy

Treat browser permissions as part of the product surface.

- Request the smallest practical permission set.
- Do not add broad host permissions when `activeTab` / targeted scripting can satisfy the feature.
- Permanent host access should be limited to domains that require an always-available integration, such as the ChatGPT adapter.
- Do not add analytics, telemetry, remote prompt storage, or external network services in the MVP.
- Never request, store, or log an OpenAI API key.
- Never log rendered prompts, selected text, or ChatGPT conversation content in production code.

If a feature requires materially broader access, document the reason in the PR/issue before implementing it.

## Product behavior

An action is user-configurable data, not hard-coded workflow logic.

At minimum, an action needs a stable ID, name, prompt template, ordering information, and whether it should auto-submit.

Template interpolation must be deterministic. Unknown variables should not silently become misleading content; handle them explicitly and test the behavior.

Invoking an action should create a new ChatGPT conversation rather than reuse an unrelated existing conversation.

If ChatGPT automation cannot safely submit, fail visibly rather than pretending the action succeeded.

## Quality bar

Before completing an implementation issue:

- TypeScript must type-check.
- Lint must pass without suppressing avoidable warnings.
- Automated tests must cover non-trivial pure logic such as template rendering and storage migrations/normalization.
- Build must succeed.
- User-facing behavior changed by the issue should be manually smoke-tested when feasible.

Do not silence linter/type errors merely to make CI pass.

## Issue discipline

Implement the issue that was requested and keep unrelated refactors out of scope.

If an issue's acceptance criteria conflict with this file, the more recent explicit product decision in the issue wins only when it clearly states that it is changing project policy; update this file in the same change when appropriate.

When implementation reveals that an issue is too large or has an unsafe dependency, split or report the boundary instead of silently broadening the patch.
