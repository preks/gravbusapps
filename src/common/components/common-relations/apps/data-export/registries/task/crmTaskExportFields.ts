import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import { buildCommonTaskExportFields } from './commonTaskExportFields'

export function buildCrmTaskExportFields() {
  return buildCommonTaskExportFields<CustomerTask>()
}
