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
  Alert,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { CatalogEntry } from '@/common/data/catalog'

interface CategoryFormData {
  code: string
  value: string
  displayOrder: number
}

interface CategoryTableProps {
  categories: CatalogEntry[]
  isLoading: boolean
  error: string | null
  onCreate: (data: CategoryFormData) => Promise<void>
  onUpdate: (id: string, data: CategoryFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
  prefixDataTestId?: string
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  prefixDataTestId = 'category-table'
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CatalogEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CategoryFormData>({
    defaultValues: {
      code: '',
      value: '',
      displayOrder: 0
    }
  })

  const handleCreate = async (data: CategoryFormData) => {
    setSubmitting(true)
    try {
      await onCreate(data)
      setIsCreateOpen(false)
      form.reset()
    } catch (err) {
      console.error('Failed to create category:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: CategoryFormData) => {
    if (!editingCategory) return
    setSubmitting(true)
    try {
      await onUpdate(editingCategory.id, data)
      setEditingCategory(null)
      form.reset()
    } catch (err) {
      console.error('Failed to update category:', err)
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
      console.error('Failed to delete category:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (category: CatalogEntry) => {
    setEditingCategory(category)
    form.reset({
      code: category.code || '',
      value: category.value || '',
      displayOrder: category.displayOrder || 0
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

  const sortedCategories = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  return (
    <div data-testid={prefixDataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold">Categories ({categories.length})</h3>
        <Button onClick={() => setIsCreateOpen(true)} data-testid={`${prefixDataTestId}-add-button`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Add Category
        </Button>
      </div>

      <Table data-testid={`${prefixDataTestId}-table`}>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Display Order</TableHead>
            <TableHead className="gba:w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCategories.map(category => (
            <TableRow key={category.id} data-testid={`${prefixDataTestId}-row-${category.id}`}>
              <TableCell>
                <Badge variant="outline">{category.code}</Badge>
              </TableCell>
              <TableCell>{category.value}</TableCell>
              <TableCell>{category.displayOrder}</TableCell>
              <TableCell>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                    data-testid={`${prefixDataTestId}-edit-button-${category.id}`}
                  >
                    <Pencil className="gba:w-4 gba:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(category.id)}
                    data-testid={`${prefixDataTestId}-delete-button-${category.id}`}
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
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new content category</DialogDescription>
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
                      <Input
                        {...field}
                        placeholder="COMPANY_NEWS"
                        data-testid={`${prefixDataTestId}-create-code-input`}
                      />
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
                      <Input
                        {...field}
                        placeholder="Company News"
                        data-testid={`${prefixDataTestId}-create-value-input`}
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
      <Dialog open={!!editingCategory} onOpenChange={open => !open && setEditingCategory(null)}>
        <DialogContent data-testid={`${prefixDataTestId}-edit-dialog`}>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
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
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
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
            <DialogTitle>Delete Category</DialogTitle>
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
