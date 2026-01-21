import { Button } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { EditableCell, EditableComboboxCell } from '@/components/editable-cell'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import type { UseEditableStateResult } from '../../../../../hooks/useEditableState'

export interface NavigationWithMenuItems {
  id?: string
  code: string
  name: string
  url: string
  roles?: string[]
  features?: string[]
  name_i18n?: Record<string, string>
  description_i18n?: Record<string, string>
  isSearchable?: boolean
  hubs?: any[]
  menuItems?: any[]
  allMenuItems?: any[]
}

export interface NavigationTableColumnsConfig {
  dataTestId: string
  navigationEntries: Array<{
    id: string
    code: string
    name: string
    url: string
    name_i18n?: Record<string, string>
    description_i18n?: Record<string, string>
    roles?: string[]
    features?: string[]
    isSearchable?: boolean
  }>
  editableState: UseEditableStateResult<NavigationDTO>
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
  openedComboboxes: Set<string>
  setOpenedComboboxes: React.Dispatch<React.SetStateAction<Set<string>>>
  setDescriptionNavigationId: (id: string | null) => void
  setDescriptionDialogOpen: (open: boolean) => void
  handleSaveEntry: (navigationId: string) => Promise<void>
  isUpdating: boolean
}

export const createNavigationTableColumns = (
  config: NavigationTableColumnsConfig
): ColumnDef<NavigationWithMenuItems>[] => {
  return [
    {
      id: 'code',
      header: 'Code',
      size: 200,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        return edits?.code !== undefined ? edits.code : navigation?.code || ''
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const codeValue = edits?.code !== undefined ? edits.code : navigation?.code || ''
        const isEdited = config.editableState.isFieldEdited(navigationId, 'code')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={codeValue}
            onChange={value => config.editableState.onFieldEdit(navigationId, 'code', value)}
            testId={`${config.dataTestId}-code-${navigationId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Enter code"
          />
        )
      }
    },
    {
      id: 'name',
      header: 'Name',
      size: 300,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        return edits?.name !== undefined ? edits.name : navigation?.name || ''
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const nameValue = edits?.name !== undefined ? edits.name : navigation?.name || ''
        const nameTranslation = edits?.name_i18n || navigation?.name_i18n || {}
        const isEdited = config.editableState.isFieldEdited(navigationId, 'name')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={nameValue}
            onChange={value => config.editableState.onFieldEdit(navigationId, 'name', value)}
            testId={`${config.dataTestId}-name-${navigationId}`}
            isEdited={isEdited}
            isTranslatable={true}
            translations={nameTranslation}
            onTranslationsChange={translations =>
              config.editableState.onFieldEdit(navigationId, 'name_i18n', translations)
            }
            disabled={isSaving}
            placeholder="Enter name"
          />
        )
      }
    },
    {
      id: 'description',
      header: 'Description',
      size: 120,
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const isEdited = config.editableState.isFieldEdited(navigationId, 'description_i18n')

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation()
              config.setDescriptionNavigationId(navigationId)
              config.setDescriptionDialogOpen(true)
            }}
            data-testid={`${config.dataTestId}-description-button-${navigationId}`}
            className={`gba:[&&]:h-6 ${isEdited ? 'gba:border-info' : 'gba:border-primary'}`}
          >
            Description
          </Button>
        )
      }
    },
    {
      id: 'url',
      header: 'URL',
      size: 450,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        return edits?.url !== undefined ? edits.url : navigation?.url || ''
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const urlValue = edits?.url !== undefined ? edits.url : navigation?.url || ''
        const isEdited = config.editableState.isFieldEdited(navigationId, 'url')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={urlValue}
            onChange={value => config.editableState.onFieldEdit(navigationId, 'url', value)}
            testId={`${config.dataTestId}-url-${navigationId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Enter URL"
          />
        )
      }
    },
    {
      id: 'roles',
      header: 'Groups',
      size: 300,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        const rawRoles = edits?.roles !== undefined ? edits.roles : navigation?.roles || []
        const rolesArray = Array.isArray(rawRoles)
          ? rawRoles.map(r => (typeof r === 'string' ? r : r?.id || r?.name || String(r)))
          : []
        return rolesArray.join(', ')
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const rawRoles = edits?.roles !== undefined ? edits.roles : navigation?.roles || []
        const rolesValue = Array.isArray(rawRoles)
          ? rawRoles.map(r => (typeof r === 'string' ? r : r?.id || r?.name || String(r)))
          : []
        const isEdited = config.editableState.isFieldEdited(navigationId, 'roles')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={rolesValue}
            onChange={value => config.editableState.onFieldEdit(navigationId, 'roles', value)}
            options={config.roleOptions}
            testId={`${config.dataTestId}-roles-${navigationId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.rolesLoading}
            onOpenChange={open => {
              if (open && !config.openedComboboxes.has(`roles-${navigationId}`)) {
                config.setOpenedComboboxes(prev => new Set([...prev, `roles-${navigationId}`]))
                if (!config.rolesLoading && config.roleOptions.length === 0 && !config.rolesError) {
                  config.refetchRoles().catch(() => {})
                }
              }
            }}
            placeholder="Select groups..."
            mode="multiple"
          />
        )
      }
    },
    {
      id: 'features',
      header: 'Features',
      size: 300,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        const rawFeatures = edits?.features !== undefined ? edits.features : navigation?.features || []
        const featuresArray = Array.isArray(rawFeatures)
          ? rawFeatures.map(f => (typeof f === 'string' ? f : f?.id || f?.name || String(f)))
          : []
        return featuresArray.join(', ')
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const rawFeatures = edits?.features !== undefined ? edits.features : navigation?.features || []
        const featuresValue = Array.isArray(rawFeatures)
          ? rawFeatures.map(f => (typeof f === 'string' ? f : f?.id || f?.name || String(f)))
          : []
        const isEdited = config.editableState.isFieldEdited(navigationId, 'features')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={featuresValue}
            onChange={value => config.editableState.onFieldEdit(navigationId, 'features', value)}
            options={config.featureOptions}
            testId={`${config.dataTestId}-features-${navigationId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.featuresLoading}
            onOpenChange={open => {
              if (open && !config.openedComboboxes.has(`features-${navigationId}`)) {
                config.setOpenedComboboxes(prev => new Set([...prev, `features-${navigationId}`]))
                if (!config.featuresLoading && config.featureOptions.length === 0 && !config.featuresError) {
                  config.refetchFeatures().catch(() => {})
                }
              }
            }}
            placeholder="Select features..."
            mode="multiple"
          />
        )
      }
    },
    {
      id: 'isSearchable',
      header: 'Searchable',
      size: 120,
      accessorFn: (row: NavigationWithMenuItems) => {
        const navigation = config.navigationEntries.find(n => n.id === row.id)
        const edits = config.editableState.state.editedEntries.get(row.id || '')
        return edits?.isSearchable !== undefined ? edits.isSearchable : (navigation?.isSearchable ?? false)
      },
      cell: ({ row }) => {
        const navigationId = row.original.id || ''
        const navigation = config.navigationEntries.find(n => n.id === navigationId)
        const edits = config.editableState.state.editedEntries.get(navigationId)
        const isSearchableValue =
          edits?.isSearchable !== undefined ? edits.isSearchable : (navigation?.isSearchable ?? false)
        const isEdited = config.editableState.isFieldEdited(navigationId, 'isSearchable')
        const isSaving =
          config.editableState.state.savingEntryId === navigationId && config.editableState.state.isSaving

        return (
          <div className="gba:flex gba:items-center gba:justify-center">
            <input
              type="checkbox"
              checked={isSearchableValue}
              onChange={e => config.editableState.onFieldEdit(navigationId, 'isSearchable', e.target.checked)}
              disabled={isSaving}
              className={`gba:w-4 gba:h-4 ${isEdited ? 'gba:border-blue-500' : ''}`}
              data-testid={`${config.dataTestId}-isSearchable-${navigationId}`}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )
      }
    }
  ]
}
