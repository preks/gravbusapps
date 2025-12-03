import React, { useState } from 'react'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Alert,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { CatalogEntry } from '@/common/data/catalog'

interface TypeFormData {
  code: string
  value: string
  description?: string
  displayOrder: number
}

interface TypeTableProps {
  types: CatalogEntry[]
  isLoading: boolean
  error: string | null
  onCreate: (data: TypeFormData) => Promise<void>
  onUpdate: (id: string, data: TypeFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
  prefixDataTestId?: string
}

export const TypeTable: React.FC<TypeTableProps> = ({
  types,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  prefixDataTestId = 'type-table'
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingType, setEditingType] = useState<CatalogEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<TypeFormData>({
    defaultValues: {
      code: '',
      value: '',
      description: '',
      displayOrder: 0
    }
  })

  const handleCreate = async (data: TypeFormData) => {
    setSubmitting(true)
    try {
      await onCreate(data)
      setIsCreateOpen(false)
      form.reset()
    } catch (err) {
      console.error('Failed to create type:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: TypeFormData) => {
    if (!editingType) return
    setSubmitting(true)
    try {
      await onUpdate(editingType.id, data)
      setEditingType(null)
      form.reset()
    } catch (err) {
      console.error('Failed to update type:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSubmitting(true)
    try {
      await onDelete(id)
      setDeletingId(null)
    } catch (err) {
      console.error('Failed to delete type:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (type: CatalogEntry) => {
    setEditingType(type)
    form.reset({
      code: type.code || '',
      value: type.value || '',
      description: type.description || '',
      displayOrder: type.displayOrder || 0
    })
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertDescription>
          {error}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-2">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const sortedTypes = [...types].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  return (
    <div data-testid={prefixDataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold">Content Types ({types.length})</h3>
        <Button onClick={() => setIsCreateOpen(true)} data-testid={`${prefixDataTestId}-add-button`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Add Type
        </Button>
      </div>

      <Table data-testid={`${prefixDataTestId}-table`}>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Display Order</TableHead>
            <TableHead className="gba:w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTypes.map(type => (
            <TableRow key={type.id} data-testid={`${prefixDataTestId}-row-${type.id}`}>
              <TableCell>
                <Badge variant="outline">{type.code}</Badge>
              </TableCell>
              <TableCell>{type.value}</TableCell>
              <TableCell className="gba:max-w-md gba:truncate">{type.description}</TableCell>
              <TableCell>{type.displayOrder}</TableCell>
              <TableCell>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(type)}
                    data-testid={`${prefixDataTestId}-edit-button-${type.id}`}
                  >
                    <Pencil className="gba:w-4 gba:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(type.id)}
                    data-testid={`${prefixDataTestId}-delete-button-${type.id}`}
                  >
                    <Trash2 className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid={`${prefixDataTestId}-create-dialog`}>
          <DialogHeader>
            <DialogTitle>Create Content Type</DialogTitle>
            <DialogDescription>Add a new content type</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (UPPER_SNAKE_CASE)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ARTICLE" data-testid={`${prefixDataTestId}-create-code-input`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Article" data-testid={`${prefixDataTestId}-create-value-input`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Detailed description of this content type"
                        data-testid={`${prefixDataTestId}-create-description-input`}
                      />
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
                        {...field}
                        type="number"
                        onChange={e => field.onChange(Number.parseInt(e.target.value, 10))}
                        data-testid={`${prefixDataTestId}-create-order-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} data-testid={`${prefixDataTestId}-create-submit`}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={open => !open && setEditingType(null)}>
        <DialogContent data-testid={`${prefixDataTestId}-edit-dialog`}>
          <DialogHeader>
            <DialogTitle>Edit Content Type</DialogTitle>
            <DialogDescription>Update content type details</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (UPPER_SNAKE_CASE)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`${prefixDataTestId}-edit-code-input`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`${prefixDataTestId}-edit-value-input`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid={`${prefixDataTestId}-edit-description-input`} />
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
                        {...field}
                        type="number"
                        onChange={e => field.onChange(Number.parseInt(e.target.value, 10))}
                        data-testid={`${prefixDataTestId}-edit-order-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingType(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} data-testid={`${prefixDataTestId}-edit-submit`}>
                  {submitting ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent data-testid={`${prefixDataTestId}-delete-dialog`}>
          <DialogHeader>
            <DialogTitle>Delete Content Type</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={submitting}
              data-testid={`${prefixDataTestId}-delete-confirm`}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
