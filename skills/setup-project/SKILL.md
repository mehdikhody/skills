---
name: setup-project
description: Set up the agent tooling of any project folder (new or existing, any framework) with my base skill group (standards, find-skills, the Matt Pocock skills, caveman, caveman-commit, ponytail), the Matt Pocock skills config, graphify, AGENTS.md / CLAUDE.md importing the standards skill, and a CHANGELOG.md. Works standalone and as the base step of framework setup skills such as setup-sveltekit-project. Use when the user wants to set up, initialise or bootstrap agent tooling for a project.
disable-model-invocation: true
---

# Setup project

Prepares a folder for agent work on any harness or model. It scaffolds no app. The file contents it writes are given inline in the steps below.

Work through the steps in order. Ask the user only the questions in step 1 (through the harness's structured question tool, such as `AskUserQuestion` or `ask_question`, recommended option first); decide everything else from this file. Keep a task list. Stop and report if a command fails; never skip a step silently. Never overwrite or delete a file that was there before the setup. The commands need network access; Git's LF/CRLF warnings on Windows are harmless.

When another setup skill calls this one as its base, it passes the project folder and agent choice, so skip the questions in step 1 and, in step 7, make only the commits for steps that ran.

## 1. Where to set up

Skip any question the user's message already answered.

1. **Where to set up the project?**
   - **Current directory** (default).
   - **Custom path**: the user types a path (via "Other"). It can be relative or absolute.
2. **Which agents to install the skills for?**
   - **Auto-detect** (default): no `-a` flag. The `skills` CLI installs into `.agents/skills/` and links the agents it detects.
   - **Specific agents**: the user types agent names (via "Other"), passed as `-a <name> …`.

Create the folder if it doesn't exist. All later commands run inside it (the project directory).

If `ls -A` shows anything other than `.git`, stop and ask whether to continue there. On yes, note which files already exist (step 8 reports them). Then, in a git repo, check `git status --porcelain` for the files this setup edits: `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`, `.gitignore`, `.graphifyignore`, `.gitattributes`, `.claude/CLAUDE.md`, `.claude/settings.json`. Other dirty or untracked files are the user's: never stage them. If none of the listed files has uncommitted changes, ask nothing more; otherwise ask:

**`<files>` have uncommitted changes, and the setup edits them. What now?**
- **I'll commit or stash first** (default): wait until the user says they're done, then re-check.
- **Continue, leave them out**: the setup still edits those files, but they stay out of every commit in step 7, so the user's changes and the setup's are left together for them to commit.

## 2. Git

Unless the folder already is a git repo, run `git init -b main`.

## 3. Skills

Install the latest versions at project level. `-y` keeps every command from prompting; no `package.json` is needed. Append `-a <agents>` to each command only if the user chose specific agents.

```sh
npx -y skills add mehdikhody/skills --skill standards -y
npx -y skills add https://github.com/vercel-labs/skills --skill find-skills -y
npx -y skills add mattpocock/skills -y
npx -y skills add https://github.com/juliusbrussee/caveman --skill caveman caveman-commit -y
npx -y skills add https://github.com/dietrichgebert/ponytail --skill ponytail -y
```

The Matt Pocock line installs every skill in his repo (`triage` and `setup-matt-pocock-skills` among them). Each skill lands in `.agents/skills/<name>/` (linked into the detected agent folders), and `skills-lock.json` at the root records them all, so `npx skills experimental_install` can restore them later.

Then keep the agent link folders out of git. On Windows they are junctions, and git would commit each one as a full second copy of its `.agents/skills/` folder. Add to `.gitignore` (create the file if missing; skip lines already there):

```gitignore
# Skill links into .agents/skills; restore with: npx skills experimental_install
.claude/skills/*
!.claude/skills/graphify/
```

Make the **Skills** commit (step 7) before going on.

## 4. Working standards (`AGENTS.md` and `CLAUDE.md`)

`AGENTS.md` references `.agents/skills/standards/SKILL.md`, and `CLAUDE.md` imports `@AGENTS.md`, so every harness loads the working standards each session.

1. **`AGENTS.md`**
   - **Doesn't exist**: create it with this content:
     ```markdown
     @.agents/skills/standards/SKILL.md

     Always load and follow the `standards` skill (`.agents/skills/standards/SKILL.md`) in every session.
     ```
   - **Exists**: never change or remove its lines. If no line references `.agents/skills/standards/SKILL.md`: add a newline if the last byte isn't one, then one blank line and the content above.
2. **`CLAUDE.md`**
   - **Doesn't exist**: create it with the single line `@AGENTS.md`.
   - **Exists**: never change or remove its lines. If no line is `@AGENTS.md`: add a newline if the last byte isn't one, then one blank line and `@AGENTS.md`.
3. **`CHANGELOG.md`**: if it doesn't exist, create it with this content (Keep a Changelog 1.1.0). Never touch an existing one.
   ```markdown
   # Changelog

   All notable changes to this project will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [Unreleased]
   ```

## 5. Matt Pocock skills config

Run the `setup-matt-pocock-skills` skill (installed in step 3) and let it do the configuration. Don't ask the user its questions; use these answers: local markdown issue tracker, default triage labels, single-context domain docs.

Make the **Agent docs** commit (step 7) before going on.

## 6. graphify

1. If `graphify --version` fails: `uv tool install graphifyy` (needs uv: on Windows `winget install astral-sh.uv`), then `uv tool update-shell` if the command still isn't found.
2. `graphify install --project` registers the skill in this repo.
3. `graphify hook install` adds the agent hooks, a `## graphify` block, a merge driver in `.gitattributes`, and the git `post-commit`/`post-checkout` hooks that rebuild the graph.
4. Create `.graphifyignore` at the root with the content below, so installed skills stay out of the graph. If one exists, append only its missing lines.
   ```gitignore
   # Installed agent tooling, not project source: keeps the code graph focused
   # on the actual project instead of skill scripts and reference docs.
   .claude/skills/
   .agents/
   node_modules/
   ```
5. `graphify update .` builds the first graph (AST only, no API cost) in `graphify-out/`. It is committed: graphify expects a committed `graph.json`.

Then make the **graphify** commit (step 7).

## 7. Commits

Commit following the `standards` skill (`.agents/skills/standards/SKILL.md`, installed in step 3; install it first if it's missing): `caveman-commit` messages, one commit per logical change, no AI attribution. Make one commit each for the skills (step 3), the agent docs (step 5) and graphify (step 6). Stage explicit paths, never `git add -A`, and leave out any file the user chose to leave out in step 1.

The graphify post-commit hook only exists from step 6 on and rebuilds the graph in the background after each commit. After the graphify commit, wait about 10 seconds, then run `git status --short`. If the rebuild changed `graphify-out/` (often just `cache/stat-index.json`), commit only `graphify-out/` as "Update graphify graph", and repeat the wait and check once. Any other leftover that the setup made is a bug in this run: report it. The user's own dirty or untracked files stay as they were.

## 8. Report

Tell the user:

- The project directory, the agents targeted, and how many skills were installed (`grep -c '"computedHash"' skills-lock.json`).
- Which files already existed and were appended to rather than created, any setup-edited file left uncommitted and why, and the user's own uncommitted or untracked files that were left untouched.
- Which steps were skipped and why.
- Next: run `/graphify .` once if they want the full semantic graph on top of the AST one.
