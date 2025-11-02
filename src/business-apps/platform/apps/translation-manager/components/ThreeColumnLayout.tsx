import React, { useState, useMemo, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system'
import ScopeTree from './ScopeTree'
import TranslationKeyList from './TranslationKeyList'
import TranslationEditorPanel from './TranslationEditorPanel'
import TranslationsTable from './TranslationsTable'
import type { TranslationScope } from '../hooks/useTranslationTree'
import type { UseTranslationFilesResult } from '../hooks/useTranslationFiles'
import { listMessageIds, getMessagePattern, setMessagePattern } from '../utils/fluent'
import { extractVariablesFromMessage } from '../utils/variableExtractor'
import { parseFTL } from '../utils/fluent'
import { useTranslationCache } from '../hooks/useTranslationCache'

interface ThreeColumnLayoutProps {
  scopes: TranslationScope[]
  translationFiles: UseTranslationFilesResult
  isLoading: boolean
  branch: string
}

const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({ scopes, translationFiles, isLoading, branch }) => {
  const [selectedScope, setSelectedScope] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [localeFilter, setLocaleFilter] = useState<string>('all') // NEW: Locale filter
  const [viewMode, setViewMode] = useState<'single' | 'table'>('single') // NEW: View toggle

  // Use translation cache
  const translationCache = useTranslationCache(selectedScope)

  // Get current scope
  const currentScope = useMemo(() => scopes.find(s => s.path === selectedScope), [scopes, selectedScope])

  // Get all keys for selected scope with review status
  const keys = useMemo(() => {
    if (!currentScope) return []

    const allKeys = new Set<string>()
    currentScope.files.forEach(filePath => {
      const file = translationFiles.files.get(filePath)
      if (file) {
        const ids = listMessageIds(file.ast)
        ids.forEach(k => allKeys.add(k))
      }
    })

    return Array.from(allKeys)
      .sort()
      .map(id => {
        // Check if key needs review (any file needs review)
        const needsReview = currentScope.files.some(filePath => {
          const file = translationFiles.files.get(filePath)
          return file?.needsReview || false
        })

        // Check if key is reviewed (in cache)
        const isReviewed = translationCache.isKeyReviewed(id)

        return {
          id,
          needsReview,
          isReviewed
        }
      })
  }, [currentScope, translationFiles.files, translationCache])

  // Get patterns for selected key (ALL locales or filtered)
  const { localePatterns, availableVariables, allLocales } = useMemo(() => {
    if (!selectedKey || !currentScope) {
      return {
        localePatterns: [],
        availableVariables: [],
        allLocales: []
      }
    }

    const patterns: Array<{ locale: string; pattern: any; isSource: boolean; needsReview?: boolean }> = []

    // Get all locales for this scope
    const locales = currentScope.files
      .map(path => {
        const filename = path.split('/').pop() || ''
        return filename.replace('.ftl', '')
      })
      .sort()

    // Apply locale filter
    const filteredLocales = localeFilter === 'all' ? locales : locales.filter(l => l === localeFilter)

    // Get pattern for each locale
    filteredLocales.forEach(locale => {
      const file = translationFiles.files.get(currentScope.files.find(f => f.includes(`${locale}.ftl`)) || '')
      if (file) {
        // Check cache first
        const cachedPattern = translationCache.getCachedTranslation(selectedKey, locale)
        const pattern = cachedPattern || getMessagePattern(file.ast, selectedKey)

        patterns.push({
          locale,
          pattern,
          isSource: locale === 'en-US',
          needsReview: file.needsReview
        })
      }
    })

    // Extract variables from source
    const vars = new Set<string>()
    const sourceFile = translationFiles.files.get(currentScope.files.find(f => f.includes('en-US.ftl')) || '')
    if (sourceFile) {
      const baseId = selectedKey.split('[')[0].split('.')[0]
      const extracted = extractVariablesFromMessage(sourceFile.ast, baseId)
      extracted.forEach(v => vars.add(v))
    }

    return {
      localePatterns: patterns,
      availableVariables: Array.from(vars).sort(),
      allLocales: locales
    }
  }, [selectedKey, currentScope, translationFiles.files, localeFilter, translationCache])

  // Handle pattern change for any locale
  const handlePatternChange = (locale: string, newPattern: any) => {
    if (!selectedKey || !currentScope) return

    // Find file path
    const filePath = currentScope.files.find(f => f.includes(`${locale}.ftl`)) || ''
    if (!filePath) return

    // Cache the change WITH filePath for tracking touched files
    translationCache.cacheTranslation(selectedKey, locale, newPattern, filePath)

    // Also update in translationFiles for immediate UI feedback
    const file = translationFiles.files.get(filePath)

    if (file) {
      const updatedAST = parseFTL(file.content)
      setMessagePattern(updatedAST, selectedKey, newPattern)
      translationFiles.updateFileAST(file.path, updatedAST)
    }
  }

  // Mark current key as reviewed
  const handleMarkReviewed = () => {
    if (!selectedKey) return
    const isReviewed = translationCache.isKeyReviewed(selectedKey)
    translationCache.markKeyReviewed(selectedKey, !isReviewed)
  }

  // Auto-select first key when scope changes
  useEffect(() => {
    if (keys.length > 0 && !selectedKey) {
      setSelectedKey(keys[0].id)
    }
  }, [keys, selectedKey])

  // Handle save (TODO: Implement actual save to Git)
  const handleSave = () => {
    console.log('[ThreeColumnLayout] Save requested for key:', selectedKey)
    // TODO: Use translationFiles.saveFile
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full">
      {/* Top Bar: Filters & View Toggle */}
      {selectedScope && (
        <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:bg-card gba:border gba:rounded-lg">
          {/* Locale Filter */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium">Locale:</span>
            <Select value={localeFilter} onValueChange={setLocaleFilter}>
              <SelectTrigger className="gba:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {allLocales.map(locale => (
                  <SelectItem key={locale} value={locale}>
                    {locale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto">
            <span className="gba:text-sm gba:font-medium">View:</span>
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('single')}
            >
              Single Key
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              All Keys (Table)
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="gba:flex gba:gap-4 gba:flex-1 gba:overflow-hidden">
        {/* Column 1: File Tree */}
        <div className="gba:w-64 gba:flex-shrink-0 gba:overflow-y-auto">
          <ScopeTree
            scopes={scopes}
            isLoading={isLoading}
            onSelect={path => {
              setSelectedScope(path)
              setSelectedKey(null) // Reset key selection
            }}
            selected={selectedScope || ''}
          />
        </div>

        {/* View Mode: Single Key (3-column) */}
        {viewMode === 'single' && selectedScope && (
          <>
            {/* Column 2: Key List */}
            <div className="gba:w-80 gba:flex-shrink-0 gba:overflow-y-auto">
              <TranslationKeyList
                keys={keys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            {/* Column 3: Editor Panel */}
            {selectedKey && (
              <div className="gba:flex-1 gba:overflow-y-auto">
                <TranslationEditorPanel
                  keyId={selectedKey}
                  localePatterns={localePatterns}
                  onPatternChange={handlePatternChange}
                  availableVariables={availableVariables}
                  onSave={handleSave}
                  onMarkReviewed={handleMarkReviewed}
                  isReviewed={translationCache.isKeyReviewed(selectedKey)}
                />
              </div>
            )}
          </>
        )}

        {/* View Mode: All Keys Table */}
        {viewMode === 'table' && selectedScope && currentScope && (
          <div className="gba:flex-1 gba:overflow-y-auto">
            <TranslationsTable
              scope={currentScope}
              translationFiles={translationFiles}
              branch={branch}
              localeFilter={localeFilter}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ThreeColumnLayout
