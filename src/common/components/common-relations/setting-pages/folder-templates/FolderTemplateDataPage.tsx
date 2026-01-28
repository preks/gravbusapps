import React, { useState } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { FolderIcon } from '@phosphor-icons/react'
import { FolderTemplateEditor } from './FolderTemplateEditor'
import { InvestmentFolderTemplateEditor } from './InvestmentFolderTemplateEditor'
import { EntityType, ModuleType, type FolderTemplateDataPageProps } from './types'

const ENTITY_TABS: { key: EntityType; label: string }[] = [
  { key: EntityType.LEAD, label: 'Leads' },
  { key: EntityType.CONTACT, label: 'Contacts' },
  { key: EntityType.ACCOUNT, label: 'Accounts' },
  { key: EntityType.OPPORTUNITY, label: 'Opportunities' }
]

const DATA_TEST_ID = 'folder-template-data-page'

type TabValue = EntityType | 'investments'

export const FolderTemplateDataPage: React.FC<FolderTemplateDataPageProps> = ({
  accessToken,
  moduleType,
  onBack,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>(EntityType.LEAD)

  const moduleLabel = moduleType === ModuleType.CRM ? 'customer' : 'investment'
  const showInvestmentsTab = moduleType === ModuleType.IRM

  return (
    <PageLayout
      headerIcon={FolderIcon}
      headerTitle="Folder Templates"
      headerDescription={`Configure initial folder structures for new ${moduleLabel} records`}
      onBack={onBack}
      data-testid={prefixDataTestId}
    >
      {/* Entity Type Tabs */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabValue)}>
        <TabsList data-testid={`${prefixDataTestId}-tabs`}>
          {ENTITY_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} data-testid={`${prefixDataTestId}-tab-${tab.key.toLowerCase()}`}>
              {tab.label}
            </TabsTrigger>
          ))}
          {showInvestmentsTab && (
            <TabsTrigger value="investments" data-testid={`${prefixDataTestId}-tab-investments`}>
              Investments
            </TabsTrigger>
          )}
        </TabsList>

        {ENTITY_TABS.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="gba:mt-6">
            <FolderTemplateEditor
              accessToken={accessToken}
              moduleType={moduleType}
              entityType={tab.key}
              prefixDataTestId={`${prefixDataTestId}-editor-${tab.key.toLowerCase()}`}
            />
          </TabsContent>
        ))}

        {showInvestmentsTab && (
          <TabsContent value="investments" className="gba:mt-6">
            <InvestmentFolderTemplateEditor
              accessToken={accessToken}
              prefixDataTestId={`${prefixDataTestId}-editor-investments`}
            />
          </TabsContent>
        )}
      </Tabs>
    </PageLayout>
  )
}

export default FolderTemplateDataPage
