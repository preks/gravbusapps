import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Toaster, useTranslation } from '@newwork/nw-design-system'
import { PackageIcon } from '@phosphor-icons/react'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTabQueryParamSync } from '@/business-apps/mdm/hooks/useTabQueryParamSync'
import { AssetCatalogTab } from './components/tabs'
import translations from './_i18n'
import {
  ASSET_BRAND_CATALOG,
  ASSET_CATALOG_VERSION,
  ASSET_CATEGORY_CATALOG,
  ASSET_CONDITION_CATALOG,
  DISPOSAL_OUTCOME_CATALOG,
  SANITIZATION_METHOD_CATALOG,
  AssetsMasterDataTab,
  type AssetCatalogConfig
} from './types'

export interface AssetsMasterDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'AssetsMasterData'

const ASSET_CATALOGS: AssetCatalogConfig[] = [
  {
    catalogIdentifier: ASSET_BRAND_CATALOG,
    version: ASSET_CATALOG_VERSION,
    tabValue: AssetsMasterDataTab.ASSET_BRANDS,
    titleKey: 'asset-brand-title',
    descriptionKey: 'asset-brand-description',
    searchPlaceholderKey: 'asset-brand-search-placeholder',
    addButtonKey: 'asset-brand-add-button',
    editButtonKey: 'edit-button',
    deleteTitleKey: 'asset-brand-delete-title',
    sheetTitleKey: 'asset-brand-sheet-title',
    sheetExtraContentKey: 'asset-brand-sheet-extra-content',
    loadErrorKey: 'asset-brand-load-error',
    viewActionPrefix: 'asset-brand',
    formName: 'AssetBrand'
  },
  {
    catalogIdentifier: ASSET_CATEGORY_CATALOG,
    version: ASSET_CATALOG_VERSION,
    tabValue: AssetsMasterDataTab.ASSET_CATEGORIES,
    titleKey: 'asset-category-title',
    descriptionKey: 'asset-category-description',
    searchPlaceholderKey: 'asset-category-search-placeholder',
    addButtonKey: 'asset-category-add-button',
    editButtonKey: 'edit-button',
    deleteTitleKey: 'asset-category-delete-title',
    sheetTitleKey: 'asset-category-sheet-title',
    sheetExtraContentKey: 'asset-category-sheet-extra-content',
    loadErrorKey: 'asset-category-load-error',
    viewActionPrefix: 'asset-category',
    formName: 'AssetCategory'
  },
  {
    catalogIdentifier: ASSET_CONDITION_CATALOG,
    version: ASSET_CATALOG_VERSION,
    tabValue: AssetsMasterDataTab.ASSET_CONDITIONS,
    titleKey: 'asset-condition-title',
    descriptionKey: 'asset-condition-description',
    searchPlaceholderKey: 'asset-condition-search-placeholder',
    addButtonKey: 'asset-condition-add-button',
    editButtonKey: 'edit-button',
    deleteTitleKey: 'asset-condition-delete-title',
    sheetTitleKey: 'asset-condition-sheet-title',
    sheetExtraContentKey: 'asset-condition-sheet-extra-content',
    loadErrorKey: 'asset-condition-load-error',
    viewActionPrefix: 'asset-condition',
    formName: 'AssetCondition'
  },
  {
    catalogIdentifier: SANITIZATION_METHOD_CATALOG,
    version: ASSET_CATALOG_VERSION,
    tabValue: AssetsMasterDataTab.SANITIZATION_METHODS,
    titleKey: 'sanitization-method-title',
    descriptionKey: 'sanitization-method-description',
    searchPlaceholderKey: 'sanitization-method-search-placeholder',
    addButtonKey: 'sanitization-method-add-button',
    editButtonKey: 'edit-button',
    deleteTitleKey: 'sanitization-method-delete-title',
    sheetTitleKey: 'sanitization-method-sheet-title',
    sheetExtraContentKey: 'sanitization-method-sheet-extra-content',
    loadErrorKey: 'sanitization-method-load-error',
    viewActionPrefix: 'sanitization-method',
    formName: 'SanitizationMethod'
  },
  {
    catalogIdentifier: DISPOSAL_OUTCOME_CATALOG,
    version: ASSET_CATALOG_VERSION,
    tabValue: AssetsMasterDataTab.DISPOSAL_OUTCOMES,
    titleKey: 'disposal-outcome-title',
    descriptionKey: 'disposal-outcome-description',
    searchPlaceholderKey: 'disposal-outcome-search-placeholder',
    addButtonKey: 'disposal-outcome-add-button',
    editButtonKey: 'edit-button',
    deleteTitleKey: 'disposal-outcome-delete-title',
    sheetTitleKey: 'disposal-outcome-sheet-title',
    sheetExtraContentKey: 'disposal-outcome-sheet-extra-content',
    loadErrorKey: 'disposal-outcome-load-error',
    viewActionPrefix: 'disposal-outcome',
    formName: 'DisposalOutcome'
  }
]

const AssetsMasterData: React.FC<AssetsMasterDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation(translations)
  const [selectedTab, onChangeTab] = useTabQueryParamSync(AssetsMasterDataTab, AssetsMasterDataTab.ASSET_BRANDS)

  return (
    <PageLayout
      headerIcon={<PackageIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={t('page-title')}
      className={className ?? ''}
      contentContainer={
        <div className="gba:box-border gba:h-full gba:min-h-0 gba:w-full gba:overflow-x-hidden gba:overflow-y-auto gba:p-6">
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                {ASSET_CATALOGS.map(config => (
                  <TabsTrigger key={config.tabValue} value={config.tabValue}>
                    {t(`tab-${config.tabValue}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ASSET_CATALOGS.map(config => (
                <TabsContent key={config.tabValue} value={config.tabValue}>
                  <AssetCatalogTab
                    {...contextProps}
                    config={config}
                    prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      }
    />
  )
}

export default AssetsMasterData
export { AssetsMasterData }
export { AssetsMasterDataTab }
