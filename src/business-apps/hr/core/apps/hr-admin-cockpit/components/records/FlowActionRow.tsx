import { useMemo } from 'react'
import { ActionButton, Spinner, useTranslation } from '@newwork/nw-design-system'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
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
  const flow = ISSUE_FLOW_MAP[issueCode]
  const config = useMemo(
    () => ({
      contextsArray: flow ? [flow.context] : undefined,
      externalContextData: flow ? { employeeId } : undefined,
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

  if (!flow) return null
  if (shouldShowLoading) return <Spinner size="sm" />
  if (actions.length === 0) return null

  return (
    <ActionButton actions={actions} autoExecuteSingleAction={true} emptyStateBehavior="enable" size="sm">
      {t(flow.labelKey)}
    </ActionButton>
  )
}
