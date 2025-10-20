import React from 'react'
import { format } from 'date-fns'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ChangeLogEntry as ChangeLogEntryType } from './ChangeLogTab'

interface ChangeLogEntryProps {
  entry: ChangeLogEntryType
}

const FIELD_CATEGORIES = [
  { value: 'personal', label: getTranslationFromI18nKeyAndLabel('changelog.categories.personal', 'Personal Info') },
  { value: 'address', label: getTranslationFromI18nKeyAndLabel('changelog.categories.address', 'Address & Contact') },
  { value: 'org', label: getTranslationFromI18nKeyAndLabel('changelog.categories.org', 'Org Assignment') },
  { value: 'working', label: getTranslationFromI18nKeyAndLabel('changelog.categories.working', 'Working Conditions') },
  { value: 'financial', label: getTranslationFromI18nKeyAndLabel('changelog.categories.financial', 'Financial') },
  { value: 'skills', label: getTranslationFromI18nKeyAndLabel('changelog.categories.skills', 'Skills & Capabilities') },
  {
    value: 'performance',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.performance', 'Performance & Goals')
  },
  {
    value: 'absence',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.absence', 'Absence Entitlements')
  },
  {
    value: 'emergency',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.emergency', 'Emergency Contacts')
  }
]

export const ChangeLogEntry: React.FC<ChangeLogEntryProps> = ({ entry }) => {
  if (!entry.isVisible) return null

  const categoryInfo = FIELD_CATEGORIES.find(cat => cat.value === entry.fieldCategory)

  return (
    <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:mb-4">
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-5 gba:h-5 gba:bg-blue-500 gba:rounded"></div>
          <div>
            <h4 className="gba:font-medium gba:text-gray-900 gba:m-0">{entry.fieldName}</h4>
            <p className="gba:text-sm gba:text-gray-500 gba:m-0">{categoryInfo?.label}</p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {entry.changeOrigin.isAIGenerated && (
            <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-purple-100 gba:text-purple-800">
              AI
            </span>
          )}
          {entry.changeOrigin.isSystemGenerated && (
            <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-gray-100 gba:text-gray-800">
              Systems
            </span>
          )}
        </div>
      </div>

      <div className="gba:mt-4 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <div>
          <label className="gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('changelog.labels.previous_value', 'Previous Value')}
          </label>
          <p className="gba:text-sm gba:text-gray-900 gba:bg-gray-50 gba:p-2 gba:rounded gba:mt-1">
            {entry.isMasked
              ? getTranslationFromI18nKeyAndLabel('changelog.privacy.hidden', 'Hidden for privacy')
              : entry.previousValue || getTranslationFromI18nKeyAndLabel('changelog.common.not_available', 'N/A')}
          </p>
        </div>
        <div>
          <label className="gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('changelog.labels.new_value', 'New Value')}
          </label>
          <p className="gba:text-sm gba:text-gray-900 gba:bg-green-50 gba:p-2 gba:rounded gba:mt-1">
            {entry.isMasked
              ? getTranslationFromI18nKeyAndLabel('changelog.privacy.hidden', 'Hidden for privacy')
              : entry.newValue || getTranslationFromI18nKeyAndLabel('changelog.common.not_available', 'N/A')}
          </p>
        </div>
      </div>

      <div className="gba:mt-4 gba:flex gba:justify-between gba:items-center gba:text-sm gba:text-gray-500">
        <div className="gba:flex gba:items-center gba:gap-4">
          <span>
            {getTranslationFromI18nKeyAndLabel('changelog.labels.changed_by', 'Changed by')}: {entry.changedBy.userName}
          </span>
          <span>•</span>
          <span>{format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}</span>
        </div>
        <span className="gba:text-xs">FLOW: {entry.changeOrigin.flowName}</span>
      </div>
    </div>
  )
}

export default ChangeLogEntry
