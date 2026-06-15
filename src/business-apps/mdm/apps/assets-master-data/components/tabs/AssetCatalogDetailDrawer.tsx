import React, { useMemo } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon, PencilSimpleLineIcon, TagIcon } from '@phosphor-icons/react'
import SheetWrapperComponent from '@/business-apps/mdm/apps/generic-components/sheet-wrapper/SheetWrapperComponent'
import AssetCatalogEntryForm from '@/business-apps/mdm/forms/asset-catalog-entry-form/AssetCatalogEntryForm'
import type { AssetCatalogConfig, AssetCatalogEntry } from '../../types'
import { ASSET_BRAND_CATALOG } from '../../types'
import translations from '../../_i18n'

interface AssetCatalogDetailDrawerProps {
  accessToken: string
  config: AssetCatalogConfig
  dataTestId: string
  isDrawerVisible: boolean
  loadEntries: () => void
  onOpenChange: (openStatus: boolean) => void
  prefixDataTestId?: string
  selectedEntry: AssetCatalogEntry
  usedCodes: string[]
}

const AssetCatalogDetailDrawer: React.FC<AssetCatalogDetailDrawerProps> = ({
  accessToken,
  config,
  dataTestId,
  isDrawerVisible,
  loadEntries,
  onOpenChange,
  prefixDataTestId,
  selectedEntry,
  usedCodes
}) => {
  const { t } = useTranslation(translations)

  const drawerItems = useMemo(
    () => [
      {
        icon: <InfoIcon />,
        title: t('drawer-section-basic-info'),
        items: [
          { label: t('drawer-label-name'), value: selectedEntry.value },
          { label: t('drawer-label-code'), value: selectedEntry.code || '-' },
          ...(config.catalogIdentifier === ASSET_BRAND_CATALOG
            ? [{ label: t('drawer-label-asset-category'), value: selectedEntry.parentEntryId ?? '-' }]
            : []),
          { label: t('drawer-label-description'), value: selectedEntry.additionalValue1 ?? '-' }
        ]
      }
    ],
    [config.catalogIdentifier, selectedEntry, t]
  )

  return (
    <SheetWrapperComponent
      prefixDataTestId={dataTestId}
      isDrawerVisible={isDrawerVisible}
      onOpenChange={onOpenChange}
      title={t(config.sheetTitleKey)}
      titleIcon={TagIcon}
      drawerItems={drawerItems}
      extraContent={
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <TagIcon className="gba:h-4 gba:w-4" />
          {t(config.sheetExtraContentKey)}
        </div>
      }
      footerButtons={[
        <AssetCatalogEntryForm
          key={selectedEntry.id}
          childAddButton={
            <Button
              onClick={event => {
                event.stopPropagation()
              }}
              data-testid={`${dataTestId}-drawer-edit-button`}
            >
              <PencilSimpleLineIcon /> {t(config.editButtonKey)}
            </Button>
          }
          refetch={loadEntries}
          accessToken={accessToken}
          prefixDataTestId={prefixDataTestId}
          catalogIdentifier={config.catalogIdentifier}
          catalogVersion={config.version}
          catalogName={t(config.titleKey)}
          assetCatalogEntry={{
            id: selectedEntry.id,
            code: selectedEntry.code,
            value: selectedEntry.value,
            parentEntryId: selectedEntry.parentEntryId,
            description: selectedEntry.additionalValue1 ?? '',
            translations: selectedEntry.translations
          }}
          isDrawerActive
          usedCodes={usedCodes}
        />
      ]}
    />
  )
}

export { AssetCatalogDetailDrawer }
