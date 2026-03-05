import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { AiButton, Popover, PopoverContent, PopoverAnchor, Input } from '@newwork/nw-design-system'
import { Languages, Loader2, Search } from 'lucide-react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import type { DetectedLanguage } from './useContentTranslation'

const DEFAULT_LABELS = {
  language: 'Language',
  detecting: 'Detecting...',
  translating: 'Translating...',
  selectTarget: 'Select Target Language',
  searchPlaceholder: 'Search languages...',
  noLanguagesFound: 'No languages found',
  noLanguagesAvailable: 'No languages available'
} as const

export interface AiTranslationButtonLabels {
  language?: string
  detecting?: string
  translating?: string
  selectTarget?: string
  searchPlaceholder?: string
  noLanguagesFound?: string
  noLanguagesAvailable?: string
}

export interface AiTranslationButtonProps {
  detectedLanguage: DetectedLanguage | null
  targetLanguage: string | null
  isDetecting: boolean
  isTranslating?: boolean
  accessToken: string
  onLanguageSelect: (languageId: string) => void
  labels?: AiTranslationButtonLabels
  'data-testid'?: string
}

interface LanguageCatalogEntry {
  id: string
  value: string
  code?: string
}

// Priority languages that should always appear at the top
const PRIORITY_LANGUAGE_CODES = ['En', 'De', 'Ro']
const PAGE_SIZE = 50

export const AiTranslationButton: React.FC<AiTranslationButtonProps> = ({
  detectedLanguage,
  targetLanguage,
  isDetecting,
  isTranslating = false,
  accessToken,
  onLanguageSelect,
  labels: labelsProp,
  'data-testid': dataTestId = 'ai-translation-button'
}) => {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [languages, setLanguages] = useState<LanguageCatalogEntry[]>([])
  const [priorityLanguages, setPriorityLanguages] = useState<LanguageCatalogEntry[]>([])
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const catalogClient = useCatalogManagerClient(accessToken)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Load priority languages (En, De, Ro) - always at the top
  useEffect(() => {
    const loadPriorityLanguages = async () => {
      if (!isPopoverOpen && !targetLanguage) return

      try {
        // Load all languages first, then filter for priority ones
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Language',
            version: 'v1'
          },
          {
            limit: 200, // Load enough to find priority languages
            offset: 0,
            returnTotalRecords: false
          }
        )

        const allEntries = (response.data || []).map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.code || entry.id,
          code: entry.code
        }))

        // Find priority languages by code (case-insensitive)
        const priorityEntries: LanguageCatalogEntry[] = []
        for (const priorityCode of PRIORITY_LANGUAGE_CODES) {
          const found = allEntries.find(entry => entry.code?.toLowerCase() === priorityCode.toLowerCase())
          if (found) {
            priorityEntries.push(found)
          }
        }

        setPriorityLanguages(priorityEntries)
      } catch (error) {
        console.error('Error loading priority languages:', error)
        setPriorityLanguages([])
      }
    }

    loadPriorityLanguages()
  }, [isPopoverOpen, targetLanguage, catalogClient])

  // Load languages from catalog with pagination and search
  const loadLanguages = useCallback(
    async (isLoadMore: boolean = false, searchTerm: string = '', currentOffset: number = 0) => {
      if (!isPopoverOpen && !targetLanguage && !isLoadMore) return

      setIsLoadingLanguages(true)
      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Language',
            version: 'v1'
          },
          {
            limit: PAGE_SIZE,
            offset: currentOffset,
            returnTotalRecords: true,
            ...(searchTerm && { searchCriteria: searchTerm })
          }
        )

        const entries = (response.data || []).map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.code || entry.id,
          code: entry.code
        }))

        // Filter out priority languages from regular results (by ID to avoid duplicates)
        const priorityIds = new Set(priorityLanguages.map(lang => lang.id))
        const filteredEntries = entries.filter(entry => !priorityIds.has(entry.id))

        if (isLoadMore) {
          setLanguages(prev => {
            // Also filter out duplicates by ID
            const existingIds = new Set(prev.map(lang => lang.id))
            const newEntries = filteredEntries.filter(entry => !existingIds.has(entry.id))
            return [...prev, ...newEntries]
          })
        } else {
          setLanguages(filteredEntries)
        }

        const total = response.paging?.totalRecords || 0
        const newOffset = currentOffset + filteredEntries.length
        setOffset(newOffset)
        setHasMore(newOffset < total)
      } catch (error) {
        console.error('Error loading languages:', error)
      } finally {
        setIsLoadingLanguages(false)
      }
    },
    [isPopoverOpen, targetLanguage, catalogClient, priorityLanguages]
  )

  // Initial load when popover opens or targetLanguage is set
  useEffect(() => {
    if (isPopoverOpen || targetLanguage) {
      setOffset(0)
      loadLanguages(false, debouncedSearchQuery, 0)
    }
  }, [isPopoverOpen, targetLanguage, debouncedSearchQuery, loadLanguages])

  // Reset pagination when search changes
  useEffect(() => {
    if (isPopoverOpen) {
      setOffset(0)
      setLanguages([])
    }
  }, [debouncedSearchQuery, isPopoverOpen])

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (!isLoadingLanguages && hasMore) {
      loadLanguages(true, debouncedSearchQuery, offset)
    }
  }, [isLoadingLanguages, hasMore, loadLanguages, debouncedSearchQuery, offset])

  // Infinite scroll sentinel
  const sentinelRef = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingLanguages
  })

  // Combine priority languages and regular languages
  const displayLanguages = useMemo(() => {
    const searchLower = debouncedSearchQuery.toLowerCase().trim()

    // Filter priority languages - show all if no search, or only matching ones if searching
    const priorityToShow =
      searchLower === ''
        ? priorityLanguages
        : priorityLanguages.filter(
            lang =>
              lang.value.toLowerCase().includes(searchLower) ||
              lang.code?.toLowerCase().includes(searchLower) ||
              lang.id.toLowerCase().includes(searchLower)
          )

    // Sort regular languages alphabetically by value
    const sortedLanguages = [...languages].sort((a, b) => {
      const valueA = (a.value || '').toLowerCase()
      const valueB = (b.value || '').toLowerCase()
      return valueA.localeCompare(valueB)
    })

    // Priority languages always at the top, then alphabetically sorted regular languages
    return [...priorityToShow, ...sortedLanguages]
  }, [priorityLanguages, languages, debouncedSearchQuery])

  const handleLanguageSelect = (languageId: string) => {
    onLanguageSelect(languageId)
    setIsPopoverOpen(false)
    setSearchQuery('') // Reset search when language is selected
  }

  // Get display text - show target language if translated, otherwise show detected language
  const displayText = useMemo(() => {
    if (isDetecting) return labels.detecting
    if (isTranslating) return labels.translating
    if (targetLanguage) {
      const targetLang = [...priorityLanguages, ...languages].find(l => l.id === targetLanguage)
      return targetLang?.value || targetLanguage
    }
    return detectedLanguage?.catalogEntryValue || detectedLanguage?.languageId || labels.language
  }, [isDetecting, isTranslating, targetLanguage, priorityLanguages, languages, detectedLanguage, labels])

  // Reset search and pagination when popover closes
  useEffect(() => {
    if (!isPopoverOpen) {
      setSearchQuery('')
      setOffset(0)
      setLanguages([])
      setHasMore(true)
    }
  }, [isPopoverOpen])

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverAnchor asChild>
        <AiButton
          variant="default"
          size="sm"
          showIcon={true}
          icon={
            isDetecting || isTranslating ? (
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            ) : (
              <Languages className="gba:w-4 gba:h-4" />
            )
          }
          autoExecuteSingleAction={false}
          emptyStateBehavior="enable"
          disabled={isDetecting || isTranslating}
          onClick={() => setIsPopoverOpen(true)}
          data-testid={dataTestId}
        >
          {displayText}
        </AiButton>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        className="gba:w-[300px] gba:p-2"
        data-testid={`${dataTestId}-popover`}
      >
        <div className="gba:space-y-2">
          <div className="gba:px-2 gba:py-1.5 gba:text-sm gba:font-semibold gba:text-foreground">
            {labels.selectTarget}
          </div>

          {/* Search Input */}
          <div className="gba:px-2">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-2 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                type="text"
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-8"
                data-testid={`${dataTestId}-search-input`}
              />
            </div>
          </div>

          {isLoadingLanguages && languages.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin gba:text-muted-foreground" />
            </div>
          ) : (
            <div className="gba:max-h-[300px] gba:overflow-y-auto">
              {displayLanguages.length === 0 ? (
                <div className="gba:px-2 gba:py-4 gba:text-sm gba:text-muted-foreground gba:text-center">
                  {debouncedSearchQuery ? labels.noLanguagesFound : labels.noLanguagesAvailable}
                </div>
              ) : (
                <>
                  {displayLanguages.map(language => (
                    <button
                      key={language.id}
                      onClick={() => handleLanguageSelect(language.id)}
                      className={`gba:w-full gba:px-2 gba:py-2 gba:text-left gba:text-sm gba:rounded-md hover:gba:bg-accent hover:gba:text-accent-foreground gba:transition-colors gba:cursor-pointer ${
                        targetLanguage === language.id ? 'gba:bg-accent gba:font-semibold' : ''
                      }`}
                      data-testid={`${dataTestId}-language-${language.id}`}
                    >
                      {language.value}
                    </button>
                  ))}
                  {/* Infinite scroll sentinel */}
                  {hasMore && (
                    <div ref={sentinelRef} className="gba:h-4 gba:w-full" data-testid={`${dataTestId}-sentinel`} />
                  )}
                  {isLoadingLanguages && languages.length > 0 && (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-4">
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-muted-foreground" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default AiTranslationButton
