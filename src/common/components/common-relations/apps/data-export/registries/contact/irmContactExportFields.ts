import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { buildCommonContactExportFields } from './commonContactExportFields'
import { buildPortalUserIdExportField } from '../../utils/exportExternalIdFieldBuilders'

export function buildIrmContactExportFields(): ExportFieldDefinition<InvestmentContact>[] {
  return [...buildCommonContactExportFields<InvestmentContact>(), buildPortalUserIdExportField<InvestmentContact>()]
}
