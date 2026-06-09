import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
import { resolveExportFilterDescriptors } from '../../utils/resolveExportFilterDescriptors'
import { irmContactExportFilterConfig } from './irmContactExportFilterConfig'

export const IRM_CONTACT_EXPORT_FILTER_DESCRIPTORS = resolveExportFilterDescriptors(
  INVESTMENT_CONTACT_DESCRIPTORS,
  irmContactExportFilterConfig
)
