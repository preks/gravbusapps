import { useMemo } from 'react'
import { ActionButton, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { DataQualityIssueCode } from '../../types/dataQuality.types'
import translations from '../../_i18n'

const ISSUE_FLOW_MAP: Partial<Record<DataQualityIssueCode, { context: FlowContextName; labelKey: string }>> = {
  working_conditions: {
    context: FlowContextName.updateEmployeeWorkingCondition,
    labelKey: 'flow-update-working-conditions'
  },
  working_hours: { context: FlowContextName.updateEmployeeWorkingHours, labelKey: 'flow-update-working-hours' },
  tax: { context: FlowContextName.changeTaxDetails, labelKey: 'flow-update-tax-details' },
  payroll_bank: { context: FlowContextName.updateEmployeeBankAccount, labelKey: 'flow-update-bank-account' }
}

interface FlowActionRowProps {
  readonly issueCode: DataQualityIssueCode
  readonly employeeId: string
  readonly accessToken: string
  readonly onClose: () => void
  readonly onActionStarted?: (employeeId: string) => void
}

export function FlowActionRow({
  issueCode,
  employeeId,
  accessToken,
  onClose,
  onActionStarted
}: Readonly<FlowActionRowProps>) {
  const { t } = useTranslation(translations)

  if (issueCode === 'location' || issueCode === 'cost_center') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gba:h-auto gba:min-h-9 gba:w-full gba:min-w-0 gba:max-w-full gba:justify-center gba:whitespace-normal gba:break-words gba:py-2 gba:text-center gba:leading-snug"
        onClick={() => {
          onClose()
          navigateTo(
            buildPlatformUrl('/platform/orgchart/active/organization', {
              employeeId
            })
          )
        }}
      >
        {t('action-open-orgchart')}
      </Button>
    )
  }

  const flow = ISSUE_FLOW_MAP[issueCode]
  if (!flow) return null

  return (
    <FlowActionButton
      flow={flow}
      employeeId={employeeId}
      accessToken={accessToken}
      onClose={onClose}
      onActionStarted={onActionStarted}
      label={t(flow.labelKey)}
    />
  )
}

interface FlowActionButtonProps {
  readonly flow: { context: FlowContextName; labelKey: string }
  readonly employeeId: string
  readonly accessToken: string
  readonly onClose: () => void
  readonly onActionStarted?: (employeeId: string) => void
  readonly label: string
}

function FlowActionButton({
  flow,
  employeeId,
  accessToken,
  onClose,
  onActionStarted,
  label
}: Readonly<FlowActionButtonProps>) {
  const config = useMemo(
    () => ({
      contextsArray: [flow.context],
      externalContextData: { employeeId },
      accessToken,
      deferMainContextRequestsUntilClick: false,
      emptyStateBehavior: 'enable' as const
    }),
    [flow, employeeId, accessToken]
  )
  const { combinedData, shouldShowLoading } = useAppActionData(config, 'DataQualityFlowAction')

  const actions = useMemo(
    () =>
      combinedData.map(action => ({
        ...action,
        onClick: () => {
          onActionStarted?.(employeeId)
          onClose()
          action.onClick?.()
        }
      })),
    [combinedData, employeeId, onActionStarted, onClose]
  )

  if (shouldShowLoading) {
    return (
      <div className="gba:flex gba:min-h-9 gba:w-full gba:items-center gba:justify-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (actions.length === 0) return null

  return (
    <ActionButton
      actions={actions}
      autoExecuteSingleAction={true}
      emptyStateBehavior="enable"
      size="sm"
      className="gba:h-auto gba:min-h-9 gba:w-full gba:min-w-0 gba:max-w-full gba:justify-center gba:whitespace-normal gba:break-words gba:py-2 gba:text-center gba:leading-snug"
    >
      {label}
    </ActionButton>
  )
}
