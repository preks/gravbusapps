/**
 * IRM-specific wrapper for useGenericContactsStaticData
 * Uses Investment entity names
 */
import { useGenericContactsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export type { ContactsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const IRM_CONTACTS_CONFIG = {
  contactEntity: 'InvestmentContact',
  accountEntity: 'InvestmentAccount'
}

export const useContactsStaticData = (accessToken: string) => {
  return useGenericContactsStaticData(accessToken, IRM_CONTACTS_CONFIG)
}
