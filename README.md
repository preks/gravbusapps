# Vite + React + Tailwind CSS + Ant Design + Remix Icon

This project is a modern React application built with the following technologies:

## Technologies Used

- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Ant Design](https://ant.design/) - A design system for enterprise-level products
- [Remix Icon](https://github.com/Remix-Design/RemixIcon) - Open source neutral style icon system

## Getting Started

### Windsurf Setup

1. Install Windsurf from [here](https://www.windsurf.io/)
2. Follow description from https://newwork.atlassian.net/wiki/spaces/CORE/pages/4474601491/Windsurf+Development+Workspace+Setup+Guide
3. To allow local requests like GraphQL, see https://newwork.atlassian.net/wiki/spaces/PSM/pages/4513234959/How+to+allow+Queries+to+execute+locally

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Cursor AI Rules

This project uses the `@newwork/cursor-rules` package for centralized AI rules and team commands.

### Automatic Sync

Rules are automatically synced from `@newwork/cursor-rules` on `npm install` via the package's own postinstall hook.
This repo's `postinstall` only configures Git hooks via `newwork-git-hooks`.

### Configuration

Rule configuration is in `cursor-rules.config.cjs`:

- **Preset ID**: `business-apps`
- **Subscriptions**: `base`, `react`, `typescript`, `api`, `process`, `remote`, `crm`, `hr`, `fin`
- **Tailwind Prefix**: `gba:`
- **Design System**: `@newwork/nw-design-system`

### Available Commands

```bash
# Manually sync rules from package
npm run rules:sync

# Validate rule configuration
npm run rules:validate

# Show differences between local and package versions
npm run rules:diff
```

### Team Commands in Cursor

The following commands are available in Cursor IDE:

- `/pr` - Generate PR description from changes
- `/ticket` - Create Jira ticket from conversation
- `/commit` - Generate conventional commit message
- `/review` - Get code review feedback

### Documentation

- **Migration Guide**: [docs/cursor-rules-migration.md](./docs/cursor-rules-migration.md)
- **Archive**: [.cursor-archive/README.md](./.cursor-archive/README.md)
- **Package Documentation**: `node_modules/@newwork/cursor-rules/README.md`

### Generated Files (Gitignored)

The following directories are auto-generated and should NOT be committed:

- `.cursor/rules/base/` - Core rules from package
- `.cursor/rules/required/` - Required patterns
- `.cursor/rules/guidance/` - Best practice guidance
- `.cursor/rules/filters/` - Filter system rules
- `.cursor/rules/modules/` - Domain-specific rules (CRM, HR, FIN, MDM, IRM)
- `.cursor/commands/` - Team commands (pr, ticket, commit, review)

### Publish a Single Screen to Dev

**Usage:**

```bash
npm run publish:screen -- /<product>/<path-to-screen>/<screen-name> [options]
```

**Options:**

- `--resource` or `-r`: Resource URL mode - enables prompts for creating resource URLs (by default, direct publishing without prompts)

**Examples:**

```bash
# Publish the LeadOverview screen from the IRM product
# (Ensure .env is configured with AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN)
npm run publish:screen -- /irm/overview-screens/LeadOverview

# Publish the OpportunityRecord screen from the CRM product
npm run publish:screen -- /crm/detail-screens/OpportunityRecord

# Publish with resource URL prompts enabled for the EmployeeDirectory screen
npm run publish:screen -- /hr/employee-screens/EmployeeDirectory --resource

# Publish with resource URL prompts using the short flag
npm run publish:screen -- /hr/employee-screens/EmployeeDirectory -r
```

### Publish All Screens to Dev

**Usage:**

```bash
npm run publish:all:screens
```

This command will discover and publish ALL screens in the repository to the dev environment.

**Supported Screen Types:**

- 📱 **Apps** (`**/apps/*/index.ts`) - Main application screens
- 📝 **Forms** (`**/forms/*/index.ts`) - Form screens for workflows
- 🪟 **Popups** (`**/popups/*/index.ts`) - Modal/popup screens
- 📄 **Records** (`**/records/*/index.ts`) - Record detail screens

For more details about screen types, see [Supported Screen Types](./docs/supported-screen-types.md).

### Publish to Production

#### Via Bitbucket Pipeline (Recommended)

Production publishing is typically done through Bitbucket Pipelines:

1. **Automatic Publishing** (on merge to `main`): Only changed screens are published
2. **Manual Publishing with Specific Screens**:
   - Go to Pipelines → Run pipeline → `publish-manual-prod`
   - Set `SCREENS_TO_PUBLISH` to a comma-separated list
3. **Manual Publishing of ALL Screens**:
   - Go to Pipelines → Run pipeline → `publish-manual-prod`
   - Set `PUBLISH_ALL_SCREENS` to `true`
   - See [Publishing All Screens to Production](./docs/publish-all-screens-to-prod.md) for details

#### Local Testing (Requires Production Credentials)

```bash
# Test publishing all screens to production locally
npm run publish:prod:all
```

**⚠️ Warning:** Local production publishing requires all production environment variables to be configured in your `.env` file.

For detailed information about production publishing options, see:

- [Publishing All Screens to Production](./docs/publish-all-screens-to-prod.md)
- [Production Deployment Comprehensive Sync](./docs/production-deployment-comprehensive-sync.md)

## Project Structure

- `src/` - Source files
  - `business-apps/` - Business applications
    - `<product>/` - Product
      - `<category>/` - Category
        - `<screen-name>/` - Screen name
          - `index.ts` - Screen component
  - `common/` - Common components or utilities
    - `env/` - Environment variables utilities
    - `network/` - Network utilities
- `public/` - Public static files
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `vite.config.js` - Vite configuration
- `scripts/` - Script files

## How To

### Query GraphQL Data

Import `useGraphqlClient` from `@/common/network/graphql/useGraphQLClient`.

```typescript
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
```

Use `useGraphqlClient` to query data.

```typescript
const client = useGraphqlClient(accessToken)
const query = `query getManagers($searchRegex: String!, $limit: Int!, $offset: Int!) {
    EmployeePosition(
      where: {
        supervisor: {
          _or: [
            { firstName: { _iregex: $searchRegex } }
            { lastName: { _iregex: $searchRegex } }
          ]
        }
      }
      distinctOn: supervisorEmployeeId
      limit: $limit
      offset: $offset
    ) {
      supervisor {
        employeeId: id
        firstName
        lastName
      }
    }
  }
  `

const variables = { searchRegex: '', limit: 5, offset: 0 }
const data = await client.request(query, variables)
```

### Query Catalog Data

Import `useCatalogManagerClient` from `@/common/network/catalogs/useCatalogManagerClient`.

```typescript
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
```

Use `useCatalogManagerClient` to query data.

```typescript
const client = useCatalogManagerClient(accessToken)
const data = await client.getCatalogEntriesList({ catalogIdentifier: 'AbsenceType', version: 'v1' })
```

```typescript
const data = await client.getCatalogs()
```

### Query Flow Registry Data

Import `useFlowRegistryClient` from `@/common/network/flows/useFlowRegistryClient`.

```typescript
import { useFlowRegistryClient } from '@/common/network/flows/useFlowRegistryClient'
```

Use `useFlowRegistryClient` to query data.

```typescript
const client = useFlowRegistryClient(accessToken)
const data = await client.getPermissionFlowItemsV1({ contexts: ['employeeEntity', 'expenseItems'] })
```

```typescript
const data = await client.getPermissionFlowItemsV2({
  contexts: [
    { contextName: 'employeeEntity', mainContextDataId: 'id1' },
    { contextName: 'expenseItems', mainContextDataId: 'id2' }
  ]
})
```

```typescript
const data = await client.getMainContextData({ contextNames: ['employeeEntity', 'expenseItems'] })
```
