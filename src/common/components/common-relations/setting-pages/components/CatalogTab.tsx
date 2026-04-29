import React, { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Badge,
  Alert,
  AlertDescription,
  EmptyState
} from '@newwork/nw-design-system'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'
import type {
  CatalogItem,
  CatalogUpsertData,
  CatalogTabState,
  CatalogTabHandlers,
  DeleteAvailability,
  DeleteAvailabilityResolver
} from '../types/catalogTypes'
import { pluralize } from '@/common/utils/pluralize'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

interface CatalogTabProps extends CatalogTabState, CatalogTabHandlers {
  entityName: string
  dataTestId: string
  getDeleteAvailability: DeleteAvailabilityResolver<CatalogItem>
  onSearchChange?: (value: string) => void
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  entityName,
  dataTestId,
  items,
  isLoading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  getDeleteAvailability,
  onRetry
}) => {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null)
  const [deleteAvailability, setDeleteAvailability] = useState<DeleteAvailability | undefined>()
  const [isCheckingDeleteAvailability, setIsCheckingDeleteAvailability] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<CatalogUpsertData>({
    defaultValues: {
      code: '',
      value: '',
      type: '',
      displayOrder: 0
    }
  })

  const filtered = useMemo(() => {
    if (!search) return items
    const lowerSearch = search.toLowerCase()
    return items.filter(
      item =>
        item.code?.toLowerCase().includes(lowerSearch) ||
        item.value?.toLowerCase().includes(lowerSearch) ||
        item.type?.toLowerCase().includes(lowerSearch) ||
        item.alternativeCode?.toLowerCase().includes(lowerSearch)
    )
  }, [items, search])

  const handleAdd = () => {
    form.reset({ code: '', value: '', type: '', displayOrder: 0 })
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: CatalogItem) => {
    form.reset({
      code: item.code,
      value: item.value,
      type: item.type || '',
      displayOrder: item.displayOrder ?? 0
    })
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: CatalogUpsertData) => {
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, data)
      } else {
        await onCreate(data)
      }
      setIsModalOpen(false)
      form.reset()
      setEditingItem(null)
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  const handleDeleteRequest = async (item: CatalogItem) => {
    setDeleteTarget(item)
    setDeleteAvailability(undefined)
    setIsCheckingDeleteAvailability(true)

    try {
      const availability = await getDeleteAvailability(item)
      setDeleteAvailability(availability)
    } catch (err) {
      console.error('Error checking delete availability:', err)
      setDeleteAvailability({
        status: 'blocked',
        reason: `Unable to verify whether this ${entityName.toLowerCase()} can be deleted.`
      })
    } finally {
      setIsCheckingDeleteAvailability(false)
    }
  }

  const handleCancelDelete = () => {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteAvailability(undefined)
    setIsCheckingDeleteAvailability(false)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteAvailability?.status === 'blocked') return

    try {
      setIsDeleting(true)
      await onDelete(deleteTarget.id)
      handleCancelDelete()
    } catch (err) {
      console.error('Error deleting item:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const renderOrderBadge = (item: CatalogItem) => {
    if (item.displayOrder != null) {
      return <Badge variant="secondary">{item.displayOrder}</Badge>
    }
    if (item.alternativeCode) {
      return <Badge variant="secondary">{item.alternativeCode}</Badge>
    }
    return <span>-</span>
  }

  return (
    <div data-testid={dataTestId}>
      <div className="gba:flex gba:justify-end gba:mb-6">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid={`${dataTestId}-Add-Button`}>
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Add {entityName}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${dataTestId}-Dialog`}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit' : 'Add'} {entityName}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update' : 'Create'} a {entityName.toLowerCase()} entry
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Code is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Code-Input`} disabled={!!editingItem} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  rules={{ required: 'Value is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Value-Input`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Type-Input`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          onChange={e => {
                            const value = e.target.value
                            field.onChange(value === '' ? 0 : Number.parseInt(value, 10) || 0)
                          }}
                          value={field.value ?? 0}
                          data-testid={`${dataTestId}-DisplayOrder-Input`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false)
                      form.reset()
                    }}
                    data-testid={`${dataTestId}-Cancel-Button`}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid={`${dataTestId}-Submit-Button`}>
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="gba:rounded-md gba:border gba:p-4 gba:mb-6">
        <DebouncedInput
          placeholder="Search..."
          value={search}
          onChange={v => setSearch(v)}
          data-testid={`${dataTestId}-Search-Input`}
        />
      </div>

      <div className="gba:rounded-md gba:border">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table data-testid={`${dataTestId}-Table`}>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="gba:w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:py-8">
                    <EmptyState
                      title={
                        search
                          ? 'No entries match your search'
                          : `No ${pluralize(entityName.toLowerCase())} configured yet`
                      }
                      description={
                        search
                          ? 'Try adjusting your search terms'
                          : `Click "Add ${entityName}" to create your first entry`
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.code}</Badge>
                    </TableCell>
                    <TableCell>{item.value}</TableCell>
                    <TableCell>{item.type ? <Badge variant="secondary">{item.type}</Badge> : <span>-</span>}</TableCell>
                    <TableCell>{renderOrderBadge(item)}</TableCell>
                    <TableCell>
                      <div className="gba:flex gba:gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`${dataTestId}-Edit-Button-${item.id}`}
                        >
                          <PencilSimpleIcon className="gba:w-4 gba:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRequest(item)}
                          data-testid={`${dataTestId}-Delete-Button-${item.id}`}
                        >
                          <TrashIcon className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {error && onRetry && (
        <Alert variant="destructive" className="gba:mt-4">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        itemName={deleteTarget?.value || ''}
        itemType={entityName}
        availability={deleteAvailability}
        isChecking={isCheckingDeleteAvailability}
        isDeleting={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        dataTestId={`${dataTestId}-Delete-Dialog`}
      />
    </div>
  )
}
