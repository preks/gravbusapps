import React from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { DatabaseIcon, TrendUpIcon, DropIcon } from '@phosphor-icons/react'
import { CatalogEntryRaw, CatalogEntryWithConfig } from '../types'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'

interface GroupTypeSelectorProps {
  catalogData: InvestmentCatalogData | null
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
  selectedLiquidFundType: CatalogEntryWithConfig | null
  currentTypes: CatalogEntryRaw[]
  currentLiquidFundTypes: CatalogEntryRaw[]
  onGroupSelect: (group: CatalogEntryRaw) => void
  onTypeSelect: (type: CatalogEntryRaw) => void
  onLiquidFundTypeSelect: (liquidFundType: CatalogEntryRaw) => void
  onGeneralSelect: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'group-type-selector'

export const GroupTypeSelector: React.FC<GroupTypeSelectorProps> = ({
  catalogData,
  selectedGroup,
  selectedType,
  selectedLiquidFundType,
  currentTypes,
  currentLiquidFundTypes,
  onGroupSelect,
  onTypeSelect,
  onLiquidFundTypeSelect,
  onGeneralSelect,
  prefixDataTestId
}) => {
  // Check if selected group is LIQUID_FUND
  const isLiquidFundGroup = selectedGroup?.code === 'LIQUID_FUND'
  const selectedGroupName = selectedGroup?.value || 'investment group'
  const selectedTypeName = selectedType?.value || 'investment type'

  return (
    <TabSwitch
      value={selectedGroup?.id}
      onValueChange={value => {
        const group = catalogData?.investmentGroups?.find(g => g.id === value)
        if (group) onGroupSelect(group)
      }}
      className="gba:w-full"
      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
    >
      <div className="gba:space-y-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap">
          <div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <DatabaseIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <h2 className="gba:text-sm gba:font-semibold gba:m-0">Investment Group</h2>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
              Choose the group whose defaults or child configurations you want to edit.
            </p>
          </div>
          {selectedGroup && <Badge variant="secondary">Selected: {selectedGroup.value}</Badge>}
        </div>

        <TabSwitchList>
          {catalogData?.investmentGroups?.map(group => (
            <TabSwitchTrigger
              key={group.id}
              value={group.id}
              startIcon={<DatabaseIcon className="gba:w-4 gba:h-4" />}
              data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-${group.code}`}
            >
              {group.value}
            </TabSwitchTrigger>
          ))}
        </TabSwitchList>

        {selectedGroup && (
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap gba:border-t gba:border-border gba:pt-4">
            <div>
              <h3 className="gba:text-sm gba:font-medium gba:m-0">Group-level field defaults</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                Edit the fields inherited by investment types unless they define their own configuration.
              </p>
            </div>
            <Button
              type="button"
              variant={selectedType ? 'outline' : 'default'}
              onClick={onGeneralSelect}
              data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-defaults`}
            >
              {selectedType ? 'Edit Group Defaults' : 'Editing Group Defaults'}
            </Button>
          </div>
        )}
      </div>

      {catalogData?.investmentGroups?.map(group => (
        <TabSwitchContent key={group.id} value={group.id}>
          {selectedGroup?.id === group.id && (
            <div className="gba:space-y-4 gba:mt-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-selector`}>
              <div className="gba:space-y-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap">
                  <div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <TrendUpIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      <h3 className="gba:text-sm gba:font-semibold gba:m-0">Investment Type</h3>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                      Choose a type under {selectedGroupName} to configure type-specific fields.
                    </p>
                  </div>
                  <Badge variant="outline">{currentTypes.length} types</Badge>
                </div>

                <Tabs
                  value={selectedType?.id || ''}
                  onValueChange={value => {
                    const type = currentTypes.find(t => t.id === value)
                    if (type) onTypeSelect(type)
                  }}
                >
                  <TabsList className="gba:w-full gba:justify-start gba:flex-wrap">
                    {currentTypes.map(type => (
                      <TabsTrigger
                        key={type.id}
                        value={type.id}
                        startIcon={<TrendUpIcon className="gba:w-4 gba:h-4" />}
                        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-${type.code}`}
                      >
                        {type.value}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {currentTypes.length === 0 && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                    This group has no investment types. Use the group-level defaults section above.
                  </p>
                )}
              </div>

              {/* Show liquid fund types as a third level if LIQUID_FUND group and a type is selected */}
              {isLiquidFundGroup && selectedType && currentLiquidFundTypes.length > 0 && (
                <div
                  className="gba:space-y-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4"
                  data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-liquid-fund-type-selector`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap">
                    <div>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <DropIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                        <h3 className="gba:text-sm gba:font-semibold gba:m-0">Liquid Fund Type</h3>
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                        Configure the most specific fields for liquid fund records under {selectedTypeName}.
                      </p>
                    </div>
                    <Badge variant="outline">{currentLiquidFundTypes.length} liquid fund types</Badge>
                  </div>

                  <Tabs
                    value={selectedLiquidFundType?.id || ''}
                    onValueChange={value => {
                      const liquidFundType = currentLiquidFundTypes.find(lft => lft.id === value)
                      if (liquidFundType) onLiquidFundTypeSelect(liquidFundType)
                    }}
                  >
                    <TabsList className="gba:w-full gba:justify-start gba:flex-wrap">
                      {currentLiquidFundTypes.map(liquidFundType => (
                        <TabsTrigger
                          key={liquidFundType.id}
                          value={liquidFundType.id}
                          startIcon={<DropIcon className="gba:w-4 gba:h-4" />}
                          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-liquid-fund-type-${liquidFundType.code}`}
                        >
                          {liquidFundType.value}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          )}
        </TabSwitchContent>
      ))}
    </TabSwitch>
  )
}
