# AGENTS.md

<INSTRUCTIONS>
## Project overview
- Vue 3 + Vite app using TypeScript and Pinia.
- Styling uses UnoCSS; prefer utility classes over bespoke CSS where practical.
- Package manager and scripts are Bun-based; prefer `bun` for scripts.

## Coding conventions
- Use Vue Composition API with `<script setup>` for new/edited SFCs.
- Prefer existing patterns and utilities in `src/` rather than introducing new ones.
- Keep edits minimal and localized to the requested change.

## Commands
- Dev server: `bun dev`
- Build: `bun run build`
- Lint: `bun run lint`
- Typecheck: `bun run tsc`

## Notes
- Avoid adding new dependencies unless explicitly requested.
- If unsure about UX or product behavior, ask before changing UI flows.
</INSTRUCTIONS>
