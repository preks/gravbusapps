/**
 * CreateBoardDialog — premium styled dialog for creating a new board.
 */

import React, { useEffect, useRef } from 'react'
import { Button, Input, Label, Dialog, DialogContent, DialogFooter } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

export interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: () => void
  'data-testid'?: string
}

export const CreateBoardDialog: React.FC<CreateBoardDialogProps> = ({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
  'data-testid': testId = 'create-board-dialog'
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const el = contentRef.current
      if (!el) return
      const parent = el.parentElement
      const overlay =
        parent?.querySelector<HTMLElement>('[data-slot="dialog-overlay"]') ??
        (el.previousElementSibling as HTMLElement | null)
      if (overlay instanceof HTMLElement) {
        overlay.style.backdropFilter = 'blur(4px)'
        overlay.style.setProperty('-webkit-backdrop-filter', 'blur(4px)')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="gba:max-w-sm gba:p-0 gba:gap-0 gba:overflow-hidden gba:rounded-xl">
        {/* Premium gradient header */}
        <div className="gba:relative gba:overflow-hidden gba:px-6 gba:pt-8 gba:pb-6">
          <PremiumHeroBackground />
          <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
          <div className="gba:relative gba:z-10">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-inverse/10 gba:border gba:border-inverse/20 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <Plus className="gba:w-5 gba:h-5 gba:text-inverse" />
            </div>
            <h2 className="gba:font-funnel-display gba:text-xl gba:font-light gba:text-inverse gba:tracking-tight">
              New Board
            </h2>
            <p className="gba:text-sm gba:text-inverse/50 gba:mt-1">Give your board a name to get started.</p>
          </div>
        </div>

        <div className="gba:px-6 gba:py-5">
          <Label
            htmlFor="board-name"
            className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider"
          >
            Board name
          </Label>
          <Input
            id="board-name"
            placeholder="My Board"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="gba:mt-2"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) onSubmit()
            }}
            data-testid={`${testId}-name`}
          />
        </div>

        <DialogFooter className="gba:px-6 gba:pb-5 gba:pt-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!name.trim()}
            className="gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:border-0 gba:hover:bg-desk-badge-golden/90"
            data-testid={`${testId}-submit`}
          >
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
