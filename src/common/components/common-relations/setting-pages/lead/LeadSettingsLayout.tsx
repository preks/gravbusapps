import React, { useState } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { StarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { CatalogTab } from '../components/CatalogTab'

export interface LeadSettingsConfig {
  ratingCatalog: string
  statusCatalog: string
  sourceCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
}

export interface LeadSettingsLayoutProps extends BusinessAppContextProps {
  config: LeadSettingsConfig
  initialTab?: 'ratings' | 'statuses' | 'sources'
  onBack?: () => void
  className?: string
}

export const LeadSettingsLayout: React.FC<LeadSettingsLayoutProps> = ({
  config,
  initialTab = 'ratings',
  onBack,
  className,
  ...context
}) => {
  const [active, setActive] = useState<'ratings' | 'statuses' | 'sources'>(initialTab)

  // Call hooks internally based on config
  const ratings = useCatalogSettings(context, config.ratingCatalog)
  const statuses = useCatalogSettings(context, config.statusCatalog)
  const sources = useCatalogSettings(context, config.sourceCatalog)

  return (
    <PageLayout
      headerIcon={StarIcon}
      headerTitle={config.headerTitle || 'Lead Data'}
      headerDescription={config.headerDescription || 'Manage lead ratings, statuses, and sources'}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-Container`}
    >
      <Tabs value={active} onValueChange={k => setActive(k as any)} data-testid={`${config.dataTestIdPrefix}-Tabs`}>
        <TabsList>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="ratings">
          <CatalogTab entityName="Rating" dataTestId={`${config.dataTestIdPrefix}-Ratings`} {...ratings} />
        </TabsContent>

        <TabsContent value="statuses">
          <CatalogTab entityName="Status" dataTestId={`${config.dataTestIdPrefix}-Statuses`} {...statuses} />
        </TabsContent>

        <TabsContent value="sources">
          <CatalogTab entityName="Source" dataTestId={`${config.dataTestIdPrefix}-Sources`} {...sources} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
