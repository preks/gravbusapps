import type { ComponentProps, MouseEvent as ReactMouseEvent, PropsWithChildren, ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Check,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Clipboard,
  Columns3,
  Copy,
  ExternalLink,
  FileText,
  Grid2x2Plus,
  Grid2x2X,
  MessageSquare,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pencil,
  Rows3,
  Scissors,
  TableConfig,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Type,
  Wand2
} from 'lucide-react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import {
  resolveWordStyleWrapPreset,
  resolveWordStyleWrapPresetUpdate,
  type CustomImageAttributes,
  type ImageAlignment,
  type WordStyleWrapPreset
} from '@/components/tiptap-extensions/tiptap-custom-image'
import type { SetTableStyleOptions } from '@/components/tiptap-extensions/tiptap-custom-tables/types'
import { isAllowedHref } from '../../utils/linkUtils'
import translations from '../../_i18n'
import {
  canReadClipboard,
  canWriteClipboard,
  copySelectionToClipboard,
  cutSelectionToClipboard,
  pasteClipboardContent,
  pasteTextOnly,
  pasteWithMergeFormatting
} from './documentClipboardActions'
import type { DocumentContextMenuState } from './useDocumentContextMenu'

const MENU_CONTENT_CLASS = 'gba:w-60 gba:text-sm'
const SUBMENU_CONTENT_CLASS = 'gba:w-56 gba:text-sm'
const MENU_ROW_CLASS = 'gba:h-8 gba:px-2.5 gba:text-sm'
const MENU_ICON_CLASS = 'gba:h-3.5 gba:w-3.5'

const IMAGE_ALIGN_OPTIONS: ReadonlyArray<{
  key: string
  value: ImageAlignment
  icon: ReactNode
}> = [
  { key: 'editor-toolbar-align-left', value: 'left', icon: <AlignLeft className={MENU_ICON_CLASS} /> },
  { key: 'editor-toolbar-align-center', value: 'center', icon: <AlignCenter className={MENU_ICON_CLASS} /> },
  { key: 'editor-toolbar-align-right', value: 'right', icon: <AlignRight className={MENU_ICON_CLASS} /> }
]

const WORD_WRAP_OPTIONS: ReadonlyArray<{ key: string; value: WordStyleWrapPreset }> = [
  { key: 'image-wrap-inline', value: 'inline' },
  { key: 'image-wrap-square-left', value: 'square-left' },
  { key: 'image-wrap-square-right', value: 'square-right' },
  { key: 'image-wrap-behind', value: 'behind-text' },
  { key: 'image-wrap-in-front', value: 'in-front-of-text' }
]

type TableCanCommands = ReturnType<TiptapEditor['can']> & {
  duplicateRow: () => boolean
  duplicateColumn: () => boolean
  distributeRowsEvenly: (height: string) => boolean
  distributeColumnsEvenly: (width: string) => boolean
  setTableLayout: (options: { width?: string; align?: 'left' | 'center' | 'right'; mode?: string }) => boolean
  setTableStyleOptions: (options: SetTableStyleOptions) => boolean
}

interface DocumentContextMenuProps extends PropsWithChildren {
  editor: TiptapEditor | null
  contextMenuState: DocumentContextMenuState
  onContextMenuCapture: (event: ReactMouseEvent<HTMLElement>) => void
  onOpenLinkDialog: () => void
  onAddInlineComment: () => void
  onAiEditClick: () => void
  onOpenReplaceImageDialog: (imagePos: number | null) => void
  onOpenImageSidebar: () => void
  'data-testid'?: string
}

function focusEditor(editor: TiptapEditor | null) {
  editor?.commands.focus?.()
}

function updateContextMenuImageAttrs(
  editor: TiptapEditor | null,
  imageSelection: DocumentContextMenuState['imageSelection'],
  nextAttrs: Record<string, unknown>
) {
  if (!editor || !imageSelection) {
    return false
  }

  const tr = editor.state.tr
  tr.setNodeMarkup(imageSelection.pos, undefined, {
    ...imageSelection.attrs,
    ...nextAttrs
  })
  tr.setSelection(NodeSelection.create(tr.doc, imageSelection.pos))
  editor.view.dispatch(tr)
  editor.commands.refreshPagesAndStabilize?.()
  editor.view.focus()
  return true
}

function CompactContextMenuItem({ className, ...props }: Readonly<ComponentProps<typeof ContextMenuItem>>) {
  return <ContextMenuItem className={className ? `${MENU_ROW_CLASS} ${className}` : MENU_ROW_CLASS} {...props} />
}

function CompactContextMenuSubTrigger({ className, ...props }: Readonly<ComponentProps<typeof ContextMenuSubTrigger>>) {
  return <ContextMenuSubTrigger className={className ? `${MENU_ROW_CLASS} ${className}` : MENU_ROW_CLASS} {...props} />
}

function CompactContextMenuSubContent({ className, ...props }: Readonly<ComponentProps<typeof ContextMenuSubContent>>) {
  return (
    <ContextMenuSubContent
      className={className ? `${SUBMENU_CONTENT_CLASS} ${className}` : SUBMENU_CONTENT_CLASS}
      {...props}
    />
  )
}

function MenuLabel({
  children,
  shortcut,
  icon
}: Readonly<{ children: ReactNode; shortcut?: string; icon?: ReactNode }>) {
  return (
    <span className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3">
      <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-1.5">
        {icon ? <span className="gba:flex-shrink-0">{icon}</span> : null}
        <span className="gba:truncate">{children}</span>
      </span>
      {shortcut ? <span className="gba:text-xs gba:text-muted-foreground">{shortcut}</span> : null}
    </span>
  )
}

function renderClipboardItems(options: {
  editor: TiptapEditor
  allowCutCopy: boolean
  clipboardReadable: boolean
  testId: string
  t: (key: string) => string
}) {
  const { editor, allowCutCopy, clipboardReadable, testId, t } = options
  return (
    <>
      <CompactContextMenuItem
        onSelect={() => void cutSelectionToClipboard(editor)}
        disabled={!allowCutCopy}
        data-testid={`${testId}-cut`}
      >
        <MenuLabel shortcut="⌘+X" icon={<Scissors className={MENU_ICON_CLASS} />}>
          {t('document-context-cut')}
        </MenuLabel>
      </CompactContextMenuItem>
      <CompactContextMenuItem
        onSelect={() => void copySelectionToClipboard(editor)}
        disabled={!allowCutCopy}
        data-testid={`${testId}-copy`}
      >
        <MenuLabel shortcut="⌘+C" icon={<Copy className={MENU_ICON_CLASS} />}>
          {t('document-context-copy')}
        </MenuLabel>
      </CompactContextMenuItem>
      <CompactContextMenuItem
        onSelect={() => void pasteClipboardContent(editor)}
        disabled={!clipboardReadable}
        data-testid={`${testId}-paste`}
      >
        <MenuLabel shortcut="⌘+V" icon={<Clipboard className={MENU_ICON_CLASS} />}>
          {t('editor-toolbar-paste')}
        </MenuLabel>
      </CompactContextMenuItem>
      <CompactContextMenuItem
        onSelect={() => void pasteTextOnly(editor)}
        disabled={!clipboardReadable}
        data-testid={`${testId}-paste-text-only`}
      >
        <MenuLabel shortcut="⌘+Shift+V" icon={<Type className={MENU_ICON_CLASS} />}>
          {t('editor-toolbar-paste-text-only')}
        </MenuLabel>
      </CompactContextMenuItem>
      <CompactContextMenuItem
        onSelect={() => void pasteWithMergeFormatting(editor)}
        disabled={!clipboardReadable}
        data-testid={`${testId}-paste-merge-formatting`}
      >
        <MenuLabel shortcut="Option+V" icon={<Clipboard className={MENU_ICON_CLASS} />}>
          {t('editor-toolbar-paste-merge-formatting')}
        </MenuLabel>
      </CompactContextMenuItem>
    </>
  )
}

function renderLinkSubmenu(options: {
  editor: TiptapEditor
  safeLinkHref: string | null
  isLinkActive: boolean
  onOpenLinkDialog: () => void
  testId: string
  t: (key: string) => string
}) {
  const { editor, safeLinkHref, isLinkActive, onOpenLinkDialog, testId, t } = options
  return (
    <ContextMenuSub>
      <CompactContextMenuSubTrigger data-testid={`${testId}-link-trigger`}>
        <MenuLabel icon={<ExternalLink className={MENU_ICON_CLASS} />}>{t('document-context-link')}</MenuLabel>
      </CompactContextMenuSubTrigger>
      <CompactContextMenuSubContent>
        <CompactContextMenuItem onSelect={onOpenLinkDialog} data-testid={`${testId}-link-edit`}>
          <MenuLabel icon={<Pencil className={MENU_ICON_CLASS} />}>
            {t(isLinkActive ? 'link-dialog-title-edit' : 'editor-toolbar-insert-link')}
          </MenuLabel>
        </CompactContextMenuItem>
        <CompactContextMenuItem
          onSelect={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
          disabled={!isLinkActive}
          data-testid={`${testId}-link-remove`}
        >
          <MenuLabel icon={<Trash2 className={MENU_ICON_CLASS} />}>{t('link-bubble-remove-link')}</MenuLabel>
        </CompactContextMenuItem>
        <CompactContextMenuItem
          onSelect={() => safeLinkHref && (globalThis.location.href = safeLinkHref)}
          disabled={!safeLinkHref}
          data-testid={`${testId}-link-open`}
        >
          <MenuLabel icon={<ExternalLink className={MENU_ICON_CLASS} />}>{t('link-bubble-open-link')}</MenuLabel>
        </CompactContextMenuItem>
        <CompactContextMenuItem
          onSelect={() => safeLinkHref && globalThis.open(safeLinkHref, '_blank', 'noopener,noreferrer')}
          disabled={!safeLinkHref}
          data-testid={`${testId}-link-open-new-tab`}
        >
          <MenuLabel icon={<ExternalLink className={MENU_ICON_CLASS} />}>{t('link-bubble-open-new-tab')}</MenuLabel>
        </CompactContextMenuItem>
      </CompactContextMenuSubContent>
    </ContextMenuSub>
  )
}

function updateSelectedImageAttrs(options: {
  editor: TiptapEditor
  imageSelection: DocumentContextMenuState['imageSelection']
  nextAttrs: Record<string, unknown>
}) {
  const { editor, imageSelection, nextAttrs } = options
  if (!imageSelection) return

  const tr = editor.state.tr
  tr.setNodeMarkup(imageSelection.pos, undefined, {
    ...imageSelection.attrs,
    ...nextAttrs
  })
  tr.setSelection(NodeSelection.create(tr.doc, imageSelection.pos))
  editor.view.dispatch(tr)
  editor.commands.refreshPagesAndStabilize?.()
  editor.view.focus()
}

function buildTableStyleState(tableAttrs: Record<string, unknown>) {
  return {
    styleHeaderRow: tableAttrs.styleHeaderRow === true,
    styleFirstColumn: tableAttrs.styleFirstColumn === true,
    styleLastColumn: tableAttrs.styleLastColumn === true,
    styleBandedRows: tableAttrs.styleBandedRows === true,
    styleBandedColumns: tableAttrs.styleBandedColumns === true
  }
}

function renderTableStyleMenuItem(options: {
  editor: TiptapEditor
  testId: string
  dataTestIdSuffix: string
  label: string
  icon: ReactNode
  isActive: boolean
  nextOptions: SetTableStyleOptions
}) {
  const { editor, testId, dataTestIdSuffix, label, icon, isActive, nextOptions } = options

  return (
    <CompactContextMenuItem
      onSelect={() => editor.chain().focus().setTableStyleOptions(nextOptions).run()}
      data-testid={`${testId}-${dataTestIdSuffix}`}
    >
      <span className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3">
        <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-1.5">
          <span className="gba:flex-shrink-0">{icon}</span>
          <span className="gba:truncate">{label}</span>
        </span>
        {isActive ? <Check className={MENU_ICON_CLASS} /> : null}
      </span>
    </CompactContextMenuItem>
  )
}

export function DocumentContextMenu({
  children,
  editor,
  contextMenuState,
  onContextMenuCapture,
  onOpenLinkDialog,
  onAddInlineComment,
  onAiEditClick,
  onOpenReplaceImageDialog,
  onOpenImageSidebar,
  'data-testid': testId = 'document-context-menu'
}: Readonly<DocumentContextMenuProps>) {
  const { t } = useTranslation(translations)
  const clipboardReadable = canReadClipboard()
  const canCopyOrCut = canWriteClipboard() && contextMenuState.hasTextSelection && contextMenuState.kind !== 'image'
  const safeLinkHref =
    contextMenuState.linkHref && isAllowedHref(contextMenuState.linkHref) ? contextMenuState.linkHref : null
  const canCommands = editor?.can() as TableCanCommands | undefined
  const tableLayoutEnabled = canCommands?.setTableStyleOptions({ styleHeaderRow: true }) ?? false
  const currentImageWrapAttrs = (contextMenuState.imageSelection?.attrs ?? {}) as CustomImageAttributes
  const selectedImageAlign = contextMenuState.imageSelection?.attrs.align ?? 'left'
  const selectedImageWrap = resolveWordStyleWrapPreset({
    wrapMode: currentImageWrapAttrs.wrapMode,
    align: selectedImageAlign as ImageAlignment,
    wrapTextSide: currentImageWrapAttrs.wrapTextSide
  })
  const tableStyleState = buildTableStyleState(
    (editor?.getAttributes('table') as Record<string, unknown> | undefined) ?? {}
  )
  const showStandaloneLinkActions =
    contextMenuState.kind === 'default' && (contextMenuState.isLinkActive || safeLinkHref !== null)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenuCapture={onContextMenuCapture}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className={MENU_CONTENT_CLASS}
        data-testid={`${testId}-content`}
        onCloseAutoFocus={event => {
          event.preventDefault()
          focusEditor(editor)
        }}
      >
        {editor ? renderClipboardItems({ editor, allowCutCopy: canCopyOrCut, clipboardReadable, testId, t }) : null}
        {editor && showStandaloneLinkActions ? (
          <>
            <ContextMenuSeparator />
            {renderLinkSubmenu({
              editor,
              safeLinkHref,
              isLinkActive: contextMenuState.isLinkActive,
              onOpenLinkDialog,
              testId,
              t
            })}
          </>
        ) : null}
        {editor && contextMenuState.kind === 'text' ? (
          <>
            <ContextMenuSeparator />
            {renderLinkSubmenu({
              editor,
              safeLinkHref,
              isLinkActive: contextMenuState.isLinkActive,
              onOpenLinkDialog,
              testId,
              t
            })}
            <CompactContextMenuItem
              onSelect={onAddInlineComment}
              disabled={!contextMenuState.hasTextSelection}
              data-testid={`${testId}-add-comment`}
            >
              <MenuLabel shortcut="⌘+Option+M" icon={<MessageSquare className={MENU_ICON_CLASS} />}>
                {t('document-context-add-comment')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem
              onSelect={onAiEditClick}
              disabled={!contextMenuState.hasTextSelection}
              data-testid={`${testId}-ai-edit`}
            >
              <MenuLabel shortcut="⌘+Shift+E" icon={<Wand2 className={MENU_ICON_CLASS} />}>
                {t('editor-ai-edit')}
              </MenuLabel>
            </CompactContextMenuItem>
          </>
        ) : null}
        {editor && contextMenuState.kind === 'image' ? (
          <>
            <ContextMenuSeparator />
            <CompactContextMenuItem
              onSelect={() => onOpenReplaceImageDialog(contextMenuState.imageSelection?.pos ?? null)}
              data-testid={`${testId}-image-replace`}
            >
              <MenuLabel icon={<Pencil className={MENU_ICON_CLASS} />}>
                {t('document-context-change-picture')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem disabled data-testid={`${testId}-image-draw`}>
              <MenuLabel icon={<Pencil className={MENU_ICON_CLASS} />}>{t('document-context-draw')}</MenuLabel>
            </CompactContextMenuItem>
            <ContextMenuSub>
              <CompactContextMenuSubTrigger data-testid={`${testId}-image-align-trigger`}>
                <MenuLabel icon={<AlignLeft className={MENU_ICON_CLASS} />}>{t('image-context-align')}</MenuLabel>
              </CompactContextMenuSubTrigger>
              <CompactContextMenuSubContent>
                {IMAGE_ALIGN_OPTIONS.map(option => (
                  <CompactContextMenuItem
                    key={option.value}
                    onSelect={() =>
                      updateSelectedImageAttrs({
                        editor,
                        imageSelection: contextMenuState.imageSelection,
                        nextAttrs: { align: option.value }
                      })
                    }
                    data-testid={`${testId}-image-align-${option.value}`}
                  >
                    <MenuLabel
                      icon={selectedImageAlign === option.value ? <Check className={MENU_ICON_CLASS} /> : option.icon}
                    >
                      {t(option.key)}
                    </MenuLabel>
                  </CompactContextMenuItem>
                ))}
              </CompactContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <CompactContextMenuSubTrigger data-testid={`${testId}-image-wrap-trigger`}>
                <MenuLabel icon={<Type className={MENU_ICON_CLASS} />}>{t('image-context-wrap-text')}</MenuLabel>
              </CompactContextMenuSubTrigger>
              <CompactContextMenuSubContent>
                {WORD_WRAP_OPTIONS.map(option => (
                  <CompactContextMenuItem
                    key={option.value}
                    onSelect={() =>
                      updateContextMenuImageAttrs(
                        editor,
                        contextMenuState.imageSelection,
                        resolveWordStyleWrapPresetUpdate(option.value, currentImageWrapAttrs)
                      )
                    }
                    data-testid={`${testId}-image-wrap-${option.value}`}
                  >
                    <MenuLabel
                      icon={
                        selectedImageWrap === option.value ? (
                          <Check className={MENU_ICON_CLASS} />
                        ) : (
                          <Type className={MENU_ICON_CLASS} />
                        )
                      }
                    >
                      {t(option.key)}
                    </MenuLabel>
                  </CompactContextMenuItem>
                ))}
              </CompactContextMenuSubContent>
            </ContextMenuSub>
            <CompactContextMenuItem onSelect={onOpenImageSidebar} data-testid={`${testId}-image-format-picture`}>
              <MenuLabel icon={<FileText className={MENU_ICON_CLASS} />}>
                {t('document-context-format-picture')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem
              onSelect={() => editor.commands.removeSelectedImage?.()}
              data-testid={`${testId}-image-delete`}
            >
              <MenuLabel icon={<Trash2 className={MENU_ICON_CLASS} />}>{t('image-context-delete')}</MenuLabel>
            </CompactContextMenuItem>
            <ContextMenuSeparator />
            <CompactContextMenuItem disabled data-testid={`${testId}-image-add-comment`}>
              <MenuLabel shortcut="⌘+Option+M" icon={<MessageSquare className={MENU_ICON_CLASS} />}>
                {t('document-context-add-comment')}
              </MenuLabel>
            </CompactContextMenuItem>
          </>
        ) : null}
        {editor && canCommands && contextMenuState.kind === 'table' ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <CompactContextMenuSubTrigger data-testid={`${testId}-table-insert-trigger`}>
                <MenuLabel icon={<Grid2x2Plus className={MENU_ICON_CLASS} />}>{t('document-context-insert')}</MenuLabel>
              </CompactContextMenuSubTrigger>
              <CompactContextMenuSubContent>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().addRowBefore().run()}
                  disabled={!canCommands.addRowBefore()}
                  data-testid={`${testId}-table-row-before`}
                >
                  <MenuLabel icon={<ArrowUpToLine className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-row-before')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().addRowAfter().run()}
                  disabled={!canCommands.addRowAfter()}
                  data-testid={`${testId}-table-row-after`}
                >
                  <MenuLabel icon={<ArrowDownToLine className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-row-after')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().addColumnBefore().run()}
                  disabled={!canCommands.addColumnBefore()}
                  data-testid={`${testId}-table-column-before`}
                >
                  <MenuLabel icon={<ArrowLeftToLine className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-column-before')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().addColumnAfter().run()}
                  disabled={!canCommands.addColumnAfter()}
                  data-testid={`${testId}-table-column-after`}
                >
                  <MenuLabel icon={<ArrowRightToLine className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-column-after')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </CompactContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <CompactContextMenuSubTrigger data-testid={`${testId}-table-delete-trigger`}>
                <MenuLabel icon={<Grid2x2X className={MENU_ICON_CLASS} />}>{t('document-context-delete')}</MenuLabel>
              </CompactContextMenuSubTrigger>
              <CompactContextMenuSubContent>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().deleteRow().run()}
                  disabled={!canCommands.deleteRow()}
                  data-testid={`${testId}-table-delete-row`}
                >
                  <MenuLabel icon={<Rows3 className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-delete-row')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().deleteColumn().run()}
                  disabled={!canCommands.deleteColumn()}
                  data-testid={`${testId}-table-delete-column`}
                >
                  <MenuLabel icon={<Columns3 className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-delete-column')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().deleteTable().run()}
                  disabled={!canCommands.deleteTable()}
                  data-testid={`${testId}-table-delete-table`}
                >
                  <MenuLabel icon={<Grid2x2X className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-delete-table')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </CompactContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <CompactContextMenuSubTrigger data-testid={`${testId}-table-split-trigger`}>
                <MenuLabel icon={<TableCellsSplit className={MENU_ICON_CLASS} />}>
                  {t('document-context-split')}
                </MenuLabel>
              </CompactContextMenuSubTrigger>
              <CompactContextMenuSubContent>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().splitCell().run()}
                  disabled={!canCommands.splitCell()}
                  data-testid={`${testId}-table-split-cell`}
                >
                  <MenuLabel icon={<TableCellsSplit className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-split-cell')}
                  </MenuLabel>
                </CompactContextMenuItem>
                <CompactContextMenuItem
                  onSelect={() => editor.chain().focus().mergeCells().run()}
                  disabled={!canCommands.mergeCells()}
                  data-testid={`${testId}-table-merge-cells`}
                >
                  <MenuLabel icon={<TableCellsMerge className={MENU_ICON_CLASS} />}>
                    {t('editor-toolbar-table-merge-cells')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </CompactContextMenuSubContent>
            </ContextMenuSub>
            {tableLayoutEnabled ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-table-layout-trigger`}>
                  <MenuLabel icon={<TableConfig className={MENU_ICON_CLASS} />}>
                    {t('document-context-layout')}
                  </MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  {renderTableStyleMenuItem({
                    editor,
                    testId,
                    dataTestIdSuffix: 'table-style-header-row',
                    label: t('table-sidebar-style-header-row'),
                    icon: <PanelTop className={MENU_ICON_CLASS} />,
                    isActive: tableStyleState.styleHeaderRow,
                    nextOptions: { styleHeaderRow: !tableStyleState.styleHeaderRow }
                  })}
                  {renderTableStyleMenuItem({
                    editor,
                    testId,
                    dataTestIdSuffix: 'table-style-first-column',
                    label: t('table-sidebar-style-first-column'),
                    icon: <PanelLeft className={MENU_ICON_CLASS} />,
                    isActive: tableStyleState.styleFirstColumn,
                    nextOptions: { styleFirstColumn: !tableStyleState.styleFirstColumn }
                  })}
                  {renderTableStyleMenuItem({
                    editor,
                    testId,
                    dataTestIdSuffix: 'table-style-last-column',
                    label: t('table-sidebar-style-last-column'),
                    icon: <PanelRight className={MENU_ICON_CLASS} />,
                    isActive: tableStyleState.styleLastColumn,
                    nextOptions: { styleLastColumn: !tableStyleState.styleLastColumn }
                  })}
                  {renderTableStyleMenuItem({
                    editor,
                    testId,
                    dataTestIdSuffix: 'table-style-banded-rows',
                    label: t('table-sidebar-style-banded-rows'),
                    icon: <Rows3 className={MENU_ICON_CLASS} />,
                    isActive: tableStyleState.styleBandedRows,
                    nextOptions: { styleBandedRows: !tableStyleState.styleBandedRows }
                  })}
                  {renderTableStyleMenuItem({
                    editor,
                    testId,
                    dataTestIdSuffix: 'table-style-banded-columns',
                    label: t('table-sidebar-style-banded-columns'),
                    icon: <Columns3 className={MENU_ICON_CLASS} />,
                    isActive: tableStyleState.styleBandedColumns,
                    nextOptions: { styleBandedColumns: !tableStyleState.styleBandedColumns }
                  })}
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}
            <ContextMenuSeparator />
            {renderLinkSubmenu({
              editor,
              safeLinkHref,
              isLinkActive: contextMenuState.isLinkActive,
              onOpenLinkDialog,
              testId,
              t
            })}
            <CompactContextMenuItem
              onSelect={onAddInlineComment}
              disabled={!contextMenuState.hasTextSelection}
              data-testid={`${testId}-table-add-comment`}
            >
              <MenuLabel shortcut="⌘+Option+M" icon={<MessageSquare className={MENU_ICON_CLASS} />}>
                {t('document-context-add-comment')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem
              onSelect={onAiEditClick}
              disabled={!contextMenuState.hasTextSelection}
              data-testid={`${testId}-table-ai-edit`}
            >
              <MenuLabel shortcut="⌘+Shift+E" icon={<Wand2 className={MENU_ICON_CLASS} />}>
                {t('editor-ai-edit')}
              </MenuLabel>
            </CompactContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}
