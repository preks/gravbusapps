/**
 * TransformMenu Component
 * Provides AI-powered transformation options for handwritten notes
 */

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { Wand2, Copy, FileText, ListTodo, Languages, Sparkles } from 'lucide-react'

export type TransformType =
  | 'copy-text' // Copy extracted text to clipboard
  | 'to-text' // Convert this note to text
  | 'create-text-note' // Create new text note
  | 'summarize' // Summarize content
  | 'action-items' // Extract action items
  | 'translate' // Translate content

interface TransformMenuProps {
  onTransform: (type: TransformType) => void
  isProcessing?: boolean
  disabled?: boolean
}

export const TransformMenu: React.FC<TransformMenuProps> = ({
  onTransform,
  isProcessing = false,
  disabled = false
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isProcessing} className="gba:gap-2">
          {isProcessing ? <Spinner className="gba:w-4 gba:h-4" /> : <Wand2 className="gba:w-4 gba:h-4" />}
          Transform
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="gba:w-56">
        <DropdownMenuItem onClick={() => onTransform('copy-text')}>
          <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Copy as Text</div>
            <div className="gba:text-xs gba:text-muted-foreground">Extract and copy text</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onTransform('to-text')}>
          <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Convert to Text</div>
            <div className="gba:text-xs gba:text-muted-foreground">Replace with typed text</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onTransform('create-text-note')}>
          <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Create Text Note</div>
            <div className="gba:text-xs gba:text-muted-foreground">New note with text</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onTransform('summarize')}>
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Summarize</div>
            <div className="gba:text-xs gba:text-muted-foreground">AI summary of content</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onTransform('action-items')}>
          <ListTodo className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Extract Action Items</div>
            <div className="gba:text-xs gba:text-muted-foreground">Find tasks and to-dos</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onTransform('translate')}>
          <Languages className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">Translate</div>
            <div className="gba:text-xs gba:text-muted-foreground">Translate to English</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
