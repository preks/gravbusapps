import React, { useState, useCallback } from 'react'
import {
  PageLayout,
  Button,
  EmptyState,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Badge,
  Card,
  Label
} from '@newwork/nw-design-system'
import { FileTextIcon, FolderIcon } from '@phosphor-icons/react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import type { CatalogItem } from '../types/catalogTypes'

export interface DocumentSettingsConfig {
  groupCatalog: string
  typeCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
  groupLabel?: string
  typeLabel?: string
  filterGroupsByParentCode?: {
    catalog: string
    code: string
  }
}

export interface DocumentSettingsLayoutProps extends BusinessAppContextProps {
  config: DocumentSettingsConfig
  onBack?: () => void
  className?: string
}

const DATA_TEST_ID = 'document-settings'

export const DocumentSettingsLayout: React.FC<DocumentSettingsLayoutProps> = ({
  config,
  onBack,
  className,
  ...context
}) => {
  // Call hooks internally
  const groups = useCatalogSettings(context, config.groupCatalog)
  const types = useCatalogSettings(context, config.typeCatalog)
  // Load parent catalog when group filtering is configured (empty string is a no-op)
  const parentFilterCatalog = useCatalogSettings(context, config.filterGroupsByParentCode?.catalog ?? '')

  // Resolve parent entry ID from the parent catalog, then filter groups to only those children
  const parentFilterId = config.filterGroupsByParentCode
    ? parentFilterCatalog.items.find(e => e.code === config.filterGroupsByParentCode!.code)?.id
    : undefined

  const filteredGroupItems = parentFilterId
    ? groups.items.filter(g => g.parentEntryId === parentFilterId)
    : groups.items

  const [selectedGroup, setSelectedGroup] = useState<CatalogItem | null>(null)
  const [groupSearchTerm, setGroupSearchTerm] = useState('')
  const [typeSearchTerm, setTypeSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [dialogMode, setDialogMode] = useState<'group' | 'type'>('group')
  const [formData, setFormData] = useState<{
    code: string
    value: string
    type: string
    displayOrder: number
  }>({
    code: '',
    value: '',
    type: '',
    displayOrder: 0
  })

  // Auto-select first group on load
  React.useEffect(() => {
    if (filteredGroupItems.length > 0 && !selectedGroup) {
      setSelectedGroup(filteredGroupItems[0])
    }
  }, [filteredGroupItems, selectedGroup])

  const handleGroupSelect = useCallback((group: CatalogItem) => {
    setSelectedGroup(group)
    setTypeSearchTerm('') // Clear type search when changing groups
  }, [])

  const handleOpenDialog = (mode: 'group' | 'type', item?: CatalogItem) => {
    setDialogMode(mode)
    setEditingItem(item || null)
    if (item) {
      setFormData({
        code: item.code,
        value: item.value,
        type: item.type || '',
        displayOrder: item.displayOrder ?? 0
      })
    } else {
      setFormData({
        code: '',
        value: '',
        type: '',
        displayOrder: 0
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setFormData({
      code: '',
      value: '',
      type: '',
      displayOrder: 0
    })
  }

  const handleSave = async () => {
    const handlers = dialogMode === 'group' ? groups : types

    try {
      if (editingItem) {
        await handlers.onUpdate(editingItem.id, {
          code: formData.code,
          value: formData.value,
          type: formData.type || undefined,
          displayOrder: formData.displayOrder
        })
      } else {
        await handlers.onCreate({
          code: formData.code,
          value: formData.value,
          type: formData.type || undefined,
          displayOrder: formData.displayOrder,
          ...(dialogMode === 'type' && selectedGroup ? { parentEntryId: selectedGroup.id } : {})
        })
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const handleDelete = async (mode: 'group' | 'type', id: string) => {
    const handlers = mode === 'group' ? groups : types
    try {
      await handlers.onDelete(id)
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Filter groups by search (applied on top of any parent-entry filter)
  const filteredGroups = filteredGroupItems.filter(group => {
    if (!groupSearchTerm) return true
    const lowerSearch = groupSearchTerm.toLowerCase()
    return group.code.toLowerCase().includes(lowerSearch) || group.value.toLowerCase().includes(lowerSearch)
  })

  // Filter types by selected group
  const currentTypes = selectedGroup ? types.items.filter(type => type.parentEntryId === selectedGroup.id) : []

  // Filter types by search term
  const filteredTypes = currentTypes.filter(type => {
    if (!typeSearchTerm) return true
    const lowerSearch = typeSearchTerm.toLowerCase()
    return (
      type.code.toLowerCase().includes(lowerSearch) ||
      type.value.toLowerCase().includes(lowerSearch) ||
      type.type?.toLowerCase().includes(lowerSearch)
    )
  })

  const renderTypesTable = () => (
    <>
      <div className="gba:rounded-md gba:border gba:p-4 gba:mb-6">
        <DebouncedInput
          value={typeSearchTerm}
          onChange={setTypeSearchTerm}
          placeholder="Search types..."
          debounce={300}
          data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-type-search`}
        />
      </div>

      <div className="gba:rounded-md gba:border">
        <Table data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-type-table`}>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="gba:text-center gba:py-8">
                  <EmptyState
                    title={
                      typeSearchTerm ? 'No types found' : `No ${config.typeLabel?.toLowerCase() || 'document types'}`
                    }
                    description={
                      typeSearchTerm
                        ? 'Try adjusting your search terms'
                        : `Click "Add ${config.typeLabel || 'Type'}" to create a ${config.typeLabel?.toLowerCase() || 'document type'}`
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredTypes.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.code}</Badge>
                  </TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell>{item.type || '-'}</TableCell>
                  <TableCell>{item.displayOrder}</TableCell>
                  <TableCell>
                    <div className="gba:flex gba:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog('type', item)}
                        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-type-edit-${item.code}`}
                      >
                        <Edit className="gba:w-4 gba:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete('type', item.id)}
                        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-type-delete-${item.code}`}
                      >
                        <Trash2 className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )

  if (groups.isLoading) {
    return (
      <PageLayout
        headerIcon={FileTextIcon}
        headerTitle={config.headerTitle || 'Document Data'}
        headerDescription={config.headerDescription || 'Manage document groups and document types'}
        onBack={onBack}
        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}`}
      >
        <div className="gba:py-12">Loading...</div>
      </PageLayout>
    )
  }

  if (groups.error) {
    return (
      <PageLayout
        headerIcon={FileTextIcon}
        headerTitle={config.headerTitle || 'Document Data'}
        headerDescription={config.headerDescription || 'Manage document groups and document types'}
        onBack={onBack}
        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}`}
      >
        <Alert variant="destructive">{groups.error}</Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      headerIcon={FileTextIcon}
      headerTitle={config.headerTitle || 'Document Data'}
      headerDescription={config.headerDescription || 'Manage document groups and document types'}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}`}
    >
      <div className="gba:flex gba:gap-6 gba:h-full">
        {/* Left Sidebar - Document Groups */}
        <div className="gba:w-80 gba:flex-shrink-0">
          <Card>
            <div className="gba:p-4 gba:border-b gba:flex gba:items-center gba:justify-between">
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
                {config.groupLabel || 'Document Groups'}
              </h3>
              <Button
                size="sm"
                onClick={() => handleOpenDialog('group')}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-add-group-button`}
              >
                <Plus className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            <div className="gba:p-4 gba:border-b">
              <DebouncedInput
                value={groupSearchTerm}
                onChange={setGroupSearchTerm}
                placeholder="Search groups..."
                debounce={300}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-group-search`}
              />
            </div>
            <div className="gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              {filteredGroups.length === 0 ? (
                <div className="gba:p-4">
                  <EmptyState
                    title={
                      groupSearchTerm
                        ? 'No groups found'
                        : `No ${config.groupLabel?.toLowerCase() || 'document groups'}`
                    }
                    description={groupSearchTerm ? 'Try adjusting your search' : 'Click + to add a group'}
                  />
                </div>
              ) : (
                filteredGroups.map(group => (
                  <div
                    key={group.id}
                    role="button"
                    tabIndex={0}
                    className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:cursor-pointer gba:border-b gba:transition-colors ${
                      selectedGroup?.id === group.id ? 'gba:bg-accent gba:text-accent-foreground' : 'hover:gba:bg-muted'
                    }`}
                    onClick={() => handleGroupSelect(group)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleGroupSelect(group)
                      }
                    }}
                    data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-group-${group.code}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                      <FolderIcon className="gba:w-4 gba:h-4" />
                      <div>
                        <div className="gba:text-sm gba:font-medium">{group.value}</div>
                        <div className="gba:text-xs gba:text-muted-foreground">{group.code}</div>
                      </div>
                    </div>
                    <div className="gba:flex gba:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6"
                        onClick={e => {
                          e.stopPropagation()
                          handleOpenDialog('group', group)
                        }}
                        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-group-edit-${group.code}`}
                      >
                        <Edit className="gba:w-3 gba:h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6"
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete('group', group.id)
                        }}
                        data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-group-delete-${group.code}`}
                      >
                        <Trash2 className="gba:w-3 gba:h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel - Document Types */}
        <div className="gba:flex-1">
          {selectedGroup ? (
            <div className="gba:space-y-4">
              <div className="gba:flex gba:justify-between gba:items-center">
                <div>
                  <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{selectedGroup.value}</h2>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                    Manage {config.typeLabel?.toLowerCase() || 'document types'} for this group
                  </p>
                </div>
                <Button
                  onClick={() => handleOpenDialog('type')}
                  data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-add-type-button`}
                >
                  <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Add {config.typeLabel || 'Type'}
                </Button>
              </div>

              {renderTypesTable()}
            </div>
          ) : (
            <div className="gba:py-12">
              <EmptyState
                title={`Select a ${config.groupLabel?.toLowerCase().replace(/s$/, '') || 'document group'}`}
                description={`Choose a ${config.groupLabel?.toLowerCase().replace(/s$/, '') || 'document group'} from the sidebar to view and manage its ${config.typeLabel?.toLowerCase() || 'types'}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialog for creating/editing groups and types */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog`}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'}{' '}
              {dialogMode === 'group'
                ? config.groupLabel?.replace(/s$/, '') || 'Document Group'
                : config.typeLabel?.replace(/s$/, '') || 'Document Type'}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingItem}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog-code`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog-value`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog-type`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder ?? 0}
                onChange={e => {
                  const value = e.target.value
                  setFormData({ ...formData, displayOrder: value === '' ? 0 : Number.parseInt(value, 10) || 0 })
                }}
                data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog-display-order`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-testid={`${config.dataTestIdPrefix}-${DATA_TEST_ID}-dialog-save`}
              disabled={!formData.code || !formData.value}
            >
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
