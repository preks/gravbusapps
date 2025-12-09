/**
 * IRM-specific wrapper for useGenericContactsOverTime
 * Uses Investment entity names
 */
import {
  useGenericContactsOverTime,
  type ContactsTimeFilter,
  type ContactsOverTimePoint
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export type TimeFilter = ContactsTimeFilter

export interface UseContactsOverTimeProps {
  accessToken: string
  timeFilter?: TimeFilter
}

const useContactsOverTime = ({ accessToken, timeFilter = 'quarter' }: UseContactsOverTimeProps) => {
  const IRM_CONTACTS_OVER_TIME_CONFIG = {
    contactEntity: 'InvestmentContact'
  }

  return useGenericContactsOverTime(accessToken, timeFilter, IRM_CONTACTS_OVER_TIME_CONFIG)
}

export { useContactsOverTime, type ContactsOverTimePoint }
