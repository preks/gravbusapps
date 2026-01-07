import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  Icon,
  toast
} from '@newwork/nw-design-system'
import { useState } from 'react'
import { WarningIcon, TrashIcon } from '@phosphor-icons/react'

type DeleteButtonProps = {
  itemName: string
  itemTitle: string
  onDelete: () => Promise<void>
  triggerButtonText?: string
  open?: boolean
  setOpen?: (open: boolean) => void
  showCancelButton?: boolean
}

const DeleteButton = ({
  itemName,
  itemTitle,
  onDelete,
  triggerButtonText,
  open,
  setOpen,
  showCancelButton = true
}: DeleteButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      await onDelete()
    } catch (error) {
      console.error('Error deleting item:', error)

      const defaultErrorMessage = `Failed to delete ${itemName}. Please try again.`
      toast.error(defaultErrorMessage)
    } finally {
      setIsDeleting(false)
      setOpen?.(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showCancelButton && (
        <DialogTrigger asChild>
          <Button size="sm" variant={triggerButtonText ? 'outline' : 'ghost'}>
            <Icon icon={TrashIcon} /> {triggerButtonText}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Icon icon={WarningIcon} className="gba:text-destructive" />
            Delete {itemTitle}
          </DialogTitle>
          <DialogDescription>{`Are you sure you want to delete ${itemName}?`}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteButton }
