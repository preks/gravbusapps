import React, { useState, useMemo } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { TargetIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { CatalogTab } from '../components/CatalogTab'
import PipelineSettings from '../pipelines/PipelineSettings'

export interface OpportunitySettingsConfig {
  statusCatalog: string
  forecastCatalog: string
  pipelineCatalog: string
  stageCatalog: string
  conditionCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
}

export interface OpportunitySettingsLayoutProps extends BusinessAppContextProps {
  config: OpportunitySettingsConfig
  initialTab?: 'pipelines' | 'statuses' | 'forecasts'
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
  const [active, setActive] = useState<'pipelines' | 'statuses' | 'forecasts'>(initialTab)

  // Call hooks internally based on config
  const statuses = useCatalogSettings(context, config.statusCatalog)
  const forecasts = useCatalogSettings(context, config.forecastCatalog)

  const catalogConfig = useMemo(
    () => ({
      pipelineCatalog: config.pipelineCatalog,
      stageCatalog: config.stageCatalog,
      conditionCatalog: config.conditionCatalog,
      version: 'v1' as const
    }),
    [config.pipelineCatalog, config.stageCatalog, config.conditionCatalog]
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
      <Tabs value={active} onValueChange={k => setActive(k as any)} data-testid={`${config.dataTestIdPrefix}-Tabs`}>
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
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
      </Tabs>
    </PageLayout>
  )
}
