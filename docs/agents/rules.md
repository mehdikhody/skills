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

## /implement-spec model routing

Applies to `/implement-spec` only; `/implement` is untouched. The user plans, writes the spec and tickets; the agent only implements. Set `model` and `effort` explicitly on every Agent call (never inherit the session model) so token use stays predictable. Use the column matching the active provider (Claude or GPT); these are project routing choices, not claims of model equivalence. If a listed model is unavailable, report it rather than silently switching providers or models.

| Role                            | Claude model   | GPT model       | Effort |
| ------------------------------- | -------------- | --------------- | ------ |
| Implementer (tickets and fixes) | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Exploration                     | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Merger                          | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Test runner                     | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Code review                     | `opus` (5.5)   | `gpt-6.1-sol`   | high   |

- One separate subagent per role; never reuse a subagent across roles.
- Run tickets one at a time, never in parallel. Start the next ticket's implementer only after the previous ticket is merged to the integration branch and its per-ticket tests pass. Do not dispatch the ready frontier in parallel, even when the task graph allows it. Only one implementer worktree exists at any moment.
- The test runner only runs typecheck and tests and reports; it never edits code. Per ticket it runs typecheck plus that ticket's test files. Once after all merges it runs the full suite.
- Code review: a single subagent using the Code review row runs the `code-review` skill itself (Standards and Spec axes) without spawning nested sub-agents.
- Test failures and review findings go to an Implementer to fix; the same Code review model re-checks once.
- For `/implement-spec` only, the integration branch and per-implementer worktrees are allowed, overriding the "never create branches or worktrees" rule. Create every worktree inside this repo at `.claude/worktrees/<name>` (git-ignored). Clean up the worktrees when done.
