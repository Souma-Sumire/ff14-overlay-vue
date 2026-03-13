## Resource Structure

`src/resources` is split by responsibility:

- `generated/`
  - Script outputs only (both `.json` and `.ts`)
  - Do not edit by hand
  - Regenerate via `vp run generate` or specific `generate:*` scripts
- `logic/`
  - Resource-related resolver/normalization logic
  - No large static datasets
- root (`src/resources/*.ts` / selective `.json`)
  - Hand-maintained domain data and light wrappers

### Rules

1. New bake outputs should go to `src/resources/generated/`.
2. New resource helper logic should go to `src/resources/logic/`.
3. Keep root focused on stable domain definitions and public entry points.
