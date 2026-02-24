import React from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { AssignmentSelector } from '@/components/assignment-selector/AssignmentSelector'
import { AssignmentMode, type TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import translations from '../../../_i18n'

interface TaskAssignmentTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  accessToken: string
  testId: string
}

export const TaskAssignmentTab: React.FC<TaskAssignmentTabProps> = ({ mode, config, update, accessToken, testId }) => {
  const { t } = useTranslation(translations)
  const assignmentMode = config.assignment.assignmentMode
  const modeDescription = (() => {
    if (assignmentMode === AssignmentMode.ASSIGN) return t('assignment-mode-desc-assign')
    if (assignmentMode === AssignmentMode.ASSIGN_DEFERRED) return t('assignment-mode-desc-deferred')
    return t('assignment-mode-desc-claim')
  })()

  type DueUnit = 'minutes' | 'hours' | 'days'
  const minutesPer: Record<DueUnit, number> = { minutes: 1, hours: 60, days: 24 * 60 }

  const deriveUnit = (mins?: number): DueUnit => {
    const m = Number(mins || 0)
    if (!m) return 'days'
    if (m % minutesPer.days === 0) return 'days'
    if (m % minutesPer.hours === 0) return 'hours'
    return 'minutes'
  }

  const unit = deriveUnit(config.dueInMinutes)
  const amountValue = (() => {
    const mins = Number(config.dueInMinutes || 0)
    if (!mins) return ''
    const per = minutesPer[unit]
    const val = Math.round(mins / per)
    return String(val > 0 ? val : '')
  })()

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-mode-label')}</Label>
        <Select
          value={assignmentMode}
          onValueChange={v =>
            update({
              assignment: { ...config.assignment, assignmentMode: v as AssignmentMode }
            })
          }
        >
          <SelectTrigger data-testid={`${testId}-assignment-mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AssignmentMode.CLAIM}>{t('assignment-mode-claim')}</SelectItem>
            <SelectItem value={AssignmentMode.ASSIGN}>{t('assignment-mode-assign')}</SelectItem>
            {mode === 'advanced' && (
              <SelectItem value={AssignmentMode.ASSIGN_DEFERRED}>{t('assignment-mode-deferred')}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-assignment-mode-desc`}>
          {modeDescription}
        </p>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('assignment-audience-label')}</Label>
        <AssignmentSelector
          value={{
            targets: config.assignment.targets,
            assignmentMode,
            allowReassignment: true
          }}
          onChange={(assignment: TaskAssignment) =>
            update({
              assignment: {
                targets: assignment.targets,
                assignmentMode
              }
            })
          }
          assignmentMode={assignmentMode}
          accessToken={accessToken}
          data-testid={`${testId}-assignment-selector`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-due-label')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('assignment-due-description')}</p>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            type="number"
            min={1}
            value={amountValue}
            placeholder={t('assignment-due-placeholder')}
            onChange={e => {
              const raw = String(e.target.value || '').trim()
              if (!raw) {
                update({ dueInMinutes: undefined })
                return
              }
              const n = Number.parseInt(raw, 10)
              if (!Number.isFinite(n) || n <= 0) {
                update({ dueInMinutes: undefined })
                return
              }
              update({ dueInMinutes: n * minutesPer[unit] })
            }}
            className="gba:flex-1"
            data-testid={`${testId}-due-amount`}
          />
          <Select
            value={unit}
            onValueChange={(next: string) => {
              const nextUnit = next as DueUnit
              const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
              update({ dueInMinutes: currentAmount * minutesPer[nextUnit] })
            }}
          >
            <SelectTrigger className="gba:w-32" data-testid={`${testId}-due-unit`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">{t('assignment-due-unit-minutes')}</SelectItem>
              <SelectItem value="hours">{t('assignment-due-unit-hours')}</SelectItem>
              <SelectItem value="days">{t('assignment-due-unit-days')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
