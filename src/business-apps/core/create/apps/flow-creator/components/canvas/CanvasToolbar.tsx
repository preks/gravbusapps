/**
 * CanvasToolbar - Toolbar above the canvas with undo/redo, selection actions,
 * mode toggle, simulate, and save.
 */

import React from 'react'
import { Button, Separator } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { Undo2, Redo2, Save, Play, Trash2, Copy } from 'lucide-react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { ModeToggle } from '../shared/ModeToggle'
import type { DesignerMode } from '../../types/studioTypes'

interface CanvasToolbarProps {
  onSave?: () => void
  onSimulate?: () => void
  mode?: DesignerMode
  onModeChange?: (mode: DesignerMode) => void
  'data-testid'?: string
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onSave,
  onSimulate,
  mode,
  onModeChange,
  'data-testid': testId = 'flow-studio-canvas-toolbar'
}) => {
  const { t } = useTranslation(translations)

  const undo = useFlowStudioStore(s => s.undo)
  const redo = useFlowStudioStore(s => s.redo)
  const undoStack = useFlowStudioStore(s => s.undoStack)
  const redoStack = useFlowStudioStore(s => s.redoStack)
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const requestDeleteNode = useFlowStudioStore(s => s.requestDeleteNode)
  const duplicateNode = useFlowStudioStore(s => s.duplicateNode)
  const isDirty = useFlowStudioStore(s => s.isDirty)

  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:px-3 gba:py-1.5 gba:border-b gba:border-border gba:bg-card"
      data-testid={testId}
    >
      {/* Undo / Redo */}
      <Button variant="ghost" size="sm" onClick={undo} disabled={undoStack.length === 0} data-testid={`${testId}-undo`}>
        <Undo2 className="gba:h-4 gba:w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={redo} disabled={redoStack.length === 0} data-testid={`${testId}-redo`}>
        <Redo2 className="gba:h-4 gba:w-4" />
      </Button>

      <Separator orientation="vertical" className="gba:h-5 gba:mx-1" />

      {/* Selection actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => selectedNodeId && duplicateNode(selectedNodeId)}
        disabled={!selectedNodeId}
        data-testid={`${testId}-duplicate`}
      >
        <Copy className="gba:h-4 gba:w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => selectedNodeId && requestDeleteNode(selectedNodeId)}
        disabled={!selectedNodeId}
        data-testid={`${testId}-delete`}
      >
        <Trash2 className="gba:h-4 gba:w-4" />
      </Button>

      {/* Spacer */}
      <div className="gba:flex-1" />

      {/* Mode toggle */}
      {mode && onModeChange && (
        <>
          <ModeToggle mode={mode} onChange={onModeChange} data-testid={`${testId}-mode-toggle`} />
          <Separator orientation="vertical" className="gba:h-5 gba:mx-1" />
        </>
      )}

      {/* Simulate */}
      <Button variant="outline" size="sm" onClick={onSimulate} data-testid={`${testId}-simulate`}>
        <Play className="gba:h-4 gba:w-4 gba:mr-1" />
        <span className="gba:text-xs">{t('toolbar-simulate')}</span>
      </Button>

      {/* Save */}
      <Button variant="default" size="sm" onClick={onSave} disabled={!isDirty} data-testid={`${testId}-save`}>
        <Save className="gba:h-4 gba:w-4 gba:mr-1" />
        <span className="gba:text-xs">{t('toolbar-save')}</span>
      </Button>
    </div>
  )
}
