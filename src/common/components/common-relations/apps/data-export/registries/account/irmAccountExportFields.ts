import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { buildCommonAccountExportFields } from './commonAccountExportFields'

export function buildIrmAccountExportFields() {
  return buildCommonAccountExportFields<InvestmentAccount>()
}
