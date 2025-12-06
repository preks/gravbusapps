import React from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent
} from '@newwork/nw-design-system'
import { PiDatabase, PiTrendUp } from 'react-icons/pi'
import { CatalogEntryWithConfig } from '../types'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'

interface GroupTypeSelectorProps {
  catalogData: InvestmentCatalogData | null
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
  currentTypes: any[]
  onGroupSelect: (group: any) => void
  onTypeSelect: (type: any) => void
  onGeneralSelect: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'group-type-selector'

export const GroupTypeSelector: React.FC<GroupTypeSelectorProps> = ({
  catalogData,
  selectedGroup,
  selectedType,
  currentTypes,
  onGroupSelect,
  onTypeSelect,
  onGeneralSelect,
  prefixDataTestId
}) => {
  return (
    <TabSwitch
      value={selectedGroup?.id}
      onValueChange={value => {
        const group = catalogData?.investmentGroups?.find((g: any) => g.id === value)
        if (group) onGroupSelect(group)
      }}
      className="gba:w-full"
      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
    >
      <TabSwitchList>
        {catalogData?.investmentGroups?.map((group: any) => (
          <TabSwitchTrigger
            key={group.id}
            value={group.id}
            startIcon={<PiDatabase className="gba:w-4 gba:h-4" />}
            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-${group.code}`}
          >
            {group.value}
          </TabSwitchTrigger>
        ))}
      </TabSwitchList>

      {catalogData?.investmentGroups?.map((group: any) => (
        <TabSwitchContent key={group.id} value={group.id}>
          {selectedGroup?.id === group.id && (
            <div className="gba:space-y-2 gba:mt-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-selector`}>
              <Tabs
                value={selectedType?.id || 'general'}
                onValueChange={value => {
                  if (value === 'general') {
                    onGeneralSelect()
                  } else {
                    const type = currentTypes.find((t: any) => t.id === value)
                    if (type) onTypeSelect(type)
                  }
                }}
              >
                <TabsList className="gba:w-full gba:justify-start gba:flex-wrap">
                  <TabsTrigger
                    value="general"
                    startIcon={<PiDatabase className="gba:w-4 gba:h-4" />}
                    data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-general`}
                  >
                    General Group Settings
                  </TabsTrigger>

                  {currentTypes.map((type: any) => (
                    <TabsTrigger
                      key={type.id}
                      value={type.id}
                      startIcon={<PiTrendUp className="gba:w-4 gba:h-4" />}
                      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-${type.code}`}
                    >
                      {type.value}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
        </TabSwitchContent>
      ))}
    </TabSwitch>
  )
}
