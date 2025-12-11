import React, { useState, useEffect, useMemo, useId } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Spinner,
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from '@newwork/nw-design-system'
import { type FolderNode, type InvestmentFolderTemplateEditorProps, InvestmentCatalogType } from './types'
import { useInvestmentFolderTemplates } from './hooks/useInvestmentFolderTemplates'
import { FolderTreeEditor } from './components'

const DATA_TEST_ID = 'investment-folder-template-editor'

const CATALOG_TYPE_LABELS: Record<InvestmentCatalogType, string> = {
  [InvestmentCatalogType.GROUP]: 'Investment Groups',
  [InvestmentCatalogType.TYPE]: 'Investment Types',
  [InvestmentCatalogType.LIQUID_FUND_TYPE]: 'Liquid Fund Types'
}

// Helper function to get empty text based on loading state and entries
const getEmptyText = (isLoading: boolean, hasEntries: boolean): string => {
  if (isLoading) return 'Loading...'
  if (!hasEntries) return 'No entries found'
  return 'No results'
}

export const InvestmentFolderTemplateEditor: React.FC<InvestmentFolderTemplateEditorProps> = ({
  accessToken,
  onSave,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const [catalogType, setCatalogType] = useState<InvestmentCatalogType>(InvestmentCatalogType.GROUP)
  const [selectedEntryId, setSelectedEntryId] = useState<string>('')

  // Generate unique IDs for form labels
  const catalogTypeId = useId()
  const entrySelectId = useId()

  const { entries, isLoading, isSaving, error, saveFolderTemplate } = useInvestmentFolderTemplates(
    accessToken,
    catalogType
  )

  // Find selected entry from entries
  const selectedEntry = useMemo(() => {
    return entries.find(e => e.id === selectedEntryId) || null
  }, [entries, selectedEntryId])

  // Transform entries to Combobox options
  const entryOptions = useMemo(() => {
    return entries.map(entry => ({
      value: entry.id,
      label: entry.value || entry.code || 'Unknown'
    }))
  }, [entries])

  // Reset selected entry when catalog type changes
  useEffect(() => {
    setSelectedEntryId('')
  }, [catalogType])

  const handleSave = async (newFolders: FolderNode[]) => {
    if (!selectedEntry) return false
    const success = await saveFolderTemplate(selectedEntry, newFolders)
    if (success) {
      onSave?.()
    }
    return success
  }

  // Get current folders from selected entry
  const currentFolders = selectedEntry?.objectValue?.initFolders || []

  if (error && !selectedEntry) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      {/* Catalog Type and Entry Selection */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base">Select Investment to Configure</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label htmlFor={catalogTypeId} className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
                Catalog Type
              </Label>
              <Select value={catalogType} onValueChange={(value: InvestmentCatalogType) => setCatalogType(value)}>
                <SelectTrigger id={catalogTypeId} data-testid={`${prefixDataTestId}-catalog-type-select`}>
                  <SelectValue placeholder="Select catalog type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATALOG_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={entrySelectId} className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
                {CATALOG_TYPE_LABELS[catalogType]}
              </Label>
              <Combobox
                id={entrySelectId}
                options={entryOptions}
                value={selectedEntryId}
                onValueChange={value => setSelectedEntryId(value || '')}
                placeholder={isLoading ? 'Loading...' : 'Search and select...'}
                searchPlaceholder="Type to search..."
                emptyText={getEmptyText(isLoading, entries.length > 0)}
                loading={isLoading}
                data-testid={`${prefixDataTestId}-entry-select`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show loading when fetching entries */}
      {isLoading && !selectedEntry && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Folder Tree Editor */}
      {selectedEntry && (
        <FolderTreeEditor
          folders={currentFolders}
          title={`Folder Structure for ${selectedEntry.value}`}
          isLoading={false}
          isSaving={isSaving}
          onSave={handleSave}
          prefixDataTestId={`${prefixDataTestId}-tree`}
        />
      )}
    </div>
  )
}

export default InvestmentFolderTemplateEditor
