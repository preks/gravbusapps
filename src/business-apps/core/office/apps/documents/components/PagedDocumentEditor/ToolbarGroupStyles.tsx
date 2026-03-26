/**
 * Ribbon group: Styles (heading dropdown).
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { RibbonGroup, HEADING_LEVELS } from './editorToolbarShared'

interface ToolbarGroupStylesProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupStyles({ editor, testId = 'editor-toolbar' }: Readonly<ToolbarGroupStylesProps>) {
  const { t } = useTranslation(translations)
  const getCurrentHeading = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return t(`editor-heading-${i}`)
    }
    return t('editor-heading-normal')
  }
  return (
    <RibbonGroup label={t('editor-ribbon-group-styles')} data-testid={testId ? `${testId}-group-styles` : undefined}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:min-w-[110px] gba:justify-between gba:border-border/70 gba:bg-background"
          >
            <span className="gba:text-xs">{getCurrentHeading()}</span>
            <ChevronDown className="gba:h-3 gba:w-3 gba:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {HEADING_LEVELS.map(({ label, value }) => (
            <DropdownMenuItem
              key={label}
              onClick={() => {
                if (value === 0) editor.chain().focus().setParagraph().run()
                else
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: value as 1 | 2 | 3 | 4 | 5 | 6 })
                    .run()
              }}
            >
              {value === 0 ? t('editor-heading-normal') : t(`editor-heading-${value}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </RibbonGroup>
  )
}
