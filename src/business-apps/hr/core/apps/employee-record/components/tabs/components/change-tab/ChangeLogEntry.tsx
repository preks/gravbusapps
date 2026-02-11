import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { ChangeLogEntry as ChangeLogEntryType } from '../../ChangeLogTab'
import { getFieldCategories } from './constants'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemFooter
} from '@newwork/nw-design-system'

interface ChangeLogEntryProps {
  entry: ChangeLogEntryType
}

// FIELD_CATEGORIES imported from constants

export const ChangeLogEntry: React.FC<ChangeLogEntryProps> = ({ entry }) => {
  // Compute categories at runtime using useMemo to avoid module-level initialization
  // Must be called before any conditional returns to comply with Rules of Hooks
  const fieldCategories = useMemo(() => getFieldCategories(), [])
  const categoryInfo = fieldCategories.find(cat => cat.value === entry.fieldCategory)

  if (!entry.isVisible) return null

  const [open, setOpen] = React.useState(false)

  const safeFormatDate = (value: string | Date, format: string = 'date.short') => {
    const formatted = formatDate(new Date(value), format) as string
    return typeof formatted === 'string' && formatted.includes('T') ? new Date(value).toLocaleDateString() : formatted
  }

  return (
    <>
      <Item variant="muted" size="sm" asChild>
        <button
          onClick={() => setOpen(true)}
          className="gba:text-left gba:h-full"
          data-testid={`change-log-card-${entry.id}`}
        >
          <ItemContent>
            <ItemTitle>{entry.fieldName}</ItemTitle>
            <ItemDescription>{categoryInfo?.label}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
              {entry.changeOrigin.isAIGenerated && (
                <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground">
                  AI
                </span>
              )}
              <span className="gba:text-xs gba:text-muted-foreground">
                {safeFormatDate(entry.timestamp, 'date.short')}
              </span>
            </div>
          </ItemActions>
          <ItemFooter>
            <span className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.created_by', 'Created by')}{' '}
              {entry.changedBy.userName || entry.changedBy.userId}
            </span>
          </ItemFooter>
        </button>
      </Item>

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
