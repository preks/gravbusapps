# Remote platform setup bundles

Several Gravity Business Apps Vite entries ship as CDN remote bundles and are registered in screen management by fixed **screen keys** (not derived from the URL path).

| Screen key | Vite entry folder (`src/business-apps/...`) | Typical `formDefinition.componentPath` in screen management |
| ---------- | ------------------------------------------- | ----------------------------------------------------------- |
| `url_setup` | `platform/apps/setup` | `platform/apps/setup` (maps to `screens/platform/apps/setup/index.js` on CDN). Platform route `/platform/setup`. |
| `url_setup-add-employees` | `platform/apps/setup-add-employees` | `platform/apps/setup-add-employees`. Platform route `/platform/setup-add-employees`. |
| `url_people` | `platform/apps/people` | `platform/apps/people`. Platform route `/platform/people` (or the URL your screen management entry uses). |

## Bitbucket / pipeline

Use the existing **master** pipeline that publishes remote screens: build output follows `screens/<componentPath>/index.js` (see repository `publish:*` scripts and Bitbucket automation). Register each entry in screen management with `builderType` **Native** and `componentPath` aligned with the Vite output folder names above. After adding a new entry, run the usual hash / bundle dependency update flow so `component-hashes.json` (and pipeline bundle metadata) stay in sync.

## Environment variables (remote bundle builds)

Mirror gravity-platform `.env.development` / deployment env for API calls from the browser:

- **Platform host** — remote bundles cannot use relative `fetch('/api/...')` from a CDN origin; the setup app resolves the tenant platform base URL (same pattern as `serviceResolver` / `NEXT_PUBLIC_*` URLs in this repo).
- `NEXT_PUBLIC_ORGCHART_API_URL`
- `NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT`
- `NEXT_PUBLIC_USER_MANAGEMENT_API`
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK` (Hasura; required for `setup-add-employees` and `people` org/company queries from the browser)

Configure these for the pipeline or `.env` used when building the `platform/apps/*` entries.

## Localization and UI

- **Fluent (`*.ftl`)** — copy for each entry lives under that entry’s `_i18n/` folder (`en-US.ftl`, `de-DE.ftl`, `ro-RO.ftl`) and is consumed via `useTranslation` from `@newwork/nw-design-system` (same pattern as other business apps). The remote loader already wraps entries with `LocalizationProvider`.
- **Components** — these bundles use `@newwork/nw-design-system` (Button, Input, Select, Card, Spinner, Dialog, Tabs, etc.), not `@newwork/gravity-ui-catalog`.
