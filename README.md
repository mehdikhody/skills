# mehdikhody/skills

My skill group: my own agent skills, plus a pinned set of other people's skills that I install in every project.

## Install

With the [`skills` CLI](https://github.com/vercel-labs/skills) (Claude Code, opencode, Cursor, …):

```sh
npx skills add mehdikhody/skills
```

As a Claude Code plugin:

```sh
/plugin marketplace add mehdikhody/skills
/plugin install mehdikhody-skills@mehdikhody-skills
```

## My skills

| Skill | What it does |
| --- | --- |
| [`setup-sveltekit-project`](skills/setup-sveltekit-project/SKILL.md) | Scaffolds a SvelteKit 3 app: `sv` add-ons; Drizzle with Postgres, MySQL or SQLite (Docker Desktop or a custom URL); optional better-auth with a choice of sign-in method (username + password + SMS OTP, phone + password, phone OTP only, email + password; SMS over FarazSMS); Paraglide (fa/en, with the Vazirmatn font for fa); shadcn-svelte; the third-party skills below; graphify; Matt Pocock skills config; my `CLAUDE.md` rules and layered architecture (Remote → Service → Query → DB) with a worked `post` example. Invoke with `/setup-sveltekit-project`. |
| [`setup-project`](skills/setup-project/SKILL.md) | Raw setup with no app scaffold, in the current directory or another path: installs find-skills, all Matt Pocock skills, caveman, caveman-commit and ponytail (latest, via `npx skills add`); configures the Matt Pocock skills (local markdown issues in `.scratch/`, default triage labels, single-context `GLOSSARY.md` + `docs/adr/`); sets up graphify; adds my `CLAUDE.md` rules (grilling via `AskUserQuestion`, grouped commits without AI attribution, `/implement-spec` model routing); commits in logical groups. Invoke with `/setup-project`. |

## Third-party skills

Pinned in [`skills/setup-sveltekit-project/skills-lock.json`](skills/setup-sveltekit-project/skills-lock.json) and restored by `setup-sveltekit-project`. To install them into any other repo, copy that file to the repo root and run:

```sh
npx skills experimental_install -a claude-code
```

| Source | Skills |
| --- | --- |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | find-skills |
| [mattpocock/skills](https://github.com/mattpocock/skills) | ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, implement-spec, improve-codebase-architecture, pr, prototype, research, resolving-merge-conflicts, retro, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents |
| [anthropics/skills](https://github.com/anthropics/skills) | frontend-design |
| [uizze.sh](https://uizze.sh/) | ui-taste, ios-design |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | web-design-guidelines |
| [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | caveman, caveman-commit |
| [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | agent-browser |
| [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) | ponytail |
| [huntabyte/shadcn-svelte](https://github.com/huntabyte/shadcn-svelte) | shadcn-svelte |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | seo-audit |

### Updating the lock

In an empty scratch folder (`git init` and a `package.json` so the CLI treats it as a project), re-run the adds and copy the new `skills-lock.json` here. Pass several skill names space-separated, not comma-separated:

```sh
npx skills add https://github.com/vercel-labs/skills --skill find-skills -a claude-code -y
npx skills add https://github.com/mattpocock/skills --skill grilling grill-me ... -a claude-code -y
# …one line per source in the table above
```

Or run `npx skills update -p -y` in a project that already has them, and copy its lock back.
