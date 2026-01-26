import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Card, PageLayout, IconAvatar } from '@newwork/nw-design-system'
import { PiCaretRight } from 'react-icons/pi'
import { cn } from '@/common/utils/cn'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface SettingsCardEntry {
  label: string
  url?: string // For backward compatibility
  basePath?: string // New pattern: base platform path
  params?: Record<string, string> // New pattern: query parameters
  disabled?: boolean
  onClick?: () => void
}

export interface SettingsCard {
  title: string
  description?: string
  icon?: any // Icon component for IconAvatar
  iconSize?: 'sm' | 'md' | 'lg' | 'xl'
  entries?: SettingsCardEntry[]
}

export interface SettingsLayoutProps {
  headerPhosphorIcon: {
    icon: any
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'employee' | 'strategy' | 'premium'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    label?: string
  }
  headerLabel: string
  headerDescription?: string
  cards: SettingsCard[]
  className?: string
  prefixDataTestId?: string
  searchPlaceholder?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'SettingsLayout'

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  headerPhosphorIcon,
  headerLabel,
  headerDescription,
  cards,
  className,
  prefixDataTestId,
  searchPlaceholder,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { t } = useTranslation()

  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return cards

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()

    return cards
      .map((card: SettingsCard) => {
        const cardTitleMatches = card.title.toLowerCase().includes(normalizedSearchTerm)
        const cardDescriptionMatches = card.description?.toLowerCase().includes(normalizedSearchTerm)

        // Filter entries that match the search term
        const filteredEntries =
          card.entries?.filter((entry: SettingsCardEntry) =>
            entry.label.toLowerCase().includes(normalizedSearchTerm)
          ) || []

        // If specific entries match, prioritize showing only those entries
        if (filteredEntries.length > 0) {
          return {
            ...card,
            entries: filteredEntries
          }
        }

        // If no entries match but card title matches, show all entries
        else if (cardTitleMatches) {
          return card
        }

        // If no entries match and no title matches but description matches, show all entries
        else if (cardDescriptionMatches) {
          return card
        }

        // Nothing matches, exclude this card
        return null
      })
      .filter((card): card is SettingsCard => card !== null)
  }, [cards, searchTerm])

  return (
    <PageLayout
      headerIcon={headerPhosphorIcon.icon}
      headerTitle={headerLabel}
      headerDescription={headerDescription}
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
    >
      {/* Search Bar */}
      <div className="gba:mb-6">
        <Input
          placeholder={searchPlaceholder || t('common.search_placeholder', 'Search settings...')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="gba:w-full gba:max-w-md"
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Search-Input`}
        />
      </div>

      {/* Content */}
      <div>
        {filteredCards.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:text-center">
            <h4 className="gba:text-lg gba:font-medium gba:text-slate-600 gba:mb-2">
              {t('common.no_results_found', 'No results found')}
            </h4>
            <p className="gba:text-slate-500">{t('common.try_different_search', 'Try a different search term')}</p>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {filteredCards.map((card: SettingsCard, idx: number) => (
              <Card
                key={`${idx}-${card.title}`}
                className="gba:shadow-md hover:gba:shadow-lg gba:transition-shadow gba:duration-200 gba:rounded-xl gba:border gba:border-slate-200 gba:overflow-hidden"
                data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Card-${idx}`}
              >
                {/* Card Header */}
                <div className="gba:px-3">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
                    {card.icon && (
                      <IconAvatar
                        icon={card.icon}
                        variant={headerPhosphorIcon.variant || 'default'}
                        size={card.iconSize || 'md'}
                        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Card-${idx}-Icon`}
                      />
                    )}
                    <h3 className="gba:text-base gba:font-bold gba:text-blue-900">{card.title}</h3>
                  </div>

                  {/* Card Description */}
                  {card.description && (
                    <p className="gba:text-xs gba:text-slate-600 gba:leading-relaxed">{card.description}</p>
                  )}
                </div>

                {/* Separator */}
                <div className="gba:border-t gba:border-slate-200"></div>

                {/* Card Entries */}
                {card.entries && card.entries.length > 0 && (
                  <div className="gba:px-4 gba:pb-4">
                    <div className="gba:space-y-1">
                      {card.entries.map((entry, entryIndex) => (
                        <div
                          key={`${entryIndex}-${entry.label}`}
                          className={cn(
                            'gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:transition-all gba:duration-200',
                            entry.disabled
                              ? 'gba:bg-slate-50 gba:border-slate-200 gba:cursor-not-allowed gba:opacity-50'
                              : 'gba:bg-slate-50 gba:border-slate-200 hover:gba:bg-blue-50 hover:gba:border-blue-200 gba:cursor-pointer'
                          )}
                          onClick={() => {
                            if (!entry.disabled) {
                              if (entry.onClick) {
                                entry.onClick()
                                return
                              }
                              // Use new pattern with basePath and params, or fallback to legacy url
                              const finalUrl = entry.basePath
                                ? buildPlatformUrl(entry.basePath, entry.params)
                                : entry.url

                              if (finalUrl) {
                                navigateTo(finalUrl)
                              }
                            }
                          }}
                          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Entry-${idx}-${entryIndex}`}
                        >
                          <span
                            className={cn(
                              'gba:text-sm gba:font-medium',
                              entry.disabled ? 'gba:text-slate-400' : 'gba:text-slate-700'
                            )}
                          >
                            {entry.label}
                          </span>
                          <PiCaretRight
                            size={16}
                            className={cn(entry.disabled ? 'gba:text-slate-300' : 'gba:text-slate-500')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
