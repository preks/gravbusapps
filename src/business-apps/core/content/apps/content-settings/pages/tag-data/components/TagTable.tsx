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
  AlertDescription
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { ContentTag } from '@/common/data/content/types/contentTypes'

interface TagFormData {
  name: string
}

interface TagTableProps {
  tags: ContentTag[]
  isLoading: boolean
  error: string | null
  onCreate: (data: TagFormData) => Promise<void>
  onUpdate: (id: string, data: TagFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
  prefixDataTestId?: string
}

export const TagTable: React.FC<TagTableProps> = ({
  tags,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  prefixDataTestId = 'tag-table'
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ContentTag | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<TagFormData>({
    defaultValues: { name: '' }
  })

  const handleCreate = async (data: TagFormData) => {
    setSubmitting(true)
    try {
      await onCreate(data)
      setIsCreateOpen(false)
      form.reset()
    } catch (err) {
      console.error('Failed to create tag:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: TagFormData) => {
    if (!editingTag) return
    setSubmitting(true)
    try {
      await onUpdate(editingTag.id, data)
      setEditingTag(null)
      form.reset()
    } catch (err) {
      console.error('Failed to update tag:', err)
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
      console.error('Failed to delete tag:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (tag: ContentTag) => {
    setEditingTag(tag)
    form.reset({ name: tag.name || '' })
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

  return (
    <div data-testid={prefixDataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold">Tags ({tags.length})</h3>
        <Button onClick={() => setIsCreateOpen(true)} data-testid={`${prefixDataTestId}-add-button`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Add Tag
        </Button>
      </div>

      <Table data-testid={`${prefixDataTestId}-table`}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="gba:w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map(tag => (
            <TableRow key={tag.id} data-testid={`${prefixDataTestId}-row-${tag.id}`}>
              <TableCell>{tag.name}</TableCell>
              <TableCell>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                    data-testid={`${prefixDataTestId}-edit-button-${tag.id}`}
                  >
                    <Pencil className="gba:w-4 gba:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(tag.id)}
                    data-testid={`${prefixDataTestId}-delete-button-${tag.id}`}
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
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>Add a new content tag</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Technology"
                        data-testid={`${prefixDataTestId}-create-name-input`}
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
      <Dialog open={!!editingTag} onOpenChange={open => !open && setEditingTag(null)}>
        <DialogContent data-testid={`${prefixDataTestId}-edit-dialog`}>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update tag name</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`${prefixDataTestId}-edit-name-input`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTag(null)}>
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
            <DialogTitle>Delete Tag</DialogTitle>
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
