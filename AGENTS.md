# AGENTS.md

## Cursor Cloud specific instructions

This is a purely client-side React + Vite application (Dutch Tax Simulator / "NettoSim"). There is no backend, database, or external service dependency.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Vite dev server | `npm run dev` | Serves on port 5173 by default. Add `-- --host 0.0.0.0` for remote access. |

### Available scripts

See `package.json` for all scripts: `dev`, `build`, `lint`, `preview`.

### Caveats

- **Lint errors are pre-existing**: `npm run lint` currently reports `react-hooks/static-components` errors because several components are defined inside render functions. These are not blockers for build or runtime.
- **Vite 8 beta**: The project pins `vite@^8.0.0-beta.13`. The `overrides` field in `package.json` enforces this version for all transitive deps.
- **No test framework**: There is no test runner configured (no Jest, Vitest, etc.). Only lint and build checks are available.
