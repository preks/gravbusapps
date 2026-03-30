import React from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown, MousePointer2, Replace, Search } from 'lucide-react'
import translations from '../../_i18n'
import { RibbonGroup } from './editorToolbarShared'

interface ToolbarGroupFindProps {
  editor: Editor
  onOpenFind: () => void
  onOpenReplace: () => void
  testId?: string
}

export function ToolbarGroupFind({
  editor,
  onOpenFind,
  onOpenReplace,
  testId = 'editor-toolbar'
}: Readonly<ToolbarGroupFindProps>) {
  const { t } = useTranslation(translations)

  return (
    <RibbonGroup label={t('navigation-panel-find-tab')} data-testid={testId ? `${testId}-group-find` : undefined}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:gap-1 gba:border-border/70 gba:bg-background gba:px-2.5 gba:text-xs"
            data-testid={testId ? `${testId}-find-trigger` : undefined}
          >
            <Search className="gba:h-4 gba:w-4" />
            <span>{t('navigation-panel-find-tab')}</span>
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onOpenFind} data-testid={testId ? `${testId}-find-action` : undefined}>
            <Search className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('navigation-panel-find-tab')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenReplace} data-testid={testId ? `${testId}-replace-action` : undefined}>
            <Replace className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('navigation-panel-replace-tab')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().selectAll().run()}
            data-testid={testId ? `${testId}-select-all-action` : undefined}
          >
            <MousePointer2 className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-select-all')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </RibbonGroup>
  )
}
