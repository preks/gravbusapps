import React from 'react'
import { CheckIcon, XIcon, PencilIcon, TrashIcon, CaretDownIcon } from '@phosphor-icons/react'
import {
  TableRow,
  TableCell,
  Button,
  ButtonGroup,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner
} from '@newwork/nw-design-system'
import { EditableCell } from '@/components/editable-cell'
import type { UseEditableStateResult } from '../../../../../hooks/useEditableState'
import type { ComponentResource } from '@/common/data/resources/types/component.types'
import { useEditableRow } from '../../../../../hooks/useEditableRow'
import { combineBuildAndScreenType } from '../../../../../utils/componentKeyUtils'

export interface ComponentEntry {
  id: string
  componentPath: string
  version: string
}

interface ComponentTableRowProps {
  component: ComponentResource
  entry: ComponentEntry
  editableState: UseEditableStateResult<ComponentEntry>
  onFieldEdit: (entryId: string, field: keyof ComponentEntry, value: string) => void
  onSaveEntry: (component: ComponentResource) => Promise<void>
  onDiscardEntry: (entryId: string) => void
  onEdit: (component: ComponentResource) => void
  onDelete: (component: ComponentResource) => void
  isDeleting: boolean
  visibleColumns: string[]
  azureConfigured: boolean
  isLoadingAzure?: boolean
  dataTestId: string
}

const TypeBadge: React.FC<{ component: ComponentResource }> = ({ component }) => {
  const builderType = component.screenComponents?.builderType || 'NATIVE_SCREEN'
  const screenType = component.type || 'SCREEN'
  const combinedType = component.screenKey?.startsWith('sys_')
    ? 'system-component'
    : combineBuildAndScreenType(builderType, screenType)
  const typeConfig: Record<string, { label: string; color: string }> = {
    'native-screen': { label: 'Native Screen', color: 'gba:bg-blue-100 gba:text-blue-700 gba:border-blue-200' },
    'system-component': {
      label: 'System Component',
      color: 'gba:bg-indigo-100 gba:text-indigo-700 gba:border-indigo-200'
    },
    'native-form': { label: 'Native Form', color: 'gba:bg-green-100 gba:text-green-700 gba:border-green-200' },
    'native-popup': { label: 'Native Popup', color: 'gba:bg-purple-100 gba:text-purple-700 gba:border-purple-200' },
    'native-window': { label: 'Native Window', color: 'gba:bg-cyan-100 gba:text-cyan-700 gba:border-cyan-200' },
    'lowcoder-screen': {
      label: 'Lowcoder Screen',
      color: 'gba:bg-orange-100 gba:text-orange-700 gba:border-orange-200'
    },
    'lowcoder-form': { label: 'Lowcoder Form', color: 'gba:bg-yellow-100 gba:text-yellow-700 gba:border-yellow-200' },
    'formio-form': { label: 'FormIO Form', color: 'gba:bg-pink-100 gba:text-pink-700 gba:border-pink-200' }
  }
  const config = typeConfig[combinedType] || {
    label: combinedType,
    color: 'gba:bg-muted gba:text-foreground gba:border-border'
  }
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border gba:truncate ${config.color}`}
    >
      {config.label}
    </span>
  )
}

const NameCell: React.FC<{ component: ComponentResource }> = ({ component }) => (
  <div className="gba:overflow-hidden">
    <div className="gba:font-medium gba:truncate">{component.name}</div>
    <code className="gba:text-xs gba:text-muted-foreground gba:truncate gba:block">{component.screenKey}</code>
  </div>
)

const DevVersionCell: React.FC<{ hasUnversioned: boolean }> = ({ hasUnversioned }) => (
  <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
    {hasUnversioned ? (
      <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
    ) : (
      <XIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="bold" />
    )}
  </div>
)

const ProdVersionCell: React.FC<{ versions: string[]; dataTestId?: string; entryId?: string }> = ({
  versions,
  dataTestId,
  entryId
}) => {
  const sortedVersions = [...versions].sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
  const latestVersion = sortedVersions[0]
  const remainingCount = sortedVersions.length - 1
  const hasMultiple = sortedVersions.length > 1
  if (!latestVersion) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center">
        <XIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="bold" />
      </div>
    )
  }
  const content = (
    <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
      <div className="gba:relative gba:inline-block">
        <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border">
          {latestVersion}
        </span>
        {remainingCount > 0 && (
          <Badge size="xs" variant="default" className="gba:absolute gba:-top-2 gba:-right-2">
            +{remainingCount}
          </Badge>
        )}
      </div>
      {hasMultiple && <CaretDownIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" weight="bold" />}
    </div>
  )
  if (hasMultiple) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:w-full gba:py-1 gba:rounded gba:hover:bg-muted/50 gba:cursor-pointer gba:border-0 gba:bg-transparent"
            data-testid={entryId ? `${dataTestId}-prod-versions-trigger-${entryId}` : undefined}
          >
            {content}
          </button>
        </PopoverTrigger>
        <PopoverContent className="gba:max-h-60 gba:overflow-y-auto gba:w-48" align="center">
          <div className="gba:font-medium gba:text-sm gba:mb-2">PROD versions</div>
          <ul className="gba:space-y-1 gba:text-sm">
            {sortedVersions.map(v => (
              <li key={v} className="gba:py-0.5">
                {v}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    )
  }
  return <div className="gba:flex gba:items-center gba:justify-center">{content}</div>
}

const UpdatedAtCell: React.FC<{ updatedAt?: string; createdAt?: string }> = ({ updatedAt, createdAt }) => {
  const date = updatedAt || createdAt
  return (
    <span className="gba:text-sm gba:text-muted-foreground">{date ? new Date(date).toLocaleDateString() : '-'}</span>
  )
}

const AzureLoadingCell: React.FC = () => (
  <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
    <Spinner size="sm" />
    <span className="gba:text-xs gba:text-muted-foreground">Loading...</span>
  </div>
)

export const ComponentTableRow: React.FC<ComponentTableRowProps> = ({
  component,
  entry,
  editableState,
  onFieldEdit,
  onSaveEntry,
  onDiscardEntry,
  onEdit,
  onDelete,
  isDeleting,
  visibleColumns,
  azureConfigured,
  isLoadingAzure = false,
  dataTestId
}) => {
  const { entryId, hasEdits, isSaving, getFieldValue, isFieldEdited } = useEditableRow(entry, editableState)

  const renderCell = (columnId: string) => {
    switch (columnId) {
      case 'type':
        return (
          <TableCell key="type" className="gba:px-2">
            <TypeBadge component={component} />
          </TableCell>
        )
      case 'name':
        return (
          <TableCell key="name" className="gba:px-2">
            <NameCell component={component} />
          </TableCell>
        )
      case 'componentPath':
        return (
          <TableCell key="componentPath" className="gba:px-2">
            <EditableCell
              value={getFieldValue('componentPath') as string}
              onChange={value => onFieldEdit(entryId, 'componentPath', value)}
              testId={`${dataTestId}-component-path-${entryId}`}
              isEdited={isFieldEdited('componentPath')}
              disabled={isSaving}
              placeholder="/module/core/..."
            />
          </TableCell>
        )
      case 'version':
        return (
          <TableCell key="version" className="gba:px-2">
            <EditableCell
              value={getFieldValue('version') as string}
              onChange={value => onFieldEdit(entryId, 'version', value)}
              testId={`${dataTestId}-version-${entryId}`}
              isEdited={isFieldEdited('version')}
              disabled={isSaving}
              placeholder="e.g. 1.0.0"
            />
          </TableCell>
        )
      case 'devVersion':
        return (
          <TableCell key="devVersion" className="gba:px-2">
            {azureConfigured && isLoadingAzure ? (
              <AzureLoadingCell />
            ) : (
              <DevVersionCell hasUnversioned={component.azureVersions?.dev?.hasUnversioned ?? false} />
            )}
          </TableCell>
        )
      case 'prodVersion':
        return (
          <TableCell key="prodVersion" className="gba:px-2">
            {azureConfigured && isLoadingAzure ? (
              <AzureLoadingCell />
            ) : (
              <ProdVersionCell
                versions={component.azureVersions?.prod?.versions ?? []}
                dataTestId={dataTestId}
                entryId={entryId}
              />
            )}
          </TableCell>
        )
      case 'updatedAt':
        return (
          <TableCell key="updatedAt" className="gba:px-2">
            <UpdatedAtCell updatedAt={component.updatedAt} createdAt={component.createdAt} />
          </TableCell>
        )
      default:
        return null
    }
  }

  return (
    <TableRow data-testid={`${dataTestId}-component-row-${entryId}`}>
      {visibleColumns.map(colId => renderCell(colId))}
      <TableCell className="gba:sticky gba:right-0 gba:bg-background gba:z-10 gba:px-2 gba:w-36">
        <ButtonGroup
          className="gba:h-6"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onSaveEntry(component)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-save-row-${entryId}`}
            title="Save changes"
          >
            <CheckIcon className="gba:h-4 gba:w-4" weight="bold" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDiscardEntry(entryId)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-discard-row-${entryId}`}
            title="Discard changes"
          >
            <XIcon className="gba:h-4 gba:w-4" weight="bold" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onEdit(component)
            }}
            data-testid={`${dataTestId}-edit-row-${entryId}`}
            title="Edit"
          >
            <PencilIcon className="gba:h-4 gba:w-4" weight="bold" />
          </Button>
          <Button
            size="iconSm"
            variant="destructive"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDelete(component)
            }}
            disabled={isDeleting}
            data-testid={`${dataTestId}-delete-row-${entryId}`}
            title="Delete"
          >
            <TrashIcon className="gba:h-4 gba:w-4" weight="bold" />
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  )
}
