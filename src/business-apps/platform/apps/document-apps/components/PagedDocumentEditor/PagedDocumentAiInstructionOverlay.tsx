import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from 'react'
import { Button, Label, Textarea } from '@newwork/nw-design-system'

export interface PagedDocumentAiInstructionOverlayProps {
  open: boolean
  aiInstruction: string
  setAiInstruction: Dispatch<SetStateAction<string>>
  aiSelectionPreviewText: string
  hasLongAiSelectionPreview: boolean
  isAiSelectionPreviewExpanded: boolean
  setIsAiSelectionPreviewExpanded: Dispatch<SetStateAction<boolean>>
  onClose: () => void
  onSubmit: () => void
}

function handleInstructionInputAutoHeight(event: FormEvent<HTMLTextAreaElement>) {
  const textarea = event.currentTarget
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
}

function handleInstructionSubmitShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  aiInstruction: string,
  onSubmit: () => void
) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && aiInstruction.trim()) {
    event.preventDefault()
    onSubmit()
  }
}

export function PagedDocumentAiInstructionOverlay({
  open,
  aiInstruction,
  setAiInstruction,
  aiSelectionPreviewText,
  hasLongAiSelectionPreview,
  isAiSelectionPreviewExpanded,
  setIsAiSelectionPreviewExpanded,
  onClose,
  onSubmit
}: PagedDocumentAiInstructionOverlayProps) {
  if (!open) return null

  return (
    <div className="gba:absolute gba:top-24 gba:right-6 gba:z-30 gba:pointer-events-none">
      <div
        className="gba:pointer-events-auto gba:w-[420px] gba:max-w-[calc(100vw-3rem)] gba:rounded-md gba:border gba:bg-background gba:p-3 gba:space-y-2 gba:shadow-lg"
        data-testid="document-ai-instruction-inline"
      >
        <Label htmlFor="document-ai-instruction-input">Instruction</Label>
        <Textarea
          id="document-ai-instruction-input"
          value={aiInstruction}
          onChange={event => setAiInstruction(event.target.value)}
          onInput={handleInstructionInputAutoHeight}
          onKeyDown={event => handleInstructionSubmitShortcut(event, aiInstruction, onSubmit)}
          placeholder="Example: rewrite this in a more formal tone and fix grammar mistakes."
          rows={4}
          className="gba:min-h-[96px] gba:max-h-[220px] gba:overflow-y-auto"
          autoFocus
          data-testid="document-ai-instruction-input"
        />
        {aiSelectionPreviewText && (
          <div className="gba:space-y-1">
            <p className="gba:text-xs gba:text-muted-foreground" data-testid="document-ai-selection-hint">
              Selection detected. Edits will focus on this content unless you say otherwise.
            </p>
            <button
              type="button"
              className={`gba:overflow-y-auto gba:rounded-md gba:border gba:bg-muted/30 gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:text-left gba:w-full gba:appearance-none ${
                isAiSelectionPreviewExpanded ? 'gba:max-h-52' : 'gba:max-h-24'
              } ${hasLongAiSelectionPreview ? 'gba:cursor-pointer' : ''}`}
              data-testid="document-ai-selection-preview"
              onDoubleClick={() => {
                if (hasLongAiSelectionPreview) {
                  setIsAiSelectionPreviewExpanded(prev => !prev)
                }
              }}
              title={hasLongAiSelectionPreview ? 'Double-click to expand/collapse preview' : undefined}
            >
              <div className="gba:whitespace-pre-wrap">{aiSelectionPreviewText}</div>
            </button>
            {hasLongAiSelectionPreview && (
              <p className="gba:text-[10px] gba:text-muted-foreground">
                Double-click to {isAiSelectionPreviewExpanded ? 'collapse' : 'expand'}.
              </p>
            )}
          </div>
        )}
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onSubmit} disabled={!aiInstruction.trim()} data-testid="document-ai-instruction-confirm">
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
