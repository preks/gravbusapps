export const getAbsenceTypes = `
  query GetAbsenceTypes($activeUserLocale: String!, $parentEntryId: String!) {
    CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "AbsenceType" } },
        parentEntryId: { _eq: $parentEntryId }
      }
      orderBy: { value: ASC }
    ) {
      id
      parentEntryId
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
        localeCode
      }
    }
  }
`;
