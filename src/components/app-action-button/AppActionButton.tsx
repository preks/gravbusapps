/* 'use client'

import React from 'react'
import { ActionButton, ActionOption, type ActionButtonProps } from '@newwork/gravity-ui-catalog'
import { ExternalContextData } from '@/modules/flowRegistry/types/types'
import { useMainContextsData } from '../flow/flowButton/hooks'
import { FlowContextName } from '@/modules/flowRegistry/enums'
import { useFlowItems } from '@/modules/flowRegistry/hooks'
import { useTranslation } from 'react-i18next'
import { formatDataTestId } from '@/modules/orgchart/utils'

export type AppActionButtonProps = Omit<
  ActionButtonProps,
  'processExecutor' | 'routingProvider' | 'currentPathname' | 'flowData'
> & {
  contextsArray?: FlowContextName[]
  externalContextData?: ExternalContextData
  staticFlowData?: ActionOption[]
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'AppActionButton'

export const AppActionButton: React.FC<AppActionButtonProps> = props => {
  const { t } = useTranslation()
  const { mainContextsData } = useMainContextsData(props?.contextsArray ?? [])
  const dataTestId = formatDataTestId(props.prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { flowData } = useFlowItems({
    mainContextsData,
    externalContextData: props.externalContextData ?? {},
    isFlowButtonOrigin: true
  })
  const combinedData = [...(props.staticFlowData ?? []), ...flowData]

  return (
    <ActionButton
      {...props}
      data-testid={formatDataTestId(dataTestId, 'Button')}
      noFlowAvailableText={t('flow_button.no_flows_available')}
      emptyStateBehavior="disable"
      flowData={combinedData}
      portalContainer={document.body}
      onClick={e => {
        e.stopPropagation()
        e.preventDefault()
      }}
    />
  )
}
 */