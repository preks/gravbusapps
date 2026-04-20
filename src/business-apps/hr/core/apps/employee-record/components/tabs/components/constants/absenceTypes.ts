import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Configuration for absence types available in the context menu
 * These are the fixed list of absence types that can be created via right-click
 */
export interface AbsenceTypeConfig {
  id: string
  name: string
  flowType: string
}

/**
 * Fixed list of absence types to show in context menu
 * Moved outside component to avoid recreating on every render
 */
export const AVAILABLE_ABSENCE_TYPES: AbsenceTypeConfig[] = [
  {
    id: 'AbsenceType:v1:A001',
    name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_vacation', 'Request Vacation'),
    flowType: 'vacation'
  },
  {
    id: 'AbsenceType:v1:A021',
    name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.report_sick_leave', 'Report Sick Leave'),
    flowType: 'sickLeave'
  },
  {
    id: 'AbsenceType:v1:A050',
    name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_special_leave', 'Request Special Leave'),
    flowType: 'specialLeave'
  },
  {
    id: 'AbsenceType:v1:A170',
    name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_work_leave', 'Request Work Leave'),
    flowType: 'workLeave'
  }
]
