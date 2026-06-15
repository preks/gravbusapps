import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { HrSettingsCard, HrSettingsCardProps } from './components/HrSettingsCard'
import { useHrSettingsCards } from './hooks/useHrSettingsCards'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface HrSettingsProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'HrSettings'

const HrSettings: React.FC<HrSettingsProps> = ({ className, prefixDataTestId }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const allCards = useHrSettingsCards()
  const { t } = useTranslation()

  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return allCards

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()

    return allCards.filter((card: HrSettingsCardProps) => {
      // Search in card title
      if (card.title.toLowerCase().includes(normalizedSearchTerm)) return true

      // Search in card description
      if (card.description?.toLowerCase().includes(normalizedSearchTerm)) return true

      // Search in card entries
      if (card.entries?.some(entry => entry.label.toLowerCase().includes(normalizedSearchTerm))) return true

      return false
    })
  }, [allCards, searchTerm])

  return (
    <PageLayout
      headerIcon={<UsersThreeIcon weight="duotone" className="gba:text-decorative" />}
      headerLabel={getTranslationFromI18nKeyAndLabel('translation:hr.hr_settings', 'HR Settings')}
      className={`${className ?? ''} gba:!overflow-y-visible`}
      pageHeaderRight={
        <div className="gba:relative gba:w-80">
          <MagnifyingGlassIcon
            size={16}
            className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
          />
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('translation:actions.search', 'Search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:pl-9"
            data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Search-Input`}
          />
        </div>
      }
      contentContainer={
        <div
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
          className="no-scrollbar gba:h-full gba:w-full gba:overflow-auto gba:bg-muted/30 gba:p-4 gba:pb-6"
        >
          {filteredCards.length === 0 ? (
            <div className="gba:flex gba:h-64 gba:flex-col gba:items-center gba:justify-center gba:text-center">
              <h4 className="gba:mb-2 gba:text-lg gba:font-semibold gba:text-muted-foreground">
                {t('common.no_results_found')}
              </h4>
              <p className="gba:m-0 gba:text-muted-foreground">{t('common.try_different_search')}</p>
            </div>
          ) : (
            <div className="gba:grid gba:grid-cols-6 gba:gap-4">
              {filteredCards.map((card: HrSettingsCardProps) => (
                <HrSettingsCard
                  key={card.title}
                  {...card}
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              ))}
            </div>
          )}
        </div>
      }
    />
  )
}

export default HrSettings
export { HrSettings }
