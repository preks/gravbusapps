import React from 'react'
import { Button, Checkbox, ScrollArea, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import { InternalCalendarType, type ExternalCalendarSource, type InternalCalendarSummary } from '../types'
import { CalendarRowMenu } from './CalendarRowMenu'
import { MiniCalendar } from './MiniCalendar'
import { CalendarVisibilityRow } from './CalendarVisibilityRow'

interface CalendarVisibilityPanelProps {
  currentDate: Date
  onSelectDate: (date: Date) => void
  includePersonal: boolean
  onTogglePersonal: (checked: boolean) => void
  personalCalendarColor: string
  personalHasColorOverride: boolean
  isLoadingPersonalColor?: boolean
  isUpdatingPersonalColor?: boolean
  onSelectPersonalColor: (color: string | null) => void
  onCreateSharedCalendar: () => void
  onEditInternalCalendar: (calendar: InternalCalendarSummary) => void
  onManageInternalCalendarAccess: (calendar: InternalCalendarSummary) => void
  onArchiveInternalCalendar: (calendar: InternalCalendarSummary) => void
  internalCalendars: InternalCalendarSummary[]
  updatingCalendarPreferenceId?: string | null
  onSelectInternalCalendarColor: (calendar: InternalCalendarSummary, color: string | null) => void
  selectedInternalCalendarIds: string[]
  onToggleInternalCalendar: (calendarId: string, checked: boolean) => void
  externalSources: ExternalCalendarSource[]
  selectedExternalSourceIds: string[]
  onToggleExternalSource: (sourceId: string, checked: boolean) => void
}

function isChecked(ids: string[], targetId: string): boolean {
  return ids.includes(targetId)
}

export const CalendarVisibilityPanel: React.FC<CalendarVisibilityPanelProps> = ({
  currentDate,
  onSelectDate,
  includePersonal,
  onTogglePersonal,
  personalCalendarColor,
  personalHasColorOverride,
  isLoadingPersonalColor = false,
  isUpdatingPersonalColor = false,
  onSelectPersonalColor,
  onCreateSharedCalendar,
  onEditInternalCalendar,
  onManageInternalCalendarAccess,
  onArchiveInternalCalendar,
  internalCalendars,
  updatingCalendarPreferenceId,
  onSelectInternalCalendarColor,
  selectedInternalCalendarIds,
  onToggleInternalCalendar,
  externalSources,
  selectedExternalSourceIds,
  onToggleExternalSource
}) => {
  const { t } = useTranslation(translations)

  return (
    <aside className="gba:w-72 gba:border-r gba:border-border/50 gba:bg-card/40 gba:flex gba:flex-col">
      <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border/50">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('calendar-sidebar-title')}</h3>
      </div>

      <ScrollArea className="gba:flex-1">
        <div className="gba:p-3 gba:space-y-3">
          <MiniCalendar selectedDate={currentDate} onSelectDate={onSelectDate} />

          <section className="gba:space-y-1">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('calendar-sidebar-myCalendars')}</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCreateSharedCalendar}
                className="gba:h-8 gba:w-8"
                data-testid="calendar-create-shared-button"
                aria-label={t('calendar-sidebar-newSharedCalendar')}
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
              </Button>
            </div>

            <div className="gba:space-y-0">
              <CalendarVisibilityRow
                rowId="personal"
                title={t('calendar-sidebar-myCalendar')}
                checked={includePersonal}
                onToggle={onTogglePersonal}
                color={personalCalendarColor}
                menu={
                  <CalendarRowMenu
                    rowId="personal"
                    title={t('calendar-sidebar-myCalendar')}
                    color={personalCalendarColor}
                    hasColorOverride={personalHasColorOverride}
                    isColorUpdating={isLoadingPersonalColor || isUpdatingPersonalColor}
                    onSelectColor={onSelectPersonalColor}
                  />
                }
              />

              {internalCalendars.length === 0 && (
                <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-background gba:p-3 gba:space-y-2">
                  <p className="gba:text-xs gba:text-muted-foreground">{t('calendar-sidebar-noSharedCalendars')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateSharedCalendar}
                    className="gba:w-full"
                    data-testid="calendar-create-shared-empty-button"
                  >
                    {t('calendar-sidebar-createFirstSharedCalendar')}
                  </Button>
                </div>
              )}

              {internalCalendars.map(calendar => (
                <CalendarVisibilityRow
                  key={calendar.id}
                  rowId={calendar.id}
                  title={calendar.name}
                  checked={isChecked(selectedInternalCalendarIds, calendar.id)}
                  onToggle={checked => onToggleInternalCalendar(calendar.id, checked)}
                  color={calendar.color}
                  menu={
                    <CalendarRowMenu
                      rowId={calendar.id}
                      title={calendar.name}
                      color={calendar.color}
                      hasColorOverride={calendar.hasColorOverride}
                      isColorUpdating={updatingCalendarPreferenceId === calendar.id}
                      onSelectColor={color => onSelectInternalCalendarColor(calendar, color)}
                      onEdit={calendar.canEdit ? () => onEditInternalCalendar(calendar) : undefined}
                      onManageAccess={
                        calendar.type === InternalCalendarType.SHARED && calendar.canEdit
                          ? () => onManageInternalCalendarAccess(calendar)
                          : undefined
                      }
                      onArchive={calendar.isOwner ? () => onArchiveInternalCalendar(calendar) : undefined}
                    />
                  }
                />
              ))}
            </div>
          </section>

          <section className="gba:space-y-1">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('calendar-sidebar-external')}</h4>
            </div>

            <div className="gba:space-y-0">
              {externalSources.length === 0 && (
                <p className="gba:text-xs gba:text-muted-foreground">{t('calendar-sidebar-noExternalCalendars')}</p>
              )}

              {externalSources.map(source => (
                <label
                  key={source.id}
                  className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:px-2 gba:py-1.5 hover:gba:bg-muted/40"
                >
                  <div className="gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{source.label}</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:capitalize">{source.provider}</p>
                  </div>
                  <Checkbox
                    checked={isChecked(selectedExternalSourceIds, source.id)}
                    onCheckedChange={checked => onToggleExternalSource(source.id, Boolean(checked))}
                    data-testid={`calendar-visibility-external-${source.id}`}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
