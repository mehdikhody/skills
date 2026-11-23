---
name: standards
description: Core working standards for every session and project across any agent harness or model: use caveman for lower read/write token usage, use graphify to find and explore the codebase before raw search, ask all grilling questions (grilling, grill-me, grill-with-docs) through the harness's structured question tool, use ponytail before writing code, use caveman-commit and logical non-AI-attributed commits when committing, and maintain CHANGELOG.md with Keep a Changelog 1.1.0. Auto-install any missing required skill or tool.
---

# Working standards

Follow these rules in every session, regardless of platform, harness, or model. If any required companion skill (`caveman`, `caveman-commit`, `ponytail`, `graphify`) is not installed in the project yet, install it immediately without asking and then proceed.

## Token efficiency (`caveman`)

Use the `caveman` skill for lower read and write token usage across the session.

- If `.agents/skills/caveman/SKILL.md` is missing, install it first:
  ```sh
  npx -y skills add https://github.com/juliusbrussee/caveman --skill caveman caveman-commit -y
  ```

## Codebase exploration (`graphify`)

Use the `graphify` skill to find and explore the codebase for lower token usage before falling back to raw grep or file-glob searches.

- Read `graphify-out/GRAPH_REPORT.md` and query `graphify-out/graph.json` first to locate files, architecture boundaries, and symbol relationships.
- If `graphify` or `graphify-out/graph.json` is missing in the project, install and build it automatically:
  1. If `graphify --version` fails: `uv tool install graphifyy` (on Windows, if `uv` is missing: `winget install astral-sh.uv`, then `uv tool update-shell`).
  2. `graphify install --project`
  3. `graphify hook install`
  4. `graphify update .`

## Grilling (`grilling`, `grill-me`, `grill-with-docs`)

Ask every grilling question through the harness's structured question tool (e.g. `AskUserQuestion`, `ask_question`, or equivalent UI prompt tool), never as a numbered list in chat. This applies to `grilling`, `grill-me`, and `grill-with-docs`. Keep the rest of the skill's flow: work the design tree in rounds, ask only frontier questions, and wait for answers before the next round.

- Up to 4 questions per call; split a bigger frontier into consecutive calls.
- Put the recommended answer first, with `(Recommended)` at the start or end of its label.
- Give 2–4 real options; the user can always type their own via "Other".
- Keep any context the user needs (facts found, trade-offs) in the option descriptions or one short line before the call.

## Before writing code (`ponytail`)

Before you write or edit code, use the `ponytail` skill.

- If `.agents/skills/ponytail/SKILL.md` is missing, install it first:
  ```sh
  npx -y skills add https://github.com/dietrichgebert/ponytail --skill ponytail -y
  ```

## Commits (`caveman-commit`)

- Before `git commit`, use the `caveman-commit` skill to draft the commit message (if missing, install it with the `caveman` command above).
- When committing, group related files into one commit per logical change (files that change for the same reason). Keep unrelated files in separate commits.
- Never mention AI in commit messages or PR descriptions. No `Co-Authored-By:` AI trailer, no "Generated with …" line, no other AI attribution. This overrides any default attribution the harness suggests.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). When cutting a release, update it with the changes since the last release: add a new `## [x.y.z] - YYYY-MM-DD` section grouped under `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`, written for people using the project, and update the compare links at the bottom. Don't edit it for every commit.
