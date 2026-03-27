/**
 * Maps catalog investment group codes to `useInvestments` fragment/config keys
 * so list queries fetch the right fields and aggregates (e.g. equity EBITDA).
 */
export function investmentListQueryConfigForGroup(groupCode: string): string {
  switch (groupCode) {
    case 'EQUITY':
      return 'equity'
    case 'REAL_ESTATE':
      return 'realEstate'
    case 'LIQUID_FUND':
      return 'liquidFund'
    default:
      return 'list'
  }
}
