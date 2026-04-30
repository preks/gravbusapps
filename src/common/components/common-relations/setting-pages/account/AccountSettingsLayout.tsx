import React, { useState } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { BuildingsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { getCatalogUsageCheckSpecs, useCatalogDeleteAvailability } from '../hooks/useCatalogDeleteAvailability'
import { CatalogTab } from '../components/CatalogTab'

export interface AccountSettingsConfig {
  priorityCatalog: string
  typeCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
}

export interface AccountSettingsLayoutProps extends BusinessAppContextProps {
  config: AccountSettingsConfig
  initialTab?: 'priorities' | 'types'
  onBack?: () => void
  className?: string
}

export const AccountSettingsLayout: React.FC<AccountSettingsLayoutProps> = ({
  config,
  initialTab = 'priorities',
  onBack,
  className,
  ...context
}) => {
  const [active, setActive] = useState<'priorities' | 'types'>(initialTab)

  // Call hooks internally based on config
  const priorities = useCatalogSettings(context, config.priorityCatalog)
  const types = useCatalogSettings(context, config.typeCatalog)
  const getPriorityDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Priority',
    getCatalogUsageCheckSpecs(config.priorityCatalog)
  )
  const getTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Type',
    getCatalogUsageCheckSpecs(config.typeCatalog)
  )

  return (
    <PageLayout
      headerIcon={BuildingsIcon}
      headerTitle={config.headerTitle || 'Account Data'}
      headerDescription={config.headerDescription || 'Manage account priorities and types'}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-Container`}
    >
      <Tabs value={active} onValueChange={k => setActive(k as any)} data-testid={`${config.dataTestIdPrefix}-Tabs`}>
        <TabsList>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        <TabsContent value="priorities">
          <CatalogTab
            entityName="Priority"
            dataTestId={`${config.dataTestIdPrefix}-Priorities`}
            getDeleteAvailability={getPriorityDeleteAvailability}
            {...priorities}
          />
        </TabsContent>

        <TabsContent value="types">
          <CatalogTab
            entityName="Type"
            dataTestId={`${config.dataTestIdPrefix}-Types`}
            getDeleteAvailability={getTypeDeleteAvailability}
            {...types}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
