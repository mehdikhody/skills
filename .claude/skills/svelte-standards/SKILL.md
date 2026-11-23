---
name: svelte-standards
description: Frontend working standards for Svelte 5 apps across any agent harness or model. Extends the core standards skill with required Svelte sv add-ons (ai-tools, eslint, mdsvex, paraglide, playwright, prettier, tailwindcss, vitest), interactive npx shadcn-svelte@latest init via the harness's question tool, Vazirmatn font for Persian (fa), UI component rules (shadcn-svelte and shadcn-svelte-extras only), unified frontend design skills (frontend-design, web-design-guidelines, ui-taste, ios-design across all viewports), and browser verification with agent-browser.
---

# Svelte frontend standards

@.agents/skills/standards/SKILL.md

This skill extends the core [`standards`](../standards/SKILL.md) skill for Svelte 5 frontend work. Follow both in every session.

## 1. Required frontend companion skills

Ensure the frontend design, component, and browser-verification skills are installed in `.agents/skills/`. If any of them is missing, install it immediately without asking:

```sh
npx -y skills add https://github.com/anthropics/skills --skill frontend-design -y
npx -y skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines -y
npx -y skills add https://uizze.sh/ -y
npx -y skills add https://github.com/huntabyte/shadcn-svelte --skill shadcn-svelte -y
npx -y skills add https://github.com/vercel-labs/agent-browser --skill agent-browser -y
```

(`https://uizze.sh/` installs both `ui-taste` and `ios-design`.)

## 2. Frontend `sv` add-ons

When setting up or adding missing frontend tooling to a Svelte project, use `npx sv add` with the standard frontend add-ons:

- `npx sv add ai-tools`
- `npx sv add eslint`
- `npx sv add mdsvex`
- `npx sv add paraglide`
- `npx sv add playwright`
- `npx sv add prettier`
- `npx sv add tailwindcss`
- `npx sv add vitest`

Keep installed skills and graph output ignored by formatter and linter:
- `.prettierignore`: `/.agents/`, `/.claude/skills/`, `/graphify-out/`
- `eslint.config.js`: `{ ignores: ['.agents/', '.claude/skills/', 'graphify-out/'] }`

## 3. `shadcn-svelte` initialization (`npx shadcn-svelte@latest init`)

When `components.json` is not present yet, initialize `shadcn-svelte` with preset `b1f2J64kkE` and the `#lib` subpath aliases:

```sh
npx -y shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "#lib" --components-alias "#lib/components" --utils-alias "#lib/utils" --hooks-alias "#lib/hooks" --ui-alias "#lib/components/ui"
```

If this install needs user input, ask the user via the harness's structured question tool (e.g. `AskUserQuestion`, `ask_question`, or equivalent UI prompt tool).

### Persian font (`fa` locale)

When `fa` is one of the Paraglide locales, configure `vazirmatn` after `shadcn-svelte init` (since init rewrites `src/routes/layout.css`):

1. `npm i vazirmatn`
2. In `src/routes/layout.css`, right after `@import 'tailwindcss';`, add:
   ```css
   @import 'vazirmatn/Vazirmatn-Variable-font-face.css';
   ```
3. Add an unlayered rule at the end of `src/routes/layout.css` so Persian pages use `'Vazirmatn'` first while Latin characters fall back to the preset's Latin font:
   ```css
   html:lang(fa) body,
   html:lang(fa) .font-sans,
   html:lang(fa) .font-heading {
   	font-family: 'Vazirmatn', 'Roboto Variable', sans-serif;
   }
   ```

## 4. UI components (`shadcn-svelte` & `shadcn-svelte-extras`)

Build all UI from `shadcn-svelte` components (follow the `shadcn-svelte` skill):

- Add components with the `npx shadcn-svelte@latest add <component>` CLI, never by hand.
- Use no raw `<button>`, `<input>`, `<select>`, `<textarea>`, or `<table>` outside `src/lib/components/ui`.
- If `shadcn-svelte` has no component for the job, look at [shadcn-svelte-extras](https://shadcn-svelte-extras.com/) (e.g. modal, stepper, tags input, phone input, file drop zone, tree view). Install with:
  ```sh
  npx shadcn-svelte@latest add https://shadcn-svelte-extras.com/r/<name>.json
  ```
  Extras land in `src/lib/components/ui` and share its raw-element exemption.
- If neither library fits, ask the user through the harness's structured question tool before hand-building or installing third-party UI libraries.

## 5. Frontend design (`frontend-design`, `web-design-guidelines`, `ui-taste`, `ios-design`)

Apply all four design skills across **all viewports** (mobile, tablet, and desktop — no mobile-only restriction):

- **`ios-design` on every screen size**: The web app looks and behaves like a native app on every viewport. Follow `ios-design` for the app shell, tab-based top-level navigation, navigation-bar titles and back buttons, sheets, safe areas, touch-target sizes, and keyboard-aware forms (adapted to Svelte 5, Tailwind CSS, and `shadcn-svelte`; ignore SwiftUI/UIKit/React Native code):
  - **Mobile**: iPhone patterns — bottom tab bar, full-width content, and bottom sheets (`Drawer`).
  - **Tablet and desktop (`md:` and up)**: Adapt the app the way iPadOS/macOS apps do — don't just stretch the phone layout. The tab bar becomes a sidebar (`Sidebar`), content width is capped, and sheets become side panels (`Sheet`) or centered modals (`Dialog`).
  - Build all app-like pieces (tab bar, sidebar, sheets, drawers) from `shadcn-svelte` components, following the UI components rule above.
  - Account for `env(safe-area-inset-*)` and set `viewport-fit=cover` in `src/app.html` so the tab bar and headers clear the notch and home indicator.
- **`frontend-design`, `ui-taste`, and `web-design-guidelines`**: Follow these skills for visual polish, typography, spacing, color harmony, micro-interactions, accessible contrast/focus states, keyboard navigation, and responsive ergonomics across every screen size.

## 6. Browser verification (`agent-browser`)

Verify every UI change in the running dev app (`npm run dev`) with the `agent-browser` skill:

- Open the page, exercise the interactive flow and responsive states, and check the browser console for errors.
- Never claim a UI change works without inspecting it live with `agent-browser`.
