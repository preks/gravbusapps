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
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
```

Use `useGraphqlClient` to query data.

```typescript
  const client = useGraphqlClient(accessToken);
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
  `;
    
const variables = { searchRegex: "", limit: 5, offset: 0 };
const data = await client.request(query, variables);
```

### Query Catalog Data

Import `useCatalogManagerClient` from `@/common/network/catalogs/useCatalogManagerClient`.

```typescript
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
```

Use `useCatalogManagerClient` to query data.

```typescript
const client = useCatalogManagerClient(accessToken);
const data = await client.getCatalogEntriesList({ catalogIdentifier: 'AbsenceType', version: 'v1' });
```

```typescript
const data = await client.getCatalogs();
```

### Query Flow Registry Data

Import `useFlowRegistryClient` from `@/common/network/flows/useFlowRegistryClient`.

```typescript
import { useFlowRegistryClient } from "@/common/network/flows/useFlowRegistryClient";
```

Use `useFlowRegistryClient` to query data.

```typescript
const client = useFlowRegistryClient(accessToken);
const data = await client.getPermissionFlowItemsV1({ contexts: ['employeeEntity', 'expenseItems'] });
```

```typescript
const data = await client.getPermissionFlowItemsV2({ contexts: [{ contextName: 'employeeEntity', mainContextDataId: 'id1' }, { contextName: 'expenseItems', mainContextDataId: 'id2' }] });
```

```typescript
const data = await client.getMainContextData({ contextNames: ['employeeEntity', 'expenseItems'] });
```