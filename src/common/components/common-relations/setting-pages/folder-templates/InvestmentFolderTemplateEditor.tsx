import React, { useState, useMemo, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert, Spinner, Combobox, Label } from '@newwork/nw-design-system'
import {
  type FolderNode,
  type InvestmentCatalogEntry,
  type InvestmentFolderTemplateEditorProps,
  InvestmentCatalogType
} from './types'
import { useInvestmentFolderTemplates } from './hooks/useInvestmentFolderTemplates'
import { FolderTreeEditor } from './components'

const DATA_TEST_ID = 'investment-folder-template-editor'

const CATALOG_TYPE_LABELS: Record<InvestmentCatalogType, string> = {
  [InvestmentCatalogType.GROUP]: 'Investment Groups',
  [InvestmentCatalogType.TYPE]: 'Investment Types',
  [InvestmentCatalogType.LIQUID_FUND_TYPE]: 'Liquid Fund Types'
}

interface SelectedTemplateTarget {
  entry: InvestmentCatalogEntry
  catalogType: InvestmentCatalogType
}

// Helper function to get empty text based on loading state and entries
const getEmptyText = (isLoading: boolean, hasEntries: boolean): string => {
  if (isLoading) return 'Loading...'
  if (!hasEntries) return 'No entries found'
  return 'No results'
}

const toComboboxOption = (entry: InvestmentCatalogEntry) => ({
  value: entry.id,
  label: entry.value || entry.code || 'Unknown'
})

export const InvestmentFolderTemplateEditor: React.FC<InvestmentFolderTemplateEditorProps> = ({
  accessToken,
  onSave,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [selectedLiquidFundTypeId, setSelectedLiquidFundTypeId] = useState<string>('')

  // Generate unique IDs for form labels
  const groupSelectId = useId()
  const typeSelectId = useId()
  const liquidFundTypeSelectId = useId()

  const groupTemplates = useInvestmentFolderTemplates(accessToken, InvestmentCatalogType.GROUP)
  const typeTemplates = useInvestmentFolderTemplates(accessToken, InvestmentCatalogType.TYPE)
  const liquidFundTypeTemplates = useInvestmentFolderTemplates(accessToken, InvestmentCatalogType.LIQUID_FUND_TYPE)

  const selectedGroup = useMemo(
    () => groupTemplates.entries.find(entry => entry.id === selectedGroupId) || null,
    [groupTemplates.entries, selectedGroupId]
  )

  const availableTypes = useMemo(
    () => typeTemplates.entries.filter(entry => entry.parentEntryId === selectedGroupId),
    [typeTemplates.entries, selectedGroupId]
  )

  const selectedType = useMemo(
    () => availableTypes.find(entry => entry.id === selectedTypeId) || null,
    [availableTypes, selectedTypeId]
  )

  const availableLiquidFundTypes = useMemo(
    () => liquidFundTypeTemplates.entries.filter(entry => entry.parentEntryId === selectedTypeId),
    [liquidFundTypeTemplates.entries, selectedTypeId]
  )

  const selectedLiquidFundType = useMemo(
    () => availableLiquidFundTypes.find(entry => entry.id === selectedLiquidFundTypeId) || null,
    [availableLiquidFundTypes, selectedLiquidFundTypeId]
  )

  const selectedTarget = useMemo<SelectedTemplateTarget | null>(() => {
    if (selectedLiquidFundType) {
      return { entry: selectedLiquidFundType, catalogType: InvestmentCatalogType.LIQUID_FUND_TYPE }
    }
    if (selectedType) {
      return { entry: selectedType, catalogType: InvestmentCatalogType.TYPE }
    }
    if (selectedGroup) {
      return { entry: selectedGroup, catalogType: InvestmentCatalogType.GROUP }
    }
    return null
  }, [selectedGroup, selectedType, selectedLiquidFundType])

  const groupOptions = useMemo(() => groupTemplates.entries.map(toComboboxOption), [groupTemplates.entries])
  const typeOptions = useMemo(() => availableTypes.map(toComboboxOption), [availableTypes])
  const liquidFundTypeOptions = useMemo(
    () => availableLiquidFundTypes.map(toComboboxOption),
    [availableLiquidFundTypes]
  )

  const isLoading = groupTemplates.isLoading || typeTemplates.isLoading || liquidFundTypeTemplates.isLoading
  const isSaving = groupTemplates.isSaving || typeTemplates.isSaving || liquidFundTypeTemplates.isSaving
  const error = groupTemplates.error || typeTemplates.error || liquidFundTypeTemplates.error

  const handleGroupChange = (value: string | null | undefined) => {
    setSelectedGroupId(value || '')
    setSelectedTypeId('')
    setSelectedLiquidFundTypeId('')
  }

  const handleTypeChange = (value: string | null | undefined) => {
    setSelectedTypeId(value || '')
    setSelectedLiquidFundTypeId('')
  }

  const handleSave = async (newFolders: FolderNode[]) => {
    if (!selectedTarget) return false

    const saveByCatalogType = {
      [InvestmentCatalogType.GROUP]: groupTemplates.saveFolderTemplate,
      [InvestmentCatalogType.TYPE]: typeTemplates.saveFolderTemplate,
      [InvestmentCatalogType.LIQUID_FUND_TYPE]: liquidFundTypeTemplates.saveFolderTemplate
    }

    const success = await saveByCatalogType[selectedTarget.catalogType](selectedTarget.entry, newFolders)
    if (success) {
      onSave?.()
    }
    return success
  }

  // Get current folders from selected entry
  const currentFolders = selectedTarget?.entry.objectValue?.initFolders || []
  const targetLabel = selectedTarget?.entry.value || selectedTarget?.entry.code || 'selected investment template'
  const hierarchyLabel = [selectedGroup?.value, selectedType?.value, selectedLiquidFundType?.value]
    .filter(Boolean)
    .join(' > ')

  if (error && !selectedTarget) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      {/* Investment hierarchy selection */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base">Select Investment Template Scope</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">
            Start with an investment group, then optionally narrow the template to a type or liquid fund type.
          </p>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4 lg:gba:grid-cols-3">
            <div>
              <Label htmlFor={groupSelectId} className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
                Investment Group
              </Label>
              <Combobox
                id={groupSelectId}
                options={groupOptions}
                value={selectedGroupId}
                onValueChange={handleGroupChange}
                placeholder={groupTemplates.isLoading ? 'Loading...' : 'Select group...'}
                searchPlaceholder="Type to search groups..."
                emptyText={getEmptyText(groupTemplates.isLoading, groupTemplates.entries.length > 0)}
                loading={groupTemplates.isLoading}
                data-testid={`${prefixDataTestId}-group-select`}
              />
            </div>

            {selectedGroup && availableTypes.length > 0 && (
              <div>
                <Label htmlFor={typeSelectId} className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
                  Investment Type
                </Label>
                <Combobox
                  id={typeSelectId}
                  options={typeOptions}
                  value={selectedTypeId}
                  onValueChange={handleTypeChange}
                  placeholder="Optional: select type..."
                  searchPlaceholder="Type to search types..."
                  emptyText={getEmptyText(typeTemplates.isLoading, availableTypes.length > 0)}
                  loading={typeTemplates.isLoading}
                  data-testid={`${prefixDataTestId}-type-select`}
                />
              </div>
            )}

            {selectedType && availableLiquidFundTypes.length > 0 && (
              <div>
                <Label htmlFor={liquidFundTypeSelectId} className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
                  Liquid Fund Type
                </Label>
                <Combobox
                  id={liquidFundTypeSelectId}
                  options={liquidFundTypeOptions}
                  value={selectedLiquidFundTypeId}
                  onValueChange={value => setSelectedLiquidFundTypeId(value || '')}
                  placeholder="Optional: select liquid fund type..."
                  searchPlaceholder="Type to search liquid fund types..."
                  emptyText={getEmptyText(liquidFundTypeTemplates.isLoading, availableLiquidFundTypes.length > 0)}
                  loading={liquidFundTypeTemplates.isLoading}
                  data-testid={`${prefixDataTestId}-liquid-fund-type-select`}
                />
              </div>
            )}
          </div>

          {selectedTarget && (
            <p className="gba:text-sm gba:text-muted-foreground" data-testid={`${prefixDataTestId}-selected-scope`}>
              Editing {CATALOG_TYPE_LABELS[selectedTarget.catalogType].slice(0, -1)} template:{' '}
              {hierarchyLabel || targetLabel}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Show loading when fetching entries */}
      {isLoading && !selectedTarget && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Folder Tree Editor */}
      {selectedTarget && (
        <FolderTreeEditor
          folders={currentFolders}
          title={`Folder Structure for ${hierarchyLabel || targetLabel}`}
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
