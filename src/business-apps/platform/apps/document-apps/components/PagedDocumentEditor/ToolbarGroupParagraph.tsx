/**
 * Ribbon group: Lists, indent, alignment, spacing, blockquote, code, hr, clear formatting.
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  ChevronDown,
  IndentIncrease,
  IndentDecrease,
  RemoveFormatting,
  Check,
  AlignVerticalJustifyCenter,
  ListChecks
} from 'lucide-react'
import { getCurrentSpacing } from './extensions/LineAndParagraphSpacing'
import { ToolbarButton, RibbonGroup, LINE_SPACING_OPTIONS, PARAGRAPH_SPACING_EM } from './editorToolbarShared'
import translations from '../../_i18n'

interface ToolbarGroupParagraphProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupParagraph({ editor, testId = 'editor-toolbar' }: Readonly<ToolbarGroupParagraphProps>) {
  const { t } = useTranslation(translations)
  return (
    <RibbonGroup
      label={t('editor-ribbon-group-paragraph')}
      data-testid={testId ? `${testId}-group-paragraph` : undefined}
    >
      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="gba:inline-flex">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={
                      editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')
                        ? 'secondary'
                        : 'ghost'
                    }
                    size="sm"
                    className="gba:h-8 gba:min-w-8 gba:px-1"
                    data-testid={testId ? `${testId}-list-dropdown-trigger` : undefined}
                  >
                    <List className="gba:h-4 gba:w-4" />
                    <ChevronDown className="gba:h-3.5 gba:w-3.5 gba:ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('editor-toolbar-bullet-list')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start" className="gba:min-w-[10rem]">
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleBulletList().run()}
            data-testid={testId ? `${testId}-list-dropdown-bullet` : undefined}
          >
            <List className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('editor-toolbar-bullet-list')}
            {editor.isActive('bulletList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleOrderedList().run()}
            data-testid={testId ? `${testId}-list-dropdown-ordered` : undefined}
          >
            <ListOrdered className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('editor-toolbar-numbered-list')}
            {editor.isActive('orderedList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleTaskList().run()}
            data-testid={testId ? `${testId}-list-dropdown-task` : undefined}
          >
            <ListChecks className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('editor-toolbar-task-list')}
            {editor.isActive('taskList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarButton
        onClick={() => {
          const itemType = editor.isActive('taskList') ? 'taskItem' : 'listItem'
          editor.chain().focus().liftListItem(itemType).run()
        }}
        disabled={!editor.can().liftListItem('listItem') && !editor.can().liftListItem('taskItem')}
        tooltip={t('editor-toolbar-decrease-indent')}
      >
        <IndentDecrease className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const itemType = editor.isActive('taskList') ? 'taskItem' : 'listItem'
          editor.chain().focus().sinkListItem(itemType).run()
        }}
        disabled={!editor.can().sinkListItem('listItem') && !editor.can().sinkListItem('taskItem')}
        tooltip={t('editor-toolbar-increase-indent')}
      >
        <IndentIncrease className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        tooltip={t('editor-toolbar-align-left')}
      >
        <AlignLeft className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        tooltip={t('editor-toolbar-align-center')}
      >
        <AlignCenter className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        tooltip={t('editor-toolbar-align-right')}
      >
        <AlignRight className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        tooltip={t('editor-toolbar-justify')}
      >
        <AlignJustify className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-8 gba:w-8 gba:p-0"
            data-testid="editor-toolbar-line-spacing"
            title={t('editor-toolbar-line-paragraph-spacing')}
          >
            <AlignVerticalJustifyCenter className="gba:h-4 gba:w-4" />
            <ChevronDown className="gba:h-3 gba:w-3 gba:ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={e => {
            e.preventDefault()
            editor.commands.focus()
          }}
        >
          {LINE_SPACING_OPTIONS.map(({ key, value }) => {
            const spacing = getCurrentSpacing(editor)
            const effective = spacing.lineHeight ?? 1.15
            const isActive = Math.abs(Number(effective) - value) < 0.01
            return (
              <DropdownMenuItem
                key={key}
                onSelect={() => requestAnimationFrame(() => editor.chain().focus().setLineHeight(value).run())}
              >
                {isActive ? <Check className="gba:h-4 gba:w-4 gba:mr-2" /> : <span className="gba:w-4 gba:mr-2" />}
                {t(`editor-line-spacing-${key}`)}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              requestAnimationFrame(() => editor.chain().focus().setMarginBefore(PARAGRAPH_SPACING_EM).run())
            }
          >
            {t('editor-paragraph-spacing-before')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              requestAnimationFrame(() => editor.chain().focus().setMarginAfter(PARAGRAPH_SPACING_EM).run())
            }
          >
            {t('editor-paragraph-spacing-after')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => requestAnimationFrame(() => editor.chain().focus().unsetMarginBefore().run())}
          >
            {t('editor-paragraph-spacing-remove-before')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => requestAnimationFrame(() => editor.chain().focus().unsetMarginAfter().run())}
          >
            {t('editor-paragraph-spacing-remove-after')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        tooltip={t('editor-toolbar-quote')}
      >
        <Quote className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        tooltip={t('editor-toolbar-code-block')}
      >
        <Code className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip={t('editor-toolbar-horizontal-rule')}
      >
        <Minus className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        tooltip={t('editor-toolbar-clear-formatting')}
      >
        <RemoveFormatting className="gba:h-4 gba:w-4" />
      </ToolbarButton>
    </RibbonGroup>
  )
}
