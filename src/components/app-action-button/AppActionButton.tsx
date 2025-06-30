'use client'

import React from 'react'
import { ActionButton, ActionOption, type ActionButtonProps } from '@newwork/gravity-ui-catalog'
import { useTranslation } from 'react-i18next'
import { useMainContextsData } from '@/common/hooks/useMainContextsData'
import { useFlowItems, ExternalContextData } from '@/common/hooks/useFlowItems'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export type AppActionButtonProps = Omit<
  ActionButtonProps,
  'flowData'
> & {
  contextsArray?: FlowContextName[]
  externalContextData?: ExternalContextData
  staticFlowData?: ActionOption[]
  prefixDataTestId?: string
  accessToken?: string
}

const DATA_TEST_ID_PREFIX = 'AppActionButton'

/**
 * AppActionButton Component
 * Displays an action button with flow items from the flow registry
 */
export const AppActionButton: React.FC<AppActionButtonProps> = props => {
  const { t } = useTranslation()
  const { mainContextsData } = useMainContextsData(props?.contextsArray ?? [], props?.accessToken ?? '')
  const dataTestId = formatDataTestId(props.prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { flowData } = useFlowItems({
    mainContextsData,
    externalContextData: props.externalContextData ?? {},
    isFlowButtonOrigin: true,
    accessToken: props?.accessToken ?? ''
  })
  const combinedData = [...(props.staticFlowData ?? []), ...flowData]

  // Process execution is now handled directly in the onClick handler of each ActionOption

  // Extract custom props that shouldn't be passed to DOM
  const { prefixDataTestId, accessToken, contextsArray, externalContextData, staticFlowData, ...restProps } = props
  
  return (
    <ActionButton
      {...restProps}
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

export default AppActionButton