import React, { useState } from 'react'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
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
    <div className="gba:p-6 gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} data-testid={`${prefixDataTestId}-back-button`}>
            <ArrowLeftIcon size={20} />
          </Button>
        )}
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:m-0">Folder Templates</h1>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            Configure initial folder structures for new {moduleLabel} records
          </p>
        </div>
      </div>

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
    </div>
  )
}

export default FolderTemplateDataPage
