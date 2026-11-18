# Working rules

## Grilling (`grilling`, `grill-me`, `grill-with-docs`)

Ask every grilling question through the `AskUserQuestion` tool, never as a numbered list in chat. This applies to `grilling`, `grill-me`, and `grill-with-docs`. Keep the rest of the skill's flow: work the design tree in rounds, ask only frontier questions, and wait for answers before the next round.

- Up to 4 questions per call; split a bigger frontier into consecutive calls.
- Put the recommended answer first, with "(Recommended)" at the end of its label.
- Give 2–4 real options; the user can always type their own via "Other".
- Keep any context the user needs (facts found, trade-offs) in the option descriptions or one short line before the call.

## Commits

- When committing, group related files into one commit per logical change (files that change for the same reason). Keep unrelated files in separate commits.
- Never mention AI in commit messages or PR descriptions. No `Co-Authored-By: Claude …` trailer, no "Generated with Claude Code" line, no other AI attribution. This overrides any default attribution the harness suggests.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). When cutting a release, update it with the changes since the last release: add a new `## [x.y.z] - YYYY-MM-DD` section grouped under `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`, written for people using the app, and update the compare links at the bottom. Don't edit it for every commit.

## UI components (shadcn-svelte)

Build all UI from shadcn-svelte components (see the `shadcn-svelte` skill). Add components with the `shadcn-svelte add` CLI, never by hand, and use no raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<table>` outside `src/lib/components/ui`.

If shadcn-svelte has no component for the job, look at [shadcn-svelte-extras](https://shadcn-svelte-extras.com/) (e.g. modal, stepper, tags input, phone input, file drop zone, tree view). Install with `shadcn-svelte add https://shadcn-svelte-extras.com/r/<name>.json`. Extras land in `src/lib/components/ui` and share its raw-element exemption. If neither library fits, ask before hand-building or installing dependencies or libraries.

## Mobile view (ios-design)

On mobile viewports the website should look and behave like a native app. For layout and navigation on mobile, follow the `ios-design` skill: the app shell, a bottom tab bar for top-level sections, navigation-bar titles and back buttons, sheets instead of centered dialogs, safe areas, touch-target sizes, and keyboard-aware forms. Apply its guidance to this web app (Svelte, Tailwind, shadcn-svelte). Ignore its SwiftUI, UIKit and React Native code.

- This applies to mobile only. Gate it with Tailwind's responsive prefixes (mobile-first styles, then `md:` and up for desktop), so the tablet and desktop website keeps its normal web layout (sidebar, top navigation, dialogs).
- Mobile-only pieces, such as the tab bar or a sheet in place of a dialog, are still built from shadcn-svelte components (e.g. `Drawer` for sheets), following the UI components rule above.
- Account for `env(safe-area-inset-*)` and set `viewport-fit=cover` in `app.html`, so the tab bar and headers clear the notch and home indicator.
- For everything outside mobile layout and navigation, `ios-design` does not apply.

## Browser verification

Verify UI changes in the running dev app (`npm run dev`) with the `agent-browser` skill: open the page, exercise the change, and check the console for errors. Don't claim a UI change works without looking at it.

## /implement-spec model routing

Applies to `/implement-spec` only; `/implement` is untouched. The user plans, writes the spec and tickets; the agent only implements. Set `model` and `effort` explicitly on every Agent call (never inherit the session model) so token use stays predictable. Use the column matching the active provider (Claude or GPT); these are project routing choices, not claims of model equivalence. If a listed model is unavailable, report it rather than silently switching providers or models.

| Role                               | Claude model   | GPT model       | Effort |
| ---------------------------------- | -------------- | --------------- | ------ |
| Implementer (tickets and fixes)    | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Exploration                        | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Merger                             | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Test runner                        | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Code review                        | `opus` (5.5)   | `gpt-6.1-sol`   | high   |
| UI design review / browser testing | `opus` (5.5)   | `gpt-6.1-sol`   | high   |

- One separate subagent per role; never reuse a subagent across roles.
- Every Implementer and Code review prompt tells the subagent to read `docs/agents/architecture.md` before it starts.
- Run tickets one at a time, never in parallel. Start the next ticket's implementer only after the previous ticket is merged to the integration branch and its per-ticket tests pass. Do not dispatch the ready frontier in parallel, even when the task graph allows it. Only one implementer worktree exists at any moment.
- The test runner only runs typecheck and tests and reports; it never edits code. Per ticket it runs typecheck plus that ticket's test files. Once after all merges it runs the full suite.
- Code review: a single subagent using the Code review row runs the `code-review` skill itself (Standards and Spec axes) without spawning nested sub-agents.
- UI review: one subagent using the UI design review / browser testing row, once at the end, only if the spec touched UI. It uses `agent-browser` on the dev app (see Browser verification).
- Test failures and review findings go to an Implementer to fix; the same Code review model re-checks once.
- For `/implement-spec` only, the integration branch and per-implementer worktrees are allowed, overriding the "never create branches or worktrees" rule. Create every worktree inside this repo at `.claude/worktrees/<name>` (git-ignored, and excluded from Playwright and the Vite watcher). Clean up the worktrees when done.
