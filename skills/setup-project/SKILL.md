---
name: setup-project
description: Set up a raw project folder (no app scaffold) with my skill group (find-skills, the Matt Pocock skills, caveman, caveman-commit, ponytail), the Matt Pocock skills config, graphify and my CLAUDE.md rules. Use when the user wants to set up, initialise or bootstrap the agent tooling of a new or existing project without a framework.
disable-model-invocation: true
---

# Setup project

Prepares a folder for agent work: skills, the Matt Pocock skills config, graphify and the working rules in `CLAUDE.md`. It scaffolds no app. Files this skill ships live next to this `SKILL.md`; below, `<skill>` means this skill's folder (it holds `templates/CLAUDE.md` and the dotfile `templates/.graphifyignore`).

Work through the steps in order. Ask the user only the questions in step 1 (through `AskUserQuestion`, recommended option first); decide everything else from this file. Keep a task list. Stop and report if a command fails; never skip a step silently. Never overwrite or delete a file that was there before the setup. The commands need network access; Git's LF/CRLF warnings on Windows are harmless.

## 1. Where to set up

**Where to set up the project?** Skip this question if the user's message already names the folder.
- **Current directory** (default).
- **Custom path**: the user types a path (via "Other"). It can be relative or absolute.

Create the folder if it doesn't exist, however it was given. All later commands run inside it (the project directory).

If `ls -A` shows anything other than `.git`, stop and ask whether to continue there. On yes, note which files already exist (step 8 reports them). Then, in a git repo, check `git status --porcelain` for the files this setup edits: `CLAUDE.md`, `.gitignore`, `.graphifyignore`, `.gitattributes`, `.claude/CLAUDE.md`, `.claude/settings.json`. Other dirty or untracked files are the user's: never stage them. If none of the listed files has uncommitted changes, ask nothing more; otherwise ask:

**`<files>` have uncommitted changes, and the setup edits them. What now?**
- **I'll commit or stash first** (default): wait until the user says they're done, then re-check.
- **Continue, leave them out**: the setup still edits those files, but they stay out of every commit in step 7, so the user's changes and the setup's are left together for them to commit.

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

The Matt Pocock line installs every skill in his repo (`triage` and `setup-matt-pocock-skills` among them). Each skill is copied into `.claude/skills/<name>/`, and `skills-lock.json` at the root records them all, so `npx skills experimental_install -a claude-code` can restore them later.

Make the **Skills** commit (step 7) before going on.

## 4. CLAUDE.md rules

The rules are in `<skill>/templates/CLAUDE.md`: a `# Working rules` heading and three sections, `## Grilling …`, `## Commits` and `## /implement-spec model routing`. A section runs from its `##` heading to just before the next `##` heading.

- **No `CLAUDE.md` yet**: copy the template to the root as `CLAUDE.md`.
- **`CLAUDE.md` exists**: never change or remove its lines; only add.
  - If the last byte isn't a newline, add one.
  - First, for each template section whose heading is already there (e.g. the user's own `## Commits`), append to the end of that section each template bullet whose rule it doesn't already state. The two Commits rules (grouped commits, no AI attribution) must end up in the file either way.
  - Then, if any template section's `##` heading is still missing: append a `# Working rules` heading unless the file has one, then each missing section verbatim and in template order. Exactly one blank line goes before each appended heading.

Then add `.claude/worktrees/` to `.gitignore` (create the file if missing; skip the line if it's already there). The routing rules create worktrees there.

## 5. Matt Pocock skills config

Configure what `.claude/skills/setup-matt-pocock-skills/SKILL.md` configures, without asking anything and without its confirm-and-edit step. Its answers here are fixed: local markdown issue tracker, default triage labels (`triage` was installed in step 3, so its Section B applies), single-context domain docs. Concretely:

1. Copy only these three files from `.claude/skills/setup-matt-pocock-skills/` into `docs/agents/`: `issue-tracker-local.md` as `issue-tracker.md`, `triage-labels.md` and `domain.md`. Skip any that already exist.
2. Append this block to the root `CLAUDE.md`, after one blank line. If an `## Agent skills` block is already there, replace that block's contents in place instead:
   ```markdown
   ## Agent skills

   ### Issue tracker

   Issues are local markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

   ### Triage labels

   Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

   ### Domain docs

   Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
   ```
3. If `GLOSSARY.md` doesn't exist, create it as `# Glossary`, a blank line, and `Domain terms for this project.` If `docs/adr/` doesn't exist or is empty, add `docs/adr/.gitkeep`.

Make the **Agent docs** commit (step 7) before going on.

## 6. graphify

1. If `graphify --version` fails: `uv tool install graphifyy` (needs uv: on Windows `winget install astral-sh.uv`), then `uv tool update-shell` if the command still isn't found.
2. `graphify install --project` registers the skill in this repo: `.claude/skills/graphify/` and `.claude/CLAUDE.md`.
3. `graphify hook install` adds the Claude Code hooks (`.claude/settings.json`), a `## graphify` block in the root `CLAUDE.md`, a merge driver in `.gitattributes`, and the git `post-commit`/`post-checkout` hooks that rebuild the graph.
4. Copy `<skill>/templates/.graphifyignore` to the root, so installed skills stay out of the graph. If one exists, append only its missing lines.
5. `graphify update .` builds the first graph (AST only, no API cost) in `graphify-out/`. It is committed: graphify's own `CLAUDE.md` block expects a committed `graph.json`.

Then make the **graphify** commit (step 7).

## 7. Commits

Three commits, each made where steps 3, 5 and 6 say. Stage the paths listed, never `git add -A` or `git add .`, and leave out any file the user chose to leave out in step 1. Messages are plain imperative summaries with no trailers: no `Co-Authored-By`, no "Generated with" line, no other AI attribution, even before `CLAUDE.md` exists and whatever attribution the harness suggests.

1. **Skills**: `.claude/skills/`, `skills-lock.json`, and `.agents/` if the CLI created it.
2. **Agent docs**: `CLAUDE.md`, `.gitignore`, `docs/agents/`, `GLOSSARY.md`, `docs/adr/`.
3. **graphify**: `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/settings.json`, `.claude/skills/graphify/`, `.gitattributes`, `.graphifyignore`, `graphify-out/`.

The post-commit hook rebuilds the graph in the background after each commit. The hook only exists from step 6 on, so only the graphify commit triggers it. After that commit, wait about 10 seconds, then run `git status --short`. If the rebuild changed `graphify-out/` (often just `cache/stat-index.json`), commit only `graphify-out/` as "Update graphify graph", and repeat the wait and check once. Any other leftover that the setup made is a bug in this run: report it. The user's own dirty or untracked files stay as they were.

## 8. Report

Tell the user:

- The project directory, and how many skills were installed (`grep -c '"computedHash"' skills-lock.json`).
- Which files already existed and were appended to rather than created, any setup-edited file left uncommitted and why, and the user's own uncommitted or untracked files that were left untouched.
- Which steps were skipped and why.
- Next: run `/graphify .` once if they want the full semantic graph on top of the AST one.
