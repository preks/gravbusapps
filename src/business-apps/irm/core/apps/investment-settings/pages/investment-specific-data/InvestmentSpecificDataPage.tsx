import React, { useState } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { ChartLineIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'
import { CatalogTab } from '@/common/components/common-relations/setting-pages/components/CatalogTab'

type InvestmentSpecificTab = 'roles' | 'statuses' | 'stake-types'

const TABS: ReadonlyArray<InvestmentSpecificTab> = ['roles', 'statuses', 'stake-types']

const isInvestmentSpecificTab = (value: string): value is InvestmentSpecificTab =>
  (TABS as ReadonlyArray<string>).includes(value)

export interface InvestmentSpecificDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  initialTab?: InvestmentSpecificTab
  onBack?: () => void
}

const DATA_TEST_ID = 'InvestmentSpecificDataPage'

const InvestmentSpecificDataPage: React.FC<InvestmentSpecificDataPageProps> = ({
  prefixDataTestId,
  initialTab = 'roles',
  onBack,
  className,
  ...context
}) => {
  const [active, setActive] = useState<InvestmentSpecificTab>(initialTab)

  const roles = useCatalogSettings(context, 'InvestmentRole')
  const statuses = useCatalogSettings(context, 'InvestmentStatus')
  const stakeTypes = useCatalogSettings(context, 'InvestmentStakeType')

  return (
    <PageLayout
      headerIcon={ChartLineIcon}
      headerTitle="Investment Specific Data"
      headerDescription="Manage investment roles, statuses, and stake types"
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
    >
      <Tabs
        value={active}
        onValueChange={k => {
          if (isInvestmentSpecificTab(k)) setActive(k)
        }}
        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}
      >
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="stake-types">Stake Types</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <CatalogTab entityName="Role" dataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Roles`} {...roles} />
        </TabsContent>

        <TabsContent value="statuses">
          <CatalogTab
            entityName="Status"
            dataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Statuses`}
            {...statuses}
          />
        </TabsContent>

        <TabsContent value="stake-types">
          <CatalogTab
            entityName="Stake Type"
            dataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}-StakeTypes`}
            {...stakeTypes}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

export default InvestmentSpecificDataPage
