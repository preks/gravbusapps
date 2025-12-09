/**
 * CRM-specific wrapper for useGenericContactsStaticData
 * Uses CRM entity names
 */
import { useGenericContactsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const CRM_CONTACTS_CONFIG = {
  contactEntity: 'Contact',
  accountEntity: 'Account'
}

const useContactsStaticData = (accessToken: string) => {
  return useGenericContactsStaticData(accessToken, CRM_CONTACTS_CONFIG)
}

export { useContactsStaticData }
export type { ContactsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
