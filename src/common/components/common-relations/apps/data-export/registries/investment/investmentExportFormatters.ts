import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { formatExportText } from '../../utils/exportFormatHelpers'

export function formatInvestmentLinkedAccount(investment: Investment): string {
  const associations = investment.investmentAccounts ?? []
  if (associations.length === 0) {
    return '-'
  }
  if (associations.length > 1) {
    return 'Multiple'
  }
  return formatExportText(associations[0]?.investmentAccount?.name)
}
