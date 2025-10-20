import React from 'react'
import { format } from 'date-fns'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ChangeLogEntry as ChangeLogEntryType } from './ChangeLogTabSimple'

interface ChangeLogEntryProps {
  entry: ChangeLogEntryType
  accessToken: string
  currentUserId?: string
  currentEmployeeId?: string
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

  // Accent color currently unused (kept for future design options)

  return (
    <div
      className="gba:h-full gba:bg-card gba:text-card-foreground gba:border gba:border-border gba:rounded-lg gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:overflow-hidden"
      data-testid={`change-log-card-${entry.id}`}
      style={{ background: 'var(--nw-color-white)' }}
    >
      {/* Accent bar on top */}
      <div className="gba:relative">
        <div className="gba:p-6">
          {/* Header */}
          <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
            <div className="gba:flex-1">
              <h4 className="gba:font-bold gba:text-xl gba:mb-1">{entry.fieldName}</h4>
              <div className="gba:text-sm gba:text-muted-foreground">{categoryInfo?.label}</div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {entry.changeOrigin.isAIGenerated && (
                <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground">
                  AI
                </span>
              )}
              <span className="gba:text-sm gba:text-muted-foreground">
                {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>

          {/* Values */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('changelog.labels.previous_value', 'Previous Value')}
              </div>
              <div className="gba:mt-1 gba:text-sm gba:bg-muted gba:text-muted-foreground gba:p-3 gba:rounded">
                {entry.isMasked
                  ? getTranslationFromI18nKeyAndLabel('changelog.privacy.hidden', 'Hidden for privacy')
                  : entry.previousValue || getTranslationFromI18nKeyAndLabel('changelog.common.not_available', 'N/A')}
              </div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('changelog.labels.new_value', 'New Value')}
              </div>
              <div className="gba:mt-1 gba:text-sm gba:bg-success-secondary gba:text-success-secondary-foreground gba:p-3 gba:rounded">
                {entry.isMasked
                  ? getTranslationFromI18nKeyAndLabel('changelog.privacy.hidden', 'Hidden for privacy')
                  : entry.newValue || getTranslationFromI18nKeyAndLabel('changelog.common.not_available', 'N/A')}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="gba:mt-4 gba:flex gba:justify-between gba:items-center gba:text-sm gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-3">
              Created By {entry.changedBy.userName || entry.changedBy.userId}
            </div>
            <span className="gba:text-xs">FLOW: {entry.changeOrigin.flowName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangeLogEntry
