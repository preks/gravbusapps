import React, { useEffect } from 'react'
import { Button, Label, Switch, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, Users } from 'lucide-react'
import { AssignmentSelector } from '@/components/assignment-selector/AssignmentSelector'
import { AssignmentMode, type TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import type { ResourceTypeKey } from '@/components/assignment-selector/assignmentResourceTypes'
import type { DesignerMode } from '../../../types/studioTypes'
import translations from '../../../_i18n'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../utils/neutralSwitchClassName'
import { AssignmentStrategySelector, type AssignmentStrategyId } from './AssignmentStrategySelector'

type PrimaryMode = 'CLAIMABLE' | 'ASSIGN'

export interface AssignmentConfigSectionProps {
  mode: DesignerMode
  accessToken: string
  value: TaskAssignment
  onChange: (next: TaskAssignment) => void
  availableStartFields: Array<{ name: string; label: string }>
  /** Used when switching to Assign and no user target exists yet. */
  defaultUserTargets?: string[]
  defaultStrategyId?: string
  allowedClaimTypes?: ResourceTypeKey[]
  /** Some contexts (e.g. escalation/decisions) must always have a deterministic assignee. */
  allowAssignAtExecution?: boolean
  /** Disallow multi-target strategies (e.g. direct reports) for certain contexts. */
  disallowedAssignStrategyIds?: AssignmentStrategyId[]
  testId: string
}

export const AssignmentConfigSection: React.FC<AssignmentConfigSectionProps> = ({
  mode,
  accessToken,
  value,
  onChange,
  availableStartFields,
  defaultUserTargets = ['{{$orgchart.managerByUserId[$workflow.initiator]}}'],
  defaultStrategyId = 'REQUESTER_MANAGER',
  allowedClaimTypes = ['capabilities'],
  allowAssignAtExecution = true,
  disallowedAssignStrategyIds,
  testId
}) => {
  const { t } = useTranslation(translations)

  const assignmentMode =
    value.assignmentMode === AssignmentMode.CLAIM ? AssignmentMode.CLAIM : AssignmentMode.ASSIGN_DEFERRED
  const targets = value.targets ?? null
  const allowReassignment = value.allowReassignment ?? true

  const primaryMode: PrimaryMode = assignmentMode === AssignmentMode.CLAIM ? 'CLAIMABLE' : 'ASSIGN'
  const assignAtExecution = allowAssignAtExecution && primaryMode === 'ASSIGN' && targets == null

  useEffect(() => {
    if (primaryMode !== 'ASSIGN') return
    if (allowAssignAtExecution) return
    if (targets != null) return

    const users = Array.isArray((targets as any)?.users) ? ((targets as any).users as any) : []
    onChange({
      ...value,
      assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
      targets: { users: users.length ? users : defaultUserTargets },
      allowReassignment
    })
  }, [allowAssignAtExecution, allowReassignment, defaultUserTargets, onChange, primaryMode, targets, value])

  const setAllowReassignment = (checked: boolean) => {
    onChange({
      ...value,
      assignmentMode,
      targets,
      allowReassignment: checked
    })
  }

  const setPrimaryMode = (next: PrimaryMode) => {
    if (next === 'CLAIMABLE') {
      const caps = Array.isArray((targets as any)?.capabilities) ? ((targets as any).capabilities as any) : undefined
      onChange({
        ...value,
        assignmentMode: AssignmentMode.CLAIM,
        targets: caps?.length ? { capabilities: caps } : null,
        allowReassignment
      })
      return
    }

    const users = Array.isArray((targets as any)?.users) ? ((targets as any).users as any) : []
    onChange({
      ...value,
      assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
      targets: { users: users.length ? users : defaultUserTargets },
      allowReassignment
    })
  }

  const setAssignAtExecution = (checked: boolean) => {
    if (checked) {
      onChange({
        ...value,
        assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
        targets: null,
        allowReassignment
      })
      return
    }

    const users = Array.isArray((targets as any)?.users) ? ((targets as any).users as any) : []
    onChange({
      ...value,
      assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
      targets: { users: users.length ? users : defaultUserTargets },
      allowReassignment
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2" data-testid={`${testId}-mode`}>
        {(
          [
            {
              id: 'CLAIMABLE' as const,
              Icon: Users,
              title: t('assignment-mode-claimable'),
              desc: t('assignment-mode-desc-claimable')
            },
            {
              id: 'ASSIGN' as const,
              Icon: Sparkles,
              title: t('assignment-mode-auto'),
              desc: t('assignment-mode-desc-auto')
            }
          ] satisfies Array<{
            id: PrimaryMode
            Icon: React.FC<{ className?: string }>
            title: string
            desc: string
          }>
        ).map(opt => {
          const selected = primaryMode === opt.id
          return (
            <Button
              key={opt.id}
              type="button"
              variant="outline"
              onClick={() => setPrimaryMode(opt.id)}
              className={[
                'gba:h-auto gba:py-3 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background gba:text-left',
                selected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
              ].join(' ')}
              data-testid={`${testId}-mode-option-${opt.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <opt.Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:text-left">{opt.title}</span>
              </div>
              <span className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2 gba:whitespace-normal gba:break-words">
                {opt.desc}
              </span>
            </Button>
          )
        })}
      </div>

      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <Label className="gba:text-xs gba:font-medium">{t('assignment-allow-reassignment-label')}</Label>
          <p className="gba:text-xs gba:text-muted-foreground">{t('assignment-allow-reassignment-desc')}</p>
        </div>
        <Switch
          checked={allowReassignment}
          onCheckedChange={setAllowReassignment}
          className={NEUTRAL_SWITCH_CLASSNAME}
          data-testid={`${testId}-allow-reassignment`}
        />
      </div>

      {primaryMode === 'CLAIMABLE' ? (
        <AssignmentSelector
          value={{ targets, assignmentMode: AssignmentMode.CLAIM, allowReassignment }}
          onChange={(next: TaskAssignment) =>
            onChange({
              ...value,
              assignmentMode: AssignmentMode.CLAIM,
              targets: next.targets,
              allowReassignment
            })
          }
          assignmentMode={AssignmentMode.CLAIM}
          allowedTypes={allowedClaimTypes}
          accessToken={accessToken}
          data-testid={`${testId}-selector`}
        />
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-3">
          {allowAssignAtExecution && (
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
              <div className="gba:flex gba:flex-col gba:gap-0.5">
                <Label className="gba:text-xs gba:font-medium">{t('assignment-assign-at-execution-label')}</Label>
                <p className="gba:text-xs gba:text-muted-foreground">{t('assignment-assign-at-execution-desc')}</p>
              </div>
              <Switch
                checked={assignAtExecution}
                onCheckedChange={setAssignAtExecution}
                className={NEUTRAL_SWITCH_CLASSNAME}
                data-testid={`${testId}-assign-at-execution`}
              />
            </div>
          )}

          {assignAtExecution ? (
            <div className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-runtime-hint`}>
              {t('assignment-runtime-hint')}
            </div>
          ) : (
            <AssignmentStrategySelector
              mode={mode}
              variant="select"
              value={{
                targets,
                assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
                allowReassignment
              }}
              onChange={next =>
                onChange({
                  ...value,
                  assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
                  targets: (next as any).targets ?? null,
                  allowReassignment: (next as any).allowReassignment ?? allowReassignment
                })
              }
              availableStartFields={availableStartFields}
              defaultStrategyId={defaultStrategyId}
              disallowedStrategyIds={disallowedAssignStrategyIds}
              data-testid={`${testId}-strategy`}
            />
          )}
        </div>
      )}
    </div>
  )
}
