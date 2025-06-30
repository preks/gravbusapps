---
trigger: always_on
---

# Data Querying
- Everytime GraphQL data querying is needed, use the newwork-graphql-mcp plugin and use the `useGraphQLClient` hook from `src/common/network/graphql`.
- Each GraphQL query must be stored in a single TypeScript file in the `queries` folder of the component.
- Each GraphQL query must be named in camelCase and must be exported as a named export.
- Whenever GraphQL requests are used, make use of offsets and limits with a value of 20 for limits.
- Whenever Catalog requests are used, make use of limits with a value of 20.

- For Graphql API requests, use src\common\network\graphql\useGraphQLClient.ts. Analyze the file first, and its dependency.
- For REST API requests, use src\common\network\rest\useRestClient.ts. Analyze the file first, and its dependency.
- For all API requests to a service, check if already exists in src\common\network, or create a new folder for that entity type. Example: `src\common\network\catalog-entry`, `src\common\network\expense-plan` folders, named in camelCase, and exported as named exports.
- If the API request is REST, use a singleton client class that extends RestClient. Example: src\common\network\catalogs\CatalogManagerClient.ts
- In the singleton client REST class, the URL key is in the `.env` file. Example: `env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')`, NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT is in `.env`.
- For all API requests, make sure accessToken exists.

- Do not generate mocked data. Instead, use the existing clients in `src/common/network` to integrate real data.
- For all API requests, make sure accessToken exists.
- Never use hardcoded base URLs like "https://newwork-dev.newwork.com/<rest_of_the_base_url>". Always use `env` from '@/common/env/EnvUtils'.
- If a base URL does not exist, make sure to add it to the .env file, use `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_API_SERVER` for the host part and concatenate the URL path in a new variable.