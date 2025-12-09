/**
 * CRM-specific wrapper for useGenericContactsOverTime
 * Uses CRM entity names
 */
import {
  useGenericContactsOverTime,
  type ContactsOverTimePoint,
  type ContactsTimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const useContactsOverTime = (accessToken: string, selectedTimeFilter: ContactsTimeFilter) => {
  const CRM_CONTACTS_OVER_TIME_CONFIG = {
    contactEntity: 'Contact'
  }

  return useGenericContactsOverTime(accessToken, selectedTimeFilter, CRM_CONTACTS_OVER_TIME_CONFIG)
}

export { useContactsOverTime, type ContactsOverTimePoint, type ContactsTimeFilter }
