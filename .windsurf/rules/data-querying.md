---
trigger: always_on
---

# Data Querying
- Everytime GraphQL data querying is needed, use the newwork-graphql-mcp plugin and use the `useGraphQLClient` hook from `src/common/network/graphql`.
- Each GraphQL query must be stored in a single TypeScript file in the `queries` folder of the component.
- Each GraphQL query must be named in camelCase and must be exported as a named export.
- Whenever a GraphQL is used, make use of offsets and limits with a value of 20 for limits.

- Everytime catalogs querying is needed, use the `useCatalogManagerClient` hook from `src/common/network/catalogs`.
- Everytime files querying and upload is needed, use the `useFileClient` hook from `src/common/network/files`.
- Everytime flows or flows registries are needed, use the `useFlowRegistryClient` hook from `src/common/network/flows`.
- When none of the provided catalogs, files, flows or graphql clients in `src/common/network` are matching, use the `useRestClient` hook from `src/common/network/rest`.

- Do not generate mocked data. Instead, use the existing client in `src/common/network` to integrate real data.