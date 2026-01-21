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

interface CatalogItem {
  id: string
  code: string
  value: string
  type?: string
  displayOrder: number
  parentEntryId?: string
}

interface CatalogSettingsState {
  data: CatalogItem[]
  loading: boolean
  error: string | null
}

interface CatalogHandlers {
  onCreate: (data: Omit<CatalogItem, 'id'>) => Promise<void>
  onUpdate: (id: string, data: Partial<CatalogItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface DocumentSettingsProps extends BusinessAppContextProps {
  groups: CatalogSettingsState
  types: CatalogSettingsState
  groupHandlers: CatalogHandlers
  typeHandlers: CatalogHandlers
  onBack?: () => void
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
}

const DATA_TEST_ID = 'document-settings'

export const DocumentSettings: React.FC<DocumentSettingsProps> = ({
  groups,
  types,
  groupHandlers,
  typeHandlers,
  onBack,
  prefixDataTestId,
  headerTitle = 'Document Data',
  headerDescription = 'Manage document groups and document types'
}) => {
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
    if (groups.data.length > 0 && !selectedGroup) {
      setSelectedGroup(groups.data[0])
    }
  }, [groups.data, selectedGroup])

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
        displayOrder: item.displayOrder
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
    const handlers = dialogMode === 'group' ? groupHandlers : typeHandlers

    try {
      if (editingItem) {
        await handlers.onUpdate(editingItem.id, formData)
      } else {
        const dataToCreate: Omit<CatalogItem, 'id'> = {
          code: formData.code,
          value: formData.value,
          type: formData.type || undefined,
          displayOrder: formData.displayOrder,
          ...(dialogMode === 'type' && selectedGroup ? { parentEntryId: selectedGroup.id } : {})
        }
        await handlers.onCreate(dataToCreate)
      }
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const handleDelete = async (mode: 'group' | 'type', id: string) => {
    const handlers = mode === 'group' ? groupHandlers : typeHandlers
    try {
      await handlers.onDelete(id)
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Filter groups by search
  const filteredGroups = groups.data.filter(group => {
    if (!groupSearchTerm) return true
    const lowerSearch = groupSearchTerm.toLowerCase()
    return group.code.toLowerCase().includes(lowerSearch) || group.value.toLowerCase().includes(lowerSearch)
  })

  // Filter types by selected group
  const currentTypes = selectedGroup ? types.data.filter(type => type.parentEntryId === selectedGroup.id) : []

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

  const renderTypesTable = () => {
    return (
      <>
        <div className="gba:rounded-md gba:border gba:p-4 gba:mb-6">
          <DebouncedInput
            value={typeSearchTerm}
            onChange={setTypeSearchTerm}
            placeholder="Search types..."
            debounce={300}
            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-search`}
          />
        </div>

        <div className="gba:rounded-md gba:border">
          <Table data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-table`}>
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
                      title={typeSearchTerm ? 'No types found' : 'No document types'}
                      description={
                        typeSearchTerm
                          ? 'Try adjusting your search terms'
                          : 'Click "Add Type" to create a document type'
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
                          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-edit-${item.code}`}
                        >
                          <Edit className="gba:w-4 gba:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete('type', item.id)}
                          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-delete-${item.code}`}
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
  }

  if (groups.loading) {
    return (
      <PageLayout
        headerIcon={FileTextIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
      >
        <div className="gba:py-12">Loading...</div>
      </PageLayout>
    )
  }

  if (groups.error) {
    return (
      <PageLayout
        headerIcon={FileTextIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
      >
        <Alert variant="destructive">{groups.error}</Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      headerIcon={FileTextIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
    >
      <div className="gba:flex gba:gap-6 gba:h-full">
        {/* Left Sidebar - Document Groups */}
        <div className="gba:w-80 gba:flex-shrink-0">
          <Card className="gba:h-full">
            <div className="gba:p-4 gba:border-b">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Document Groups</h3>
                <Button
                  size="sm"
                  onClick={() => handleOpenDialog('group')}
                  data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-add-group-button`}
                >
                  <Plus className="gba:w-4 gba:h-4" />
                </Button>
              </div>
              <DebouncedInput
                value={groupSearchTerm}
                onChange={setGroupSearchTerm}
                placeholder="Search groups..."
                debounce={300}
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-search`}
              />
            </div>

            <div className="gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {groups.loading ? (
                <div className="gba:p-4 gba:text-center gba:text-muted-foreground">Loading groups...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="gba:p-4">
                  <EmptyState
                    title="No groups found"
                    description={groupSearchTerm ? 'Try adjusting your search' : 'Click + to add a group'}
                  />
                </div>
              ) : (
                <div className="gba:p-2">
                  {filteredGroups.map(group => {
                    const typesCount = types.data.filter(t => t.parentEntryId === group.id).length
                    const isSelected = selectedGroup?.id === group.id

                    return (
                      <div
                        key={group.id}
                        className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:cursor-pointer gba:mb-1 gba:group ${
                          isSelected ? 'gba:bg-accent gba:text-accent-foreground' : 'hover:gba:bg-muted'
                        }`}
                        onClick={() => handleGroupSelect(group)}
                        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-${group.code}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                          <FolderIcon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:text-sm gba:font-medium gba:truncate">{group.value}</div>
                            <div className="gba:text-xs gba:text-muted-foreground">{typesCount} types</div>
                          </div>
                        </div>
                        <div className="gba:flex gba:gap-1 gba:opacity-0 group-hover:gba:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="gba:h-6 gba:w-6"
                            onClick={e => {
                              e.stopPropagation()
                              handleOpenDialog('group', group)
                            }}
                            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-edit-${group.code}`}
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
                            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-group-delete-${group.code}`}
                          >
                            <Trash2 className="gba:w-3 gba:h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel - Document Types */}
        <div className="gba:flex-1 gba:min-w-0">
          {!selectedGroup ? (
            <div className="gba:py-12">
              <EmptyState
                title="Select a document group"
                description="Choose a group from the sidebar to view and manage its document types"
              />
            </div>
          ) : (
            <div className="gba:space-y-4">
              <div className="gba:flex gba:justify-between gba:items-start">
                <div>
                  <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{selectedGroup.value}</h2>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Manage document types for this group</p>
                </div>
                <Button
                  onClick={() => handleOpenDialog('type')}
                  data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-add-type-button`}
                >
                  <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Add Type
                </Button>
              </div>

              {renderTypesTable()}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog`}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {dialogMode === 'group' ? 'Document Group' : 'Document Type'}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-6">
            <div className="gba:space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="FINANCIAL"
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-code`}
                disabled={!!editingItem}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder="Financial Documents"
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-value`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                placeholder="Optional type classification"
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-type`}
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
                  setFormData({ ...formData, displayOrder: value === '' ? 0 : parseInt(value, 10) || 0 })
                }}
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-display-order`}
              />
            </div>
          </div>

          <DialogFooter className="gba:flex gba:justify-end gba:gap-2 gba:pt-6">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-cancel`}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-dialog-save`}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
