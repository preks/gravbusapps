/**
 * StartConfigPanel - Trigger configuration for the start node.
 * Simple mode: locked to MANUAL_FORM.
 * Advanced mode: all trigger types (MANUAL_FORM, WEBHOOK, EVENT, SCHEDULE).
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { Play, Globe, Zap, Clock } from 'lucide-react'
import { EnvelopeIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type {
  DesignerMode,
  EmailTriggerFilterConfig,
  FlowStudioUpdateOptions,
  StartNodeConfig,
  TriggerType
} from '../../types/studioTypes'
import { FormBuilder } from '../form-builder'
import type { InputBlock } from '@/common/data/flow/types/flowTemplate'
import { FlowContextExpressionEditor } from '../shared/FlowContextExpressionEditor'
import { useStudioExpressionSuggestions } from '../../hooks/useStudioExpressionSuggestions'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { EmailTriggerFilterEditor } from './EmailTriggerFilterEditor'
import { WebhookStartConfigSection } from './WebhookStartConfigSection'

const TRIGGER_ICONS: Record<TriggerType, React.ElementType> = {
  MANUAL_FORM: Play,
  WEBHOOK: Globe,
  EMAIL: EnvelopeIcon,
  EVENT: Zap,
  SCHEDULE: Clock
}

const TRIGGER_LABEL_KEYS: Record<TriggerType, string> = {
  MANUAL_FORM: 'start-trigger-manual',
  WEBHOOK: 'start-trigger-webhook',
  EMAIL: 'start-trigger-email',
  EVENT: 'start-trigger-event',
  SCHEDULE: 'start-trigger-schedule'
}

interface StartConfigPanelProps {
  nodeId: string
  config: StartNodeConfig
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  'data-testid'?: string
}

export const StartConfigPanel: React.FC<StartConfigPanelProps> = ({
  nodeId,
  config,
  mode,
  accessToken,
  studioData,
  'data-testid': testId = 'flow-studio-start-config'
}) => {
  const { t } = useTranslation(translations)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const rewriteExpressionsForStartFieldRename = useFlowStudioStore(s => s.rewriteExpressionsForStartFieldRename)
  const suggestions = useStudioExpressionSuggestions()
  const dataSources = useMemo(
    () => ({
      catalogs: studioData.catalogs,
      catalogsLoading: studioData.catalogsLoading,
      catalogsError: studioData.catalogsError,
      catalogsQuery: studioData.catalogsQuery,
      catalogsHasMore: studioData.catalogsHasMore,
      searchCatalogs: studioData.searchCatalogs,
      loadMoreCatalogs: studioData.loadMoreCatalogs,
      entities: studioData.entities,
      entitiesLoading: studioData.entitiesLoading,
      entitiesError: studioData.entitiesError,
      loadEntities: studioData.loadEntities
    }),
    [
      studioData.catalogs,
      studioData.catalogsError,
      studioData.catalogsHasMore,
      studioData.catalogsLoading,
      studioData.catalogsQuery,
      studioData.entities,
      studioData.entitiesError,
      studioData.entitiesLoading,
      studioData.loadEntities,
      studioData.loadMoreCatalogs,
      studioData.searchCatalogs
    ]
  )

  const handleTriggerChange = useCallback(
    (value: string) => {
      updateNodeConfig(nodeId, { triggerType: value as TriggerType })
    },
    [nodeId, updateNodeConfig]
  )

  const triggerTypes: TriggerType[] =
    mode === 'simple' ? ['MANUAL_FORM', 'EMAIL'] : ['MANUAL_FORM', 'EMAIL', 'WEBHOOK', 'EVENT', 'SCHEDULE']

  const triggerValue: TriggerType = (() => {
    const v = config.triggerType
    if (v && triggerTypes.includes(v)) return v
    return 'MANUAL_FORM'
  })()

  // Ensure we always have a stable trigger type (older templates may not set it).
  useEffect(() => {
    if (!config.triggerType || !triggerTypes.includes(config.triggerType)) {
      updateNodeConfig(nodeId, { triggerType: 'MANUAL_FORM' }, { markDirty: false })
    }
  }, [config.triggerType, nodeId, triggerTypes, updateNodeConfig])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-muted">
          <Play className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Start Trigger</h3>
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:py-4 gba:pb-5">
          {/* Trigger Type Selection */}
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label className="gba:text-xs gba:font-medium">{t('start-trigger-type')}</Label>
            <Select value={triggerValue} onValueChange={handleTriggerChange}>
              <SelectTrigger data-testid={`${testId}-trigger-select`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="gba:w-[var(--radix-select-trigger-width)] gba:max-w-[var(--radix-select-trigger-width)]">
                {triggerTypes.map(tt => {
                  const Icon = TRIGGER_ICONS[tt]
                  const labelKey = TRIGGER_LABEL_KEYS[tt]
                  return (
                    <SelectItem key={tt} value={tt}>
                      <span className="gba:flex gba:items-center gba:gap-2">
                        <Icon className="gba:h-3.5 gba:w-3.5" />
                        {t(labelKey)}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Trigger-specific config */}
          {config.triggerType === 'MANUAL_FORM' && (
            <FormBuilder
              fields={config.form ?? []}
              onChange={(fields: InputBlock[], options?: FlowStudioUpdateOptions) =>
                updateNodeConfig(nodeId, { form: fields }, options)
              }
              onFieldKeyRename={({ oldKey, newKey }, options) =>
                rewriteExpressionsForStartFieldRename(oldKey, newKey, options)
              }
              mode={mode}
              catalogs={studioData.catalogs}
              catalogsLoading={studioData.catalogsLoading}
              catalogsError={studioData.catalogsError}
              catalogsQuery={studioData.catalogsQuery}
              catalogsHasMore={studioData.catalogsHasMore}
              searchCatalogs={studioData.searchCatalogs}
              loadMoreCatalogs={studioData.loadMoreCatalogs}
              entities={studioData.entities}
              entitiesLoading={studioData.entitiesLoading}
              entitiesError={studioData.entitiesError}
              loadEntities={studioData.loadEntities}
              title={t('config-form')}
              description="Configure the form that initiators fill out to start this flow."
              data-testid={`${testId}-form-builder`}
            />
          )}

          {config.triggerType === 'EMAIL' && (
            <EmailTriggerFilterEditor
              value={config.emailConfig?.filter}
              onChange={(filter: EmailTriggerFilterConfig) => updateNodeConfig(nodeId, { emailConfig: { filter } })}
              testId={`${testId}-email-filter`}
            />
          )}

          {config.triggerType === 'WEBHOOK' && mode === 'advanced' && (
            <WebhookStartConfigSection
              nodeId={nodeId}
              config={config}
              mode={mode}
              accessToken={accessToken}
              studioData={studioData}
              testId={testId}
              onFieldKeyRename={(args, options) =>
                rewriteExpressionsForStartFieldRename(args.oldKey, args.newKey, options)
              }
            />
          )}

          {config.triggerType === 'EVENT' && mode === 'advanced' && (
            <div className="gba:flex gba:flex-col gba:gap-3">
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">Event Type</Label>
                <Input
                  value={config.eventConfig?.eventType ?? ''}
                  onChange={e =>
                    updateNodeConfig(nodeId, {
                      eventConfig: { ...config.eventConfig, eventType: e.target.value }
                    })
                  }
                  placeholder="e.g. entity.created"
                  data-testid={`${testId}-event-type`}
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">Filter condition</Label>
                <FlowContextExpressionEditor
                  value={config.eventConfig?.filter ?? ''}
                  onChange={value =>
                    updateNodeConfig(nodeId, {
                      eventConfig: { ...config.eventConfig, filter: value }
                    })
                  }
                  suggestions={suggestions}
                  dataSources={dataSources}
                  placeholder="Optional condition — type {{ to insert fields…"
                  allowFreeText
                  data-testid={`${testId}-event-filter`}
                />
              </div>
            </div>
          )}

          {config.triggerType === 'SCHEDULE' && mode === 'advanced' && (
            <div className="gba:flex gba:flex-col gba:gap-3">
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">Cron Expression</Label>
                <Input
                  value={config.scheduleConfig?.cron ?? ''}
                  onChange={e =>
                    updateNodeConfig(nodeId, {
                      scheduleConfig: { ...config.scheduleConfig, cron: e.target.value }
                    })
                  }
                  placeholder="0 9 * * 1-5"
                  data-testid={`${testId}-schedule-cron`}
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">Timezone</Label>
                <Input
                  value={config.scheduleConfig?.timezone ?? ''}
                  onChange={e =>
                    updateNodeConfig(nodeId, {
                      scheduleConfig: { ...config.scheduleConfig, timezone: e.target.value }
                    })
                  }
                  placeholder="Europe/Berlin"
                  data-testid={`${testId}-schedule-tz`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
