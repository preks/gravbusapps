import React from 'react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { ChangeLogEntry as ChangeLogEntryType } from '../../ChangeLogTab'
import { FIELD_CATEGORIES } from './constants'

interface ChangeLogEntryProps {
  entry: ChangeLogEntryType
}

// FIELD_CATEGORIES imported from constants

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
              {entry.fieldDetail && <div className="gba:text-sm gba:text-muted-foreground">{entry.fieldDetail}</div>}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {entry.changeOrigin.isAIGenerated && (
                <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground">
                  AI
                </span>
              )}
              <span className="gba:text-sm gba:text-muted-foreground">
                {formatDate(new Date(entry.timestamp), 'date.short')}
              </span>
            </div>
          </div>

          {/* Values */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.previous_value', 'Previous Value')}
              </div>
              <div className="gba:mt-1 gba:text-sm gba:bg-muted gba:text-muted-foreground gba:p-3 gba:rounded">
                {entry.isMasked
                  ? getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.hidden', 'Hidden for privacy')
                  : entry.previousValue ||
                    getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.common.not_available', 'N/A')}
              </div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.new_value', 'New Value')}
              </div>
              <div className="gba:mt-1 gba:text-sm gba:bg-success-secondary gba:text-success-secondary-foreground gba:p-3 gba:rounded">
                {entry.isMasked
                  ? getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.hidden', 'Hidden for privacy')
                  : entry.newValue ||
                    getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.common.not_available', 'N/A')}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="gba:mt-4 gba:flex gba:justify-between gba:items-center gba:text-sm gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-3">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.created_by', 'Created by')}{' '}
              {entry.changedBy.userName || entry.changedBy.userId}
            </div>
            <span className="gba:text-xs">FLOW: {entry.changeOrigin.flowName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangeLogEntry
