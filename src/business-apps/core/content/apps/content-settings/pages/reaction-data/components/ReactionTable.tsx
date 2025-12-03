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
  Alert,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { CatalogEntry } from '@/common/data/catalog'
import { ReactionFormDialog } from './ReactionFormDialog'

interface ReactionFormData {
  type: 'EMOJI' | 'CUSTOM'
  code: string
  value: string
  description: string
  additionalValue1: string
  additionalValue2: string
  additionalValue3: string
  alternativeCode: string
  displayOrder: number
}

interface ReactionTableProps {
  reactions: CatalogEntry[]
  error: string | null
  onCreate: (data: ReactionFormData) => Promise<void>
  onUpdate: (id: string, data: ReactionFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
  prefixDataTestId?: string
}

export const ReactionTable: React.FC<ReactionTableProps> = ({
  reactions,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  prefixDataTestId = 'reaction-table'
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingReaction, setEditingReaction] = useState<CatalogEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Calculate next display order for new reactions (starts at 0)
  const nextDisplayOrder = reactions.length > 0 ? Math.max(...reactions.map(r => r.displayOrder ?? -1)) + 1 : 0

  const handleCreate = async (data: ReactionFormData) => {
    setSubmitting(true)
    try {
      await onCreate(data)
      setIsCreateOpen(false)
    } catch (err) {
      console.error('Failed to create reaction:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: ReactionFormData) => {
    if (!editingReaction) return
    setSubmitting(true)
    try {
      await onUpdate(editingReaction.id, data)
      setEditingReaction(null)
    } catch (err) {
      console.error('Failed to update reaction:', err)
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
      console.error('Failed to delete reaction:', err)
    } finally {
      setSubmitting(false)
    }
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

  const sortedReactions = [...reactions].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  return (
    <div data-testid={prefixDataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold">Reactions ({reactions.length})</h3>
        <Button onClick={() => setIsCreateOpen(true)} data-testid={`${prefixDataTestId}-add-button`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Add Reaction
        </Button>
      </div>

      <Table data-testid={`${prefixDataTestId}-table`}>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Unified/URL</TableHead>
            <TableHead>Shortcode</TableHead>
            <TableHead>Order</TableHead>
            <TableHead className="gba:w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReactions.map(reaction => {
            const isEmoji = reaction.type === 'EMOJI'
            const isCustom = reaction.type === 'CUSTOM'

            return (
              <TableRow key={reaction.id} data-testid={`${prefixDataTestId}-row-${reaction.id}`}>
                <TableCell>
                  {isEmoji && (
                    <span className="gba:text-3xl" data-testid={`${prefixDataTestId}-emoji-${reaction.id}`}>
                      {reaction.description}
                    </span>
                  )}
                  {isCustom && reaction.additionalValue2 && (
                    <img
                      src={reaction.additionalValue2}
                      alt={reaction.value || 'Custom reaction'}
                      className="gba:w-8 gba:h-8"
                      data-testid={`${prefixDataTestId}-custom-image-${reaction.id}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={isEmoji ? 'default' : 'secondary'}>{reaction.type || 'EMOJI'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{reaction.code}</Badge>
                </TableCell>
                <TableCell>{reaction.value}</TableCell>
                <TableCell className="gba:text-xs gba:text-muted-foreground gba:max-w-32 gba:truncate">
                  {reaction.additionalValue2}
                </TableCell>
                <TableCell className="gba:text-xs gba:text-muted-foreground">{reaction.alternativeCode}</TableCell>
                <TableCell>{reaction.displayOrder}</TableCell>
                <TableCell>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingReaction(reaction)}
                      data-testid={`${prefixDataTestId}-edit-button-${reaction.id}`}
                    >
                      <Pencil className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(reaction.id)}
                      data-testid={`${prefixDataTestId}-delete-button-${reaction.id}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <ReactionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        submitting={submitting}
        nextDisplayOrder={nextDisplayOrder}
        prefixDataTestId={`${prefixDataTestId}-create`}
      />

      {/* Edit Dialog */}
      <ReactionFormDialog
        open={!!editingReaction}
        onOpenChange={open => !open && setEditingReaction(null)}
        onSubmit={handleUpdate}
        submitting={submitting}
        initialData={editingReaction || undefined}
        prefixDataTestId={`${prefixDataTestId}-edit`}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent data-testid={`${prefixDataTestId}-delete-dialog`}>
          <DialogHeader>
            <DialogTitle>Delete Reaction</DialogTitle>
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
