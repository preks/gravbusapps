/**
 * Investment-group catalog utilities: GraphQL query, code normalization, and
 * the entity-type → catalog-code derivation used when a config does not
 * provide an explicit `investmentGroupCodeHint`.
 */

export const GET_INVESTMENT_GROUP_BY_CODE_QUERY = `
  query GetInvestmentGroupByCode($groupCode: String!) {
    groups: CatalogEntry(
      where: {
        catalog: {identifier: {_eq: "InvestmentGroup"}, version: {_eq: "v1"}}
        isDeleted: {_eq: false}
        _or: [{code: {_eq: $groupCode}}, {value: {_eq: $groupCode}}]
      }
      limit: 1
    ) {
      id
      code
      value
    }
  }
`

export type InvestmentGroupCatalogResponse = {
  groups: Array<{ id: string; code?: string; value?: string }>
}

export function toNormalizedInvestmentGroupCode(value: string): string {
  const codeWithoutPrefix = value.replace(/^InvestmentGroup:v\d+:/i, '')
  return codeWithoutPrefix.trim().replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase()
}

export function deriveInvestmentGroupCodeFromEntityType(entityType: string): string | undefined {
  if (!entityType.endsWith('-investment')) return undefined
  const codePart = entityType.replace(/-investment$/, '')
  if (!codePart) return undefined
  return codePart.replace(/-/g, '_').toUpperCase()
}
