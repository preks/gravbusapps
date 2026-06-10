import React, { useMemo, useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Input, PageLayout, useTranslation } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from '../_i18n'
import { ExportEntityCard } from './ExportEntityCard'

export interface ExportEntitySelectorItem {
  entityType: string
  title: string
  icon: PhosphorIcon
}

export interface ExportEntitySelectorPageProps {
  headerIcon: PhosphorIcon
  headerLabel: string
  headerDescription: string
  searchPlaceholder: string
  prefixDataTestId: string
  items: ExportEntitySelectorItem[]
  onSelectEntity: (entityType: string) => void
  onBack?: () => void
  iconVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'employee' | 'strategy' | 'premium'
}

const PAGE_TEST_ID = 'ExportEntitySelectorPage'

export const ExportEntitySelectorPage: React.FC<ExportEntitySelectorPageProps> = ({
  headerIcon,
  headerLabel,
  headerDescription,
  searchPlaceholder,
  prefixDataTestId,
  items,
  onSelectEntity,
  onBack,
  iconVariant = 'info'
}) => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items
    }

    const normalized = searchTerm.toLowerCase().trim()
    return items.filter(item => item.title.toLowerCase().includes(normalized))
  }, [items, searchTerm])

  return (
    <PageLayout
      headerIcon={headerIcon}
      headerTitle={headerLabel}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={formatDataTestId(prefixDataTestId, PAGE_TEST_ID)}
    >
      <div className="gba:mb-4">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          className="gba:w-full gba:max-w-md"
          data-testid={formatDataTestId(prefixDataTestId, `${PAGE_TEST_ID}-Search`)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <p
          className="gba:text-sm gba:text-muted-foreground"
          data-testid={formatDataTestId(prefixDataTestId, `${PAGE_TEST_ID}-Empty`)}
        >
          {t('selector-no-results')}
        </p>
      ) : (
        <div
          className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-3"
          data-testid={formatDataTestId(prefixDataTestId, `${PAGE_TEST_ID}-Grid`)}
        >
          {filteredItems.map(item => (
            <ExportEntityCard
              key={item.entityType}
              entityType={item.entityType}
              title={item.title}
              icon={item.icon}
              iconVariant={iconVariant}
              onSelect={() => onSelectEntity(item.entityType)}
              prefixDataTestId={prefixDataTestId}
            />
          ))}
        </div>
      )}
    </PageLayout>
  )
}

export default ExportEntitySelectorPage
