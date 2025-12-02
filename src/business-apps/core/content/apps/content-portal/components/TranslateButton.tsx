import React, { useState, useEffect, useMemo } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger, Input } from '@newwork/nw-design-system'
import { Languages, Loader2, Search } from 'lucide-react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface TranslateButtonProps {
  accessToken: string
  onLanguageSelect: (languageId: string) => void
  targetLanguage: string | null
  isTranslating: boolean
  'data-testid'?: string
}

interface LanguageCatalogEntry {
  id: string
  value: string
  code?: string
}

export const TranslateButton: React.FC<TranslateButtonProps> = ({
  accessToken,
  onLanguageSelect,
  targetLanguage,
  isTranslating,
  'data-testid': dataTestId = 'portal-translate-button'
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [languages, setLanguages] = useState<LanguageCatalogEntry[]>([])
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const catalogClient = useCatalogManagerClient(accessToken)

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return languages
    }
    const query = searchQuery.toLowerCase()
    return languages.filter(
      lang =>
        lang.value.toLowerCase().includes(query) ||
        lang.code?.toLowerCase().includes(query) ||
        lang.id.toLowerCase().includes(query)
    )
  }, [languages, searchQuery])

  // Load available languages from catalog
  // Load when popover opens OR when targetLanguage is set (to display current language)
  useEffect(() => {
    const loadLanguages = async () => {
      // Load if popover is open OR if targetLanguage is set (to show current language name)
      if (!isPopoverOpen && !targetLanguage) return

      // Don't reload if already loaded
      if (languages.length > 0 && !isPopoverOpen) return

      setIsLoadingLanguages(true)
      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Language',
            version: 'v1'
          },
          {
            limit: 1000,
            offset: 0,
            returnTotalRecords: false
          }
        )

        const entries = (response.data || []).map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.code || entry.id,
          code: entry.code
        }))

        setLanguages(entries)
      } catch (error) {
        console.error('Error loading languages:', error)
      } finally {
        setIsLoadingLanguages(false)
      }
    }

    loadLanguages()
  }, [isPopoverOpen, targetLanguage, catalogClient])

  const handleLanguageSelect = (languageId: string) => {
    onLanguageSelect(languageId)
    setIsPopoverOpen(false)
    setSearchQuery('') // Reset search when language is selected
  }

  // Get display text - show target language name if translated
  const displayText = useMemo(() => {
    if (isTranslating) return 'Translating...'
    if (targetLanguage) {
      const targetLang = languages.find(l => l.id === targetLanguage)
      return targetLang?.value || 'Translated'
    }
    return 'Translate'
  }, [isTranslating, targetLanguage, languages])

  // Reset search when popover closes
  useEffect(() => {
    if (!isPopoverOpen) {
      setSearchQuery('')
    }
  }, [isPopoverOpen])

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={isTranslating} className="gba:gap-2" data-testid={dataTestId}>
          {isTranslating ? (
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
          ) : (
            <Languages className="gba:w-4 gba:h-4" />
          )}
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="gba:w-[300px] gba:p-2" data-testid={`${dataTestId}-popover`}>
        <div className="gba:space-y-2">
          <div className="gba:px-2 gba:py-1.5 gba:text-sm gba:font-semibold gba:text-foreground">
            Select Target Language
          </div>

          {/* Search Input */}
          <div className="gba:px-2">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-2 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-8"
                data-testid={`${dataTestId}-search-input`}
              />
            </div>
          </div>

          {isLoadingLanguages ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin gba:text-muted-foreground" />
            </div>
          ) : (
            <div className="gba:max-h-[300px] gba:overflow-y-auto">
              {filteredLanguages.length === 0 ? (
                <div className="gba:px-2 gba:py-4 gba:text-sm gba:text-muted-foreground gba:text-center">
                  {searchQuery ? 'No languages found' : 'No languages available'}
                </div>
              ) : (
                filteredLanguages.map(language => (
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
                ))
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default TranslateButton
