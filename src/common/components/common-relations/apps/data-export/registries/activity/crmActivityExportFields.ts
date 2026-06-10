import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import { buildCommonActivityExportFields } from './commonActivityExportFields'

export function buildCrmActivityExportFields() {
  return buildCommonActivityExportFields<CustomerActivity>()
}
