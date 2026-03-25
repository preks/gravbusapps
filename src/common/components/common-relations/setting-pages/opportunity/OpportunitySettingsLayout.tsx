import React, { useState, useMemo, useEffect } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { TargetIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { CatalogTab } from '../components/CatalogTab'
import PipelineSettings from '../pipelines/PipelineSettings'

export type OpportunitySettingsTab = 'pipelines' | 'statuses' | 'forecasts' | 'stage-types'

export interface OpportunitySettingsConfig {
  statusCatalog: string
  forecastCatalog: string
  pipelineCatalog: string
  stageCatalog: string
  stageTypeCatalog: string
  conditionCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
}

export interface OpportunitySettingsLayoutProps extends BusinessAppContextProps {
  config: OpportunitySettingsConfig
  initialTab?: OpportunitySettingsTab
  onBack?: () => void
  className?: string
}

export const OpportunitySettingsLayout: React.FC<OpportunitySettingsLayoutProps> = ({
  config,
  initialTab = 'pipelines',
  onBack,
  className,
  ...context
}) => {
  const [active, setActive] = useState<OpportunitySettingsTab>(initialTab)

  // Sync active tab to URL so refresh and bookmarking keep the correct tab
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    if (params.get('page')) {
      params.set('tab', active)
      const newUrl = `${globalThis.location.pathname}?${params.toString()}`
      globalThis.history.replaceState({}, '', newUrl)
    }
  }, [active])

  // Call hooks internally based on config
  const statuses = useCatalogSettings(context, config.statusCatalog)
  const forecasts = useCatalogSettings(context, config.forecastCatalog)
  const stageTypes = useCatalogSettings(context, config.stageTypeCatalog)

  const catalogConfig = useMemo(
    () => ({
      pipelineCatalog: config.pipelineCatalog,
      stageCatalog: config.stageCatalog,
      stageTypeCatalog: config.stageTypeCatalog,
      conditionCatalog: config.conditionCatalog,
      version: 'v1' as const
    }),
    [config.pipelineCatalog, config.stageCatalog, config.stageTypeCatalog, config.conditionCatalog]
  )

  return (
    <PageLayout
      headerIcon={TargetIcon}
      headerTitle={config.headerTitle || 'Opportunity Data'}
      headerDescription={config.headerDescription || 'Manage opportunity pipelines, statuses, and forecast categories'}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-Container`}
    >
      <Tabs
        value={active}
        onValueChange={k => setActive(k as OpportunitySettingsTab)}
        data-testid={`${config.dataTestIdPrefix}-Tabs`}
      >
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="stage-types">Stage Types</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          <PipelineSettings
            prefixDataTestId={`${config.dataTestIdPrefix}-Pipelines`}
            accessToken={context.accessToken}
            userInfo={context.userInfo}
            additionalData={context.additionalData}
            catalogConfig={catalogConfig}
            isLoading={false}
            error={null}
            onRetry={() => {}}
            headerPhosphorIcon={{ icon: undefined }}
            headerTitle=""
            headerDescription=""
            hidePageLayout={true}
          />
        </TabsContent>

        <TabsContent value="statuses">
          <CatalogTab entityName="Status" dataTestId={`${config.dataTestIdPrefix}-Statuses`} {...statuses} />
        </TabsContent>

        <TabsContent value="forecasts">
          <CatalogTab entityName="Forecast" dataTestId={`${config.dataTestIdPrefix}-Forecasts`} {...forecasts} />
        </TabsContent>

        <TabsContent value="stage-types">
          <CatalogTab entityName="Stage Type" dataTestId={`${config.dataTestIdPrefix}-StageTypes`} {...stageTypes} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
