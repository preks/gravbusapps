/**
 * CreateBoardAIDialog - create a board from a natural language prompt.
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Spinner,
  toast
} from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { useBoardAI } from '../hooks/useBoardAI'
import type { Board, BoardColumn } from '../types'

export interface CreateBoardAIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onBoardCreated: (board: Partial<Board>) => Promise<void>
  'data-testid'?: string
}

export const CreateBoardAIDialog: React.FC<CreateBoardAIDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  onBoardCreated,
  'data-testid': testId = 'create-board-ai-dialog'
}) => {
  const [prompt, setPrompt] = useState('')
  const { isProcessing, error, createBoardFromPrompt } = useBoardAI(accessToken)

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return
    const plan = await createBoardFromPrompt(prompt.trim())
    if (!plan) return

    const board: Partial<Board> = {
      name: plan.suggestedName || 'AI Board',
      sheets: plan.sheets.map((s, idx) => ({
        id: '',
        name: s.name || `Sheet ${idx + 1}`,
        position: idx,
        columns: (() => {
          const PRIMARY_NAMES = ['name', 'title', 'displayName', 'label', 'subject', 'taskName', 'itemName']
          const mapped: Partial<BoardColumn>[] = (s.columns || []).map((c, ci) => ({
            id: `col_${ci}`,
            name: (c.name as string) || `col_${ci}`,
            label: (c.label as string) || (c.name as string) || `Column ${ci + 1}`,
            type: (c.type as string) || 'text',
            isVisible: true,
            isEditable: true,
            isRequired: c.isRequired || false,
            isUnique: false,
            order: ci,
            selectOptions: c.selectOptions as Array<{ value: string; label: string; colorToken?: string }> | undefined
          }))
          const primary =
            mapped.find(c => PRIMARY_NAMES.includes(c.name || '')) || mapped.find(c => c.type === 'text') || mapped[0]
          if (primary) primary.isPrimary = true
          return mapped
        })(),
        views: (s.views || []).map((v, vi) => ({
          id: `view_${vi}`,
          name: (v.name as string) || 'Table',
          type: (v.type as string) || 'table',
          isDefault: vi === 0,
          config: v.config || { type: 'table' }
        })),
        groups: (s.groups || []).map((g, gi) => ({
          id: `grp_${gi}`,
          name: (g.name as string) || `Group ${gi + 1}`,
          order: gi,
          colorToken: g.colorToken as string | undefined
        })),
        settings: {
          allowAdd: true,
          allowEdit: true,
          allowDelete: true,
          allowExport: true,
          allowImport: true,
          rowsPerPage: 50,
          showRowNumbers: false
        }
      }))
    }

    await onBoardCreated(board)
    setPrompt('')
    onOpenChange(false)
    toast.success(`Board "${plan.suggestedName}" created`)
  }, [prompt, createBoardFromPrompt, error, onBoardCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
            Create Board with AI
          </DialogTitle>
        </DialogHeader>
        <div className="gba:py-3 gba:space-y-3">
          <div>
            <Label htmlFor="ai-prompt" className="gba:text-xs gba:mb-1 gba:block">
              Describe what you want to build
            </Label>
            <Input
              id="ai-prompt"
              placeholder="e.g. Project tracker with tasks, deadlines, assignees and status"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && prompt.trim() && !isProcessing) handleSubmit()
              }}
              data-testid={`${testId}-prompt`}
            />
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            AI will create columns, views, and groups based on your description.
          </p>
          {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isProcessing}
            data-testid={`${testId}-submit`}
          >
            {isProcessing ? (
              <>
                <Spinner className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
