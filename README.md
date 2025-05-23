# Vite + React + Tailwind CSS + Ant Design + Remix Icon

This project is a modern React application built with the following technologies:

## Technologies Used

- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Ant Design](https://ant.design/) - A design system for enterprise-level products
- [Remix Icon](https://github.com/Remix-Design/RemixIcon) - Open source neutral style icon system

## Getting Started

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
npm run publish:screen -- <product>/<path-to-screen>/<screen-name>
```

**Examples:**

```bash
# Publish the LeadOverview screen from the IRM product
# (Ensure .env is configured with AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN)
npm run publish:screen -- irm/overview-screens/LeadOverview

# Publish the OpportunityDetail screen from the CRM product
npm run publish:screen -- crm/detail-screens/OpportunityDetail
```


## Project Structure

- `dev/` - Development files
  - `nw-envs.js` - Development environment variables
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

Import `graphQLClient` from `src/common/network/graphql/GraphQLClient`.

```typescript
import { graphQLClient } from "src/common/network/graphql/GraphQLClient";
```

Use `graphQLClient` to query data.

```typescript
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
const data = await graphQLClient.request(accessToken, query, variables);
```

### Query Catalog Data

Import `catalogManagerClient` from `src/common/network/catalogs/CatalogManagerClient`.

```typescript
import { catalogManagerClient } from "src/common/network/catalogs/CatalogManagerClient";
```

Use `catalogManagerClient` to query data.

```typescript
const data = await catalogManagerClient.getCatalogEntriesList(accessToken, { catalogIdentifier: 'AbsenceType', version: 'v1' });
```

```typescript
const data = await catalogManagerClient.getCatalogs(accessToken);
```

### Query Flow Registry Data

Import `flowRegistryClient` from `src/common/network/flows/FlowRegistryClient`.

```typescript
import { flowRegistryClient } from "src/common/network/flows/FlowRegistryClient";
```

Use `flowRegistryClient` to query data.

```typescript
const data = await flowRegistryClient.getPermissionFlowItemsV1(accessToken, { contexts: ['employeeEntity', 'expenseItems'] });
```

```typescript
const data = await flowRegistryClient.getPermissionFlowItemsV2(accessToken, { contexts: [{ contextName: 'employeeEntity', mainContextDataId: 'id1' }, { contextName: 'expenseItems', mainContextDataId: 'id2' }] });
```

```typescript
const data = await flowRegistryClient.getMainContextData(accessToken, { contextNames: ['employeeEntity', 'expenseItems'] });
```