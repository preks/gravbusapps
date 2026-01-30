import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { ChangeLogEntry as ChangeLogEntryType } from '../../ChangeLogTab'
import { getFieldCategories } from './constants'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'

interface ChangeLogEntryProps {
  entry: ChangeLogEntryType
}

// FIELD_CATEGORIES imported from constants

export const ChangeLogEntry: React.FC<ChangeLogEntryProps> = ({ entry }) => {
  if (!entry.isVisible) return null

  // Compute categories at runtime using useMemo to avoid module-level initialization
  const fieldCategories = useMemo(() => getFieldCategories(), [])
  const categoryInfo = fieldCategories.find(cat => cat.value === entry.fieldCategory)

  const [open, setOpen] = React.useState(false)

  const safeFormatDate = (value: string | Date, format: string = 'date.short') => {
    const formatted = formatDate(new Date(value), format) as string
    return typeof formatted === 'string' && formatted.includes('T') ? new Date(value).toLocaleDateString() : formatted
  }

  return (
    <>
      <div
        className="gba:h-full gba:bg-card gba:text-card-foreground gba:border gba:border-border gba:rounded-lg gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:overflow-hidden gba:cursor-pointer"
        data-testid={`change-log-card-${entry.id}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
      >
        <div className="gba:p-4">
          <div className="gba:flex gba:justify-between gba:items-start">
            <div className="gba:flex-1">
              <h4 className="gba:font-bold gba:text-base gba:mb-1">{entry.fieldName}</h4>
              <div className="gba:text-sm gba:text-muted-foreground">{categoryInfo?.label}</div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {entry.changeOrigin.isAIGenerated && (
                <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground">
                  AI
                </span>
              )}
              <span className="gba:text-sm gba:text-muted-foreground">
                {safeFormatDate(entry.timestamp, 'date.short')}
              </span>
            </div>
          </div>
          <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.created_by', 'Created by')}{' '}
            {entry.changedBy.userName || entry.changedBy.userId}
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="gba:w-[400px] gba:max-w-[400px] gba:sm:max-w-[400px] gba:p-0 gba:flex gba:flex-col"
          data-testid={`hr-changelog-details-${entry.id}`}
        >
          <SheetHeader className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <SheetTitle>{entry.fieldName}</SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-auto gba:px-6 gba:py-4">
            <div className="gba:space-y-4">
              <div className="gba:space-y-3">
                {(() => {
                  const channel = entry.channelName || (entry.fieldDetail || '').replace(/^Channel:\s*/i, '')
                  return channel ? (
                    <div className="gba:py-2 gba:px-1">
                      <p className="gba:text-base gba:font-semibold gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.channel', 'Channel')}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">{channel}</p>
                    </div>
                  ) : null
                })()}
                <div className="gba:py-2 gba:px-1">
                  <p className="gba:text-base gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.group_by.category', 'Category')}
                  </p>
                  <p className="gba:text-sm gba:text-foreground">{categoryInfo?.label || '-'}</p>
                </div>
                <div className="gba:py-2 gba:px-1">
                  <p className="gba:text-base gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.timestamp', 'Timestamp')}
                  </p>
                  <p className="gba:text-sm gba:text-foreground">{safeFormatDate(entry.timestamp, 'date.short')}</p>
                </div>
                <div className="gba:py-2 gba:px-1">
                  <p className="gba:text-base gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.created_by', 'Created by')}
                  </p>
                  <p className="gba:text-sm gba:text-foreground">
                    {entry.changedBy.userName || entry.changedBy.userId}
                  </p>
                </div>
                <div className="gba:py-2 gba:px-1">
                  <p className="gba:text-base gba:font-semibold gba:text-foreground">Flow</p>
                  <p className="gba:text-sm gba:text-foreground">{entry.changeOrigin.flowName}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ChangeLogEntry
