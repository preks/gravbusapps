export const getAbsenceGroups = `
  query GetAbsenceGroups($activeUserLocale: String!) {
    CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "AbsenceGroup" } } }
      orderBy: { value: ASC }
    ) {
      id
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
        localeCode
      }
    }
  }
`
