import React from 'react'
import { TableRow, TableCell, Button, Badge, Checkbox } from '@newwork/nw-design-system'
import { Save, X, Trash2 } from 'lucide-react'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogEntry, Catalog } from '@/common/data/catalog'
import { EditableCell } from '../cells/EditableCell'
import { ParentCatalogEntrySelector } from '../cells/ParentCatalogEntrySelector'

interface CatalogTableRowProps extends BusinessAppContextProps {
  entry: CatalogEntry
  isDraft?: boolean
  isExpanded: boolean
  hasEdits: boolean
  isSaving: boolean
  editedEntries: Map<string, Partial<CatalogEntry>>
  onToggleExpansion: (entryId: string) => void
  onFieldEdit: (entryId: string, field: string, value: string | number | Record<string, string>) => void
  onViewObjectValue: (entry: CatalogEntry) => void
  onSaveEntry: (entryId: string) => void
  onDiscardEntry: (entryId: string) => void
  onDeleteEntry: (entry: CatalogEntry) => void
  onNavigateToChildCatalog: (catalog: Catalog) => void
  dataTestId: string
  onToggleSelect?: (id: string, checked: boolean) => void
  isSelected?: boolean
}

export const CatalogTableRow: React.FC<CatalogTableRowProps> = ({
  entry,
  isDraft = false,
  isExpanded,
  hasEdits,
  isSaving,
  editedEntries,
  onToggleExpansion,
  onFieldEdit,
  onViewObjectValue,
  onSaveEntry,
  onDiscardEntry,
  onDeleteEntry,
  onNavigateToChildCatalog,
  dataTestId,
  onToggleSelect,
  isSelected = false,
  ...context
}) => {
  // Get current values (edited if exists, otherwise original)
  const getFieldValue = (field: keyof CatalogEntry) => {
    const editedValue = editedEntries.get(entry.id)?.[field]
    return editedValue !== undefined ? editedValue : entry[field]
  }

  // Check if a field has been edited
  const isFieldEdited = (field: keyof CatalogEntry) => {
    return editedEntries.get(entry.id)?.[field] !== undefined
  }
  const mainRow = (
    <TableRow
      key={entry.id}
      data-testid={`${dataTestId}-EntryRow-${entry.id}`}
      className="gba:hover:bg-surface-secondary"
    >
      {/* Selection + Code (editable for drafts) with expansion toggle */}
      <TableCell className="gba:font-medium">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={checked => onToggleSelect && onToggleSelect(entry.id, !!checked)}
            data-testid={`${dataTestId}-Select-${entry.id}`}
          />
          {entry.hasChildren && (
            <button
              onClick={() => onToggleExpansion(entry.id)}
              className="gba:p-1 gba:rounded gba:text-xs gba:hover:bg-gray-100"
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer'
              }}
              title={isExpanded ? 'Collapse children' : 'Expand children'}
            >
              {isExpanded ? (
                <CaretDownIcon className="gba:h-3 gba:w-3" />
              ) : (
                <CaretRightIcon className="gba:h-3 gba:w-3" />
              )}
            </button>
          )}
          {entry.level > 0 && (
            <span
              className="gba:text-xs gba:px-2 gba:py-1 gba:rounded"
              style={{
                backgroundColor: 'var(--nw-color-surface-secondary)',
                marginLeft: `${entry.level * 12}px`
              }}
            >
              L{entry.level}
            </span>
          )}
          {isDraft ? (
            <EditableCell
              value={getFieldValue('code') || ''}
              onChange={value => onFieldEdit(entry.id, 'code', value)}
              testId={`${dataTestId}-Code-${entry.id}`}
              isEdited={isFieldEdited('code')}
              placeholder="Enter code"
            />
          ) : (
            <code
              className="gba:text-sm"
              style={{
                backgroundColor: 'var(--nw-color-surface-secondary)',
                padding: 'var(--nw-spacing-xs)',
                borderRadius: 'var(--nw-border-radius-sm)'
              }}
            >
              {entry.code || '—'}
            </code>
          )}
        </div>
        {entry.parentPath && (
          <div className="gba:text-xs gba:mt-1" style={{ color: 'var(--nw-color-text-secondary)' }}>
            Path: {entry.parentPath}
          </div>
        )}
      </TableCell>

      {/* Alternative Code */}
      <TableCell>
        <EditableCell
          value={getFieldValue('alternativeCode')}
          onChange={value => onFieldEdit(entry.id, 'alternativeCode', value)}
          testId={`${dataTestId}-AlternativeCode-${entry.id}`}
          isEdited={isFieldEdited('alternativeCode')}
        />
      </TableCell>

      {/* Value - Translatable */}
      <TableCell>
        <EditableCell
          value={getFieldValue('value') || ''}
          onChange={value => onFieldEdit(entry.id, 'value', value)}
          testId={`${dataTestId}-ValueTranslatable-${entry.id}`}
          isTranslatable={true}
          isEdited={isFieldEdited('value') || isFieldEdited('valueTranslations')}
          translations={(getFieldValue('valueTranslations') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(entry.id, 'valueTranslations', translations)}
        />
      </TableCell>

      {/* Description - Translatable */}
      <TableCell className="gba:max-w-xs">
        <EditableCell
          value={getFieldValue('description') || ''}
          onChange={value => onFieldEdit(entry.id, 'description', value)}
          testId={`${dataTestId}-DescriptionTranslatable-${entry.id}`}
          isTranslatable={true}
          isEdited={isFieldEdited('description') || isFieldEdited('descriptionTranslations')}
          translations={(getFieldValue('descriptionTranslations') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(entry.id, 'descriptionTranslations', translations)}
        />
      </TableCell>

      {/* Additional Value 1 - Translatable */}
      <TableCell>
        <EditableCell
          value={getFieldValue('additionalValue1') || ''}
          onChange={value => onFieldEdit(entry.id, 'additionalValue1', value)}
          testId={`${dataTestId}-AdditionalValue1Translatable-${entry.id}`}
          isTranslatable={true}
          isEdited={isFieldEdited('additionalValue1') || isFieldEdited('additionalValue1Translations')}
          translations={(getFieldValue('additionalValue1Translations') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(entry.id, 'additionalValue1Translations', translations)}
        />
      </TableCell>

      {/* Additional Value 2 - Translatable */}
      <TableCell>
        <EditableCell
          value={getFieldValue('additionalValue2') || ''}
          onChange={value => onFieldEdit(entry.id, 'additionalValue2', value)}
          testId={`${dataTestId}-AdditionalValue2Translatable-${entry.id}`}
          isTranslatable={true}
          isEdited={isFieldEdited('additionalValue2') || isFieldEdited('additionalValue2Translations')}
          translations={(getFieldValue('additionalValue2Translations') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(entry.id, 'additionalValue2Translations', translations)}
        />
      </TableCell>

      {/* Additional Value 3 - Translatable */}
      <TableCell>
        <EditableCell
          value={getFieldValue('additionalValue3') || ''}
          onChange={value => onFieldEdit(entry.id, 'additionalValue3', value)}
          testId={`${dataTestId}-AdditionalValue3Translatable-${entry.id}`}
          isTranslatable={true}
          isEdited={isFieldEdited('additionalValue3') || isFieldEdited('additionalValue3Translations')}
          translations={(getFieldValue('additionalValue3Translations') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(entry.id, 'additionalValue3Translations', translations)}
        />
      </TableCell>

      {/* Type */}
      <TableCell>
        <EditableCell
          value={getFieldValue('type')}
          onChange={value => onFieldEdit(entry.id, 'type', value)}
          testId={`${dataTestId}-Type-${entry.id}`}
          isEdited={isFieldEdited('type')}
        />
      </TableCell>

      {/* Display Order */}
      <TableCell className="gba:text-center">
        <EditableCell
          value={getFieldValue('displayOrder')}
          onChange={value => onFieldEdit(entry.id, 'displayOrder', parseFloat(value) || 0)}
          testId={`${dataTestId}-DisplayOrder-${entry.id}`}
          type="number"
          isEdited={isFieldEdited('displayOrder')}
        />
      </TableCell>

      {/* Object Value (JSON) */}
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewObjectValue(entry)}
          data-testid={`${dataTestId}-ViewObjectValueButton-${entry.id}`}
          style={{
            borderColor: isFieldEdited('objectValue') ? 'var(--nw-info)' : 'var(--nw-primary)'
          }}
        >
          JSON
        </Button>
      </TableCell>

      {/* Parent Entry ID */}
      <TableCell>
        <ParentCatalogEntrySelector
          value={entry.parentEntryId}
          onChange={parentEntryId => {
            const newValue = parentEntryId || ''
            if (newValue !== (entry.parentEntryId || '')) {
              onFieldEdit(entry.id, 'parentEntryId', newValue)
            }
          }}
          accessToken={context.accessToken}
          data-testid={`${dataTestId}-ParentSelector-${entry.id}`}
        />
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="gba:flex gba:items-center gba:gap-1">
          {hasEdits ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSaveEntry(entry.id)}
                disabled={isSaving}
                data-testid={`${dataTestId}-SaveButton-${entry.id}`}
                style={{
                  backgroundColor: 'var(--nw-color-success-50)',
                  borderColor: 'var(--nw-color-success-300)',
                  color: 'var(--nw-color-success-700)',
                  minWidth: '70px',
                  minHeight: '32px'
                }}
                title="Save changes"
              >
                <Save className="gba:h-4 gba:w-4 gba:mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDiscardEntry(entry.id)}
                disabled={isSaving}
                data-testid={`${dataTestId}-DiscardButton-${entry.id}`}
                style={{
                  backgroundColor: 'var(--nw-color-danger-50)',
                  borderColor: 'var(--nw-color-danger-300)',
                  color: 'var(--nw-color-danger-700)',
                  minWidth: '80px',
                  minHeight: '32px'
                }}
                title="Discard changes"
              >
                <X className="gba:h-4 gba:w-4 gba:mr-1" />
                Discard
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeleteEntry(entry)}
              data-testid={`${dataTestId}-DeleteButton-${entry.id}`}
            >
              <Trash2 className="gba:h-3 gba:w-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  // If expanded and has children, render catalog rows grouped by catalog
  if (isExpanded && entry.childEntries && entry.childEntries.length > 0) {
    // Group child entries by their catalog
    const catalogGroups = entry.childEntries.reduce(
      (groups, child) => {
        const catalogKey = `${child.catalog?.identifier}:${child.catalog?.version}`
        if (!groups[catalogKey]) {
          groups[catalogKey] = {
            catalog: child.catalog,
            entries: []
          }
        }
        groups[catalogKey].entries.push(child)
        return groups
      },
      {} as Record<string, { catalog: any; entries: any[] }>
    )

    const catalogRows = Object.entries(catalogGroups).map(([catalogKey, group]) => (
      <TableRow
        key={`catalog-${catalogKey}`}
        data-testid={`${dataTestId}-CatalogRow-${catalogKey}`}
        className="gba:hover:bg-surface-secondary gba:cursor-pointer"
        onClick={() => {
          if (group.catalog?.identifier && group.catalog?.version) {
            // Create a Catalog object from the child catalog data
            const catalogToNavigate: Catalog = {
              id: group.catalog.id || `${group.catalog.identifier}:${group.catalog.version}`,
              identifier: group.catalog.identifier,
              version: group.catalog.version,
              name: group.catalog.name || group.catalog.identifier,
              displayName: group.catalog.name || group.catalog.identifier,
              entriesCount: group.entries.length,
              hasChildCatalogs: false,
              lastUpdated: '',
              status: 'active' as const,
              color: '#1890ff'
            }
            onNavigateToChildCatalog(catalogToNavigate)
          }
        }}
      >
        {/* Catalog info spanning all columns including Actions */}
        <TableCell colSpan={12} style={{ paddingLeft: '3rem' }} className="gba:w-full">
          <div className="gba:py-3 gba:w-full">
            {/* Catalog name and entry count badge */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <span className="gba:text-sm gba:font-semibold" style={{ color: 'var(--nw-color-primary-600)' }}>
                {group.catalog?.name || group.catalog?.identifier || 'Unknown Catalog'}
              </span>
              <Badge variant="outline" size="sm" style={{ backgroundColor: 'var(--nw-color-primary-50)' }}>
                {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
              </Badge>
            </div>

            {/* Entry badges */}
            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap">
              {group.entries.map(childEntry => (
                <Badge
                  key={childEntry.id}
                  variant="secondary"
                  size="sm"
                  className="gba:text-xs"
                  title={childEntry.description || childEntry.value}
                >
                  {childEntry.value || childEntry.code || childEntry.id}
                </Badge>
              ))}
            </div>
          </div>
        </TableCell>
      </TableRow>
    ))

    return [mainRow, ...catalogRows]
  }

  return mainRow
}

export default CatalogTableRow
