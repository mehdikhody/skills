---
name: setup-project
description: Set up a raw project folder (no app scaffold) with my skill group (find-skills, the Matt Pocock skills, caveman, caveman-commit, ponytail), the Matt Pocock skills config, graphify and my CLAUDE.md rules. Use when the user wants to set up, initialise or bootstrap the agent tooling of a new or existing project without a framework.
disable-model-invocation: true
---

# Setup project

Prepares a folder for agent work: skills, the Matt Pocock skills config, graphify and the working rules in `CLAUDE.md`. It scaffolds no app. Files this skill ships live next to this `SKILL.md`; below, `<skill>` means this skill's folder.

Work through the steps in order. Ask the user only the questions in step 1 (through `AskUserQuestion`, recommended option first); decide everything else from this file. Keep a task list. Stop and report if a command fails; never skip a step silently. Never overwrite or delete a file that was there before the setup.

## 1. Where to set up

Skip this if the user's message already names the folder.

**Where to set up the project?**
- **Current directory** (default).
- **Custom path**: the user types a path (via "Other"). It can be relative or absolute, and it is created if missing.

All later commands run inside that folder (the project directory).

If the folder holds anything other than `.git`, stop and ask whether to continue there. On yes, note which files already exist and whether `git status --porcelain` is clean; step 7 needs both.

## 2. Git

Unless the folder already is a git repo, run `git init -b main`.

## 3. Skills

Install project-level for Claude Code. `-a claude-code -y` keeps every command from prompting; no `package.json` is needed.

```sh
npx -y skills add https://github.com/vercel-labs/skills --skill find-skills -a claude-code -y
npx -y skills add mattpocock/skills -a claude-code -y
npx -y skills add https://github.com/juliusbrussee/caveman --skill caveman caveman-commit -a claude-code -y
npx -y skills add https://github.com/dietrichgebert/ponytail --skill ponytail -a claude-code -y
```

The Matt Pocock line installs every skill in his repo. Each skill is copied into `.claude/skills/<name>/`, and `skills-lock.json` at the root records them all, so `npx skills experimental_install -a claude-code` can restore them later.

## 4. CLAUDE.md rules

The rules are in `<skill>/templates/CLAUDE.md`: a `# Working rules` heading with three sections (`## Grilling …`, `## Commits`, `## /implement-spec model routing`).

- **No `CLAUDE.md` yet**: copy the template to the root as `CLAUDE.md`.
- **`CLAUDE.md` exists**: append to its end only the sections whose `##` heading isn't in the file yet, under a `# Working rules` heading (add that heading only if the file doesn't have one). Leave the existing content untouched.

Then add `.claude/worktrees/` to `.gitignore` (create the file if missing; skip the line if it's already there). The routing rules create worktrees there.

## 5. Matt Pocock skills config

Read `.claude/skills/setup-matt-pocock-skills/SKILL.md` and follow it, but don't ask the user anything; use these answers:

- **Issue tracker**: local markdown. Issues are files under `.scratch/<feature>/` in this repo. Use that skill's `issue-tracker-local.md` seed.
- **Triage labels**: default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
- **Domain docs**: single-context. One `GLOSSARY.md` and `docs/adr/` at the repo root.

It writes `docs/agents/*.md` and adds an `## Agent skills` block to the root `CLAUDE.md` from step 4 (in place, if the block already exists). If `GLOSSARY.md` doesn't exist, create it with a title and one line; add `docs/adr/.gitkeep` if `docs/adr/` is empty or missing.

## 6. graphify

Make the skills and agent-docs commits from step 7 first.

1. If `graphify --version` fails: `uv tool install graphifyy` (needs uv: on Windows `winget install astral-sh.uv`), then `uv tool update-shell` if the command still isn't found.
2. `graphify install --project` registers the skill and hooks in this repo.
3. `graphify hook install` rebuilds the graph on commit and checkout.
4. Copy `<skill>/templates/.graphifyignore` to the root, so installed skills stay out of the graph. If one exists, append only its missing lines.
5. `graphify update .` builds the first graph (AST only, no API cost).

## 7. Commits

One commit per group, each made as soon as its steps are done (so graphify's own edits to `CLAUDE.md` land in the graphify commit, not the agent-docs one). No AI attribution in the messages: the `CLAUDE.md` from step 4 forbids it.

1. **Skills** (after step 3): `.claude/skills/`, `skills-lock.json`, and `.agents/` if the CLI created it.
2. **Agent docs** (after step 5): `CLAUDE.md`, `.gitignore`, `docs/agents/`, `GLOSSARY.md`, `docs/adr/`.
3. **graphify** (after step 6): everything steps 6.2–6.5 created or changed, including any edits it made to `CLAUDE.md` or `.claude/`.

Stage paths explicitly, never `git add -A`, so only files this setup created or changed are committed. If a file the setup edited already had uncommitted changes before step 1, leave it out of the commits and tell the user. Use `git status` after the last commit to check that nothing the setup made is left over.

## 8. Report

Tell the user:

- The project directory, and how many skills were installed (from `skills-lock.json`).
- Which files already existed and were appended to rather than created, and anything left uncommitted and why.
- Which steps were skipped and why.
- Next: run `/graphify .` once if they want the full semantic graph on top of the AST one.
