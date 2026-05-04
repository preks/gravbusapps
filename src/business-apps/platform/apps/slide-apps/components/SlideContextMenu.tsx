// Selection-aware context menu for the slide canvas.

import React from 'react'
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
  ArrowsClockwiseIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChatCircleIcon,
  ClipboardIcon,
  CopyIcon,
  LockIcon,
  LockOpenIcon,
  PencilSimpleIcon,
  LinkIcon,
  ScissorsIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextAaIcon,
  TrashIcon
} from '@phosphor-icons/react'
import translations from '../_i18n'
import type { AlignAxis, DistributeAxis } from './shapeOperations'
import type { SlideContextMenuState } from '../hooks/useSlideContextMenu'

const MENU_CONTENT_CLASS = 'gba:w-60 gba:text-sm'
const SUBMENU_CONTENT_CLASS = 'gba:w-56 gba:text-sm'
const MENU_ROW_CLASS = 'gba:h-8 gba:px-2.5 gba:text-sm'
const MENU_ICON_CLASS = 'gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground'

interface SlideContextMenuActions {
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onCopyTextSelection: () => void
  onCutTextSelection: () => void
  onPasteTextSelection: () => void
  onDuplicate: () => void
  onDelete: () => void
  onEditText: () => void
  onEditPoints: () => void
  onBringToFront: () => void
  onBringForward: () => void
  onSendToBack: () => void
  onSendBackward: () => void
  onAlign: (axis: AlignAxis) => void
  onDistribute: (axis: DistributeAxis) => void
  onFlip: (axis: 'horizontal' | 'vertical') => void
  onGroup: () => void
  onUngroup: () => void
  onLockSelection: () => void
  onUnlockSelection: () => void
  onShowFormatOptions: () => void
  onOpenCommentPanel: () => void
  onShowLinkDialog: () => void
  onShowSpellCheck: () => void
}

interface SlideContextMenuProps extends PropsWithChildren {
  contextMenuState: SlideContextMenuState
  onContextMenuCapture: (event: ReactMouseEvent<HTMLElement>) => void
  actions: SlideContextMenuActions
  disabled?: boolean
  canCreateComments?: boolean
  isInlineTextEditing?: boolean
  hasExpandedTextSelection?: boolean
  canInsertLink?: boolean
  'data-testid'?: string
}

function CompactContextMenuItem(props: Readonly<ComponentProps<typeof ContextMenuItem>>) {
  const { className, ...rest } = props
  return <ContextMenuItem className={className ? `${MENU_ROW_CLASS} ${className}` : MENU_ROW_CLASS} {...rest} />
}

function CompactContextMenuSubTrigger(props: Readonly<ComponentProps<typeof ContextMenuSubTrigger>>) {
  const { className, ...rest } = props
  return <ContextMenuSubTrigger className={className ? `${MENU_ROW_CLASS} ${className}` : MENU_ROW_CLASS} {...rest} />
}

function CompactContextMenuSubContent(props: Readonly<ComponentProps<typeof ContextMenuSubContent>>) {
  const { className, ...rest } = props
  return (
    <ContextMenuSubContent
      className={className ? `${SUBMENU_CONTENT_CLASS} ${className}` : SUBMENU_CONTENT_CLASS}
      {...rest}
    />
  )
}

function MenuLabel({
  children,
  shortcut,
  icon
}: Readonly<{
  children: ReactNode
  shortcut?: string
  icon?: ReactNode
}>) {
  return (
    <span className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3">
      <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
        {icon ? <span className="gba:flex-shrink-0">{icon}</span> : null}
        <span className="gba:min-w-0 gba:truncate">{children}</span>
      </span>
      {shortcut ? <span className="gba:text-xs gba:text-muted-foreground">{shortcut}</span> : null}
    </span>
  )
}

export function SlideContextMenu({
  contextMenuState,
  onContextMenuCapture,
  actions,
  disabled = false,
  canCreateComments = false,
  isInlineTextEditing = false,
  hasExpandedTextSelection = false,
  canInsertLink = false,
  children,
  'data-testid': testId = 'slide-context-menu'
}: Readonly<SlideContextMenuProps>) {
  const { t } = useTranslation(translations)
  const { capabilities, selectionCount } = contextMenuState

  if (disabled) {
    return <>{children}</>
  }

  const showBringToFrontMenu = capabilities.canBringForward
  const showSendToBackMenu = capabilities.canSendBackward
  const showAlignMenu = capabilities.canAlign
  const showDistributeMenu = capabilities.canDistribute
  const showFlipMenu = capabilities.canFlip
  const showGroupingActions = capabilities.canGroup || capabilities.canUngroup

  const showClipboardSection = capabilities.canCopy || capabilities.canCut || capabilities.canPaste
  const showSelectionActions =
    capabilities.canEditText ||
    capabilities.canEditPoints ||
    showBringToFrontMenu ||
    showSendToBackMenu ||
    capabilities.canDuplicate ||
    capabilities.canLock ||
    capabilities.canUnlock ||
    showAlignMenu ||
    showDistributeMenu ||
    showFlipMenu ||
    showGroupingActions ||
    capabilities.canDelete ||
    canCreateComments

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="gba:h-full gba:w-full" onContextMenuCapture={onContextMenuCapture}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className={MENU_CONTENT_CLASS}
        data-testid={testId}
        onCloseAutoFocus={event => {
          if (isInlineTextEditing) {
            event.preventDefault()
          }
        }}
      >
        {isInlineTextEditing ? (
          <>
            <CompactContextMenuItem
              onSelect={actions.onCutTextSelection}
              disabled={!hasExpandedTextSelection}
              data-testid={`${testId}-cut`}
            >
              <MenuLabel shortcut="⌘+X" icon={<ScissorsIcon className={MENU_ICON_CLASS} />}>
                {t('editor-cut')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem
              onSelect={actions.onCopyTextSelection}
              disabled={!hasExpandedTextSelection}
              data-testid={`${testId}-copy`}
            >
              <MenuLabel shortcut="⌘+C" icon={<CopyIcon className={MENU_ICON_CLASS} />}>
                {t('editor-copy')}
              </MenuLabel>
            </CompactContextMenuItem>
            <CompactContextMenuItem onSelect={actions.onPasteTextSelection} data-testid={`${testId}-paste`}>
              <MenuLabel shortcut="⌘+V" icon={<ClipboardIcon className={MENU_ICON_CLASS} />}>
                {t('editor-paste')}
              </MenuLabel>
            </CompactContextMenuItem>
            <ContextMenuSeparator />
            <CompactContextMenuItem
              onSelect={actions.onShowLinkDialog}
              disabled={!canInsertLink}
              data-testid={`${testId}-insert-link`}
            >
              <MenuLabel shortcut="⌘+K" icon={<LinkIcon className={MENU_ICON_CLASS} />}>
                {t('editor-link')}
              </MenuLabel>
            </CompactContextMenuItem>
            {canCreateComments ? (
              <>
                <ContextMenuSeparator />
                <CompactContextMenuItem onSelect={actions.onOpenCommentPanel} data-testid={`${testId}-new-comment`}>
                  <MenuLabel shortcut="⌘+Shift+M" icon={<ChatCircleIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-new-comment')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <>
            {showClipboardSection ? (
              <>
                <CompactContextMenuItem onSelect={actions.onCopy} data-testid={`${testId}-copy`}>
                  <MenuLabel shortcut="⌘+C" icon={<CopyIcon className={MENU_ICON_CLASS} />}>
                    {t('editor-copy')}
                  </MenuLabel>
                </CompactContextMenuItem>
                {selectionCount > 0 ? (
                  <CompactContextMenuItem
                    onSelect={actions.onCut}
                    disabled={!capabilities.canCut}
                    data-testid={`${testId}-cut`}
                  >
                    <MenuLabel shortcut="⌘+X" icon={<ScissorsIcon className={MENU_ICON_CLASS} />}>
                      {t('editor-cut')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                ) : null}
                <CompactContextMenuItem
                  onSelect={actions.onPaste}
                  disabled={!capabilities.canPaste}
                  data-testid={`${testId}-paste`}
                >
                  <MenuLabel shortcut="⌘+V" icon={<ClipboardIcon className={MENU_ICON_CLASS} />}>
                    {t('editor-paste')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </>
            ) : null}

            {showClipboardSection && showSelectionActions ? <ContextMenuSeparator /> : null}

            {capabilities.canEditText ? (
              <CompactContextMenuItem onSelect={actions.onEditText} data-testid={`${testId}-edit-text`}>
                <MenuLabel icon={<TextAaIcon className={MENU_ICON_CLASS} />}>{t('editor-edit-text')}</MenuLabel>
              </CompactContextMenuItem>
            ) : null}

            {capabilities.canEditPoints ? (
              <CompactContextMenuItem onSelect={actions.onEditPoints} data-testid={`${testId}-edit-points`}>
                <MenuLabel icon={<PencilSimpleIcon className={MENU_ICON_CLASS} />}>{t('props-edit-points')}</MenuLabel>
              </CompactContextMenuItem>
            ) : null}

            {showBringToFrontMenu ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-bring-to-front-trigger`}>
                  <MenuLabel icon={<ArrowUpIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-bring-to-front')}
                  </MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  <CompactContextMenuItem onSelect={actions.onBringToFront} data-testid={`${testId}-bring-to-front`}>
                    <MenuLabel icon={<ArrowUpIcon className={MENU_ICON_CLASS} />}>
                      {t('context-menu-bring-to-front')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem onSelect={actions.onBringForward} data-testid={`${testId}-bring-forward`}>
                    <MenuLabel icon={<ArrowUpIcon className={MENU_ICON_CLASS} />}>
                      {t('context-menu-bring-forward')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}

            {showSendToBackMenu ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-send-to-back-trigger`}>
                  <MenuLabel icon={<ArrowDownIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-send-to-back')}
                  </MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  <CompactContextMenuItem onSelect={actions.onSendToBack} data-testid={`${testId}-send-to-back`}>
                    <MenuLabel icon={<ArrowDownIcon className={MENU_ICON_CLASS} />}>
                      {t('context-menu-send-to-back')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem onSelect={actions.onSendBackward} data-testid={`${testId}-send-backward`}>
                    <MenuLabel icon={<ArrowDownIcon className={MENU_ICON_CLASS} />}>
                      {t('context-menu-send-backward')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}

            {showAlignMenu ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-align-trigger`}>
                  <MenuLabel icon={<TextAlignLeftIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-align')}
                  </MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  <CompactContextMenuItem onSelect={() => actions.onAlign('left')} data-testid={`${testId}-align-left`}>
                    <MenuLabel icon={<TextAlignLeftIcon className={MENU_ICON_CLASS} />}>
                      {t('props-align-left')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onAlign('center-h')}
                    data-testid={`${testId}-align-center-horizontal`}
                  >
                    <MenuLabel icon={<TextAlignCenterIcon className={MENU_ICON_CLASS} />}>
                      {t('props-align-center-horizontal')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onAlign('right')}
                    data-testid={`${testId}-align-right`}
                  >
                    <MenuLabel icon={<TextAlignRightIcon className={MENU_ICON_CLASS} />}>
                      {t('props-align-right')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <ContextMenuSeparator />
                  <CompactContextMenuItem onSelect={() => actions.onAlign('top')} data-testid={`${testId}-align-top`}>
                    <MenuLabel icon={<ArrowUpIcon className={MENU_ICON_CLASS} />}>{t('props-align-top')}</MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onAlign('center-v')}
                    data-testid={`${testId}-align-center-vertical`}
                  >
                    <MenuLabel icon={<ArrowsInIcon className={MENU_ICON_CLASS} />}>
                      {t('props-align-center-vertical')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onAlign('bottom')}
                    data-testid={`${testId}-align-bottom`}
                  >
                    <MenuLabel icon={<ArrowDownIcon className={MENU_ICON_CLASS} />}>
                      {t('props-align-bottom')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}

            {showDistributeMenu ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-distribute-trigger`}>
                  <MenuLabel icon={<ArrowsOutIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-distribute')}
                  </MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  <CompactContextMenuItem
                    onSelect={() => actions.onDistribute('horizontal')}
                    data-testid={`${testId}-distribute-horizontal`}
                  >
                    <MenuLabel icon={<ArrowsOutIcon className={MENU_ICON_CLASS} />}>
                      {t('props-distribute-horizontal')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onDistribute('vertical')}
                    data-testid={`${testId}-distribute-vertical`}
                  >
                    <MenuLabel icon={<ArrowsInIcon className={MENU_ICON_CLASS} />}>
                      {t('props-distribute-vertical')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}

            {showFlipMenu ? (
              <ContextMenuSub>
                <CompactContextMenuSubTrigger data-testid={`${testId}-flip-trigger`}>
                  <MenuLabel icon={<ArrowsClockwiseIcon className={MENU_ICON_CLASS} />}>{t('props-flip')}</MenuLabel>
                </CompactContextMenuSubTrigger>
                <CompactContextMenuSubContent>
                  <CompactContextMenuItem
                    onSelect={() => actions.onFlip('horizontal')}
                    data-testid={`${testId}-flip-horizontal`}
                  >
                    <MenuLabel icon={<ArrowsOutIcon className={MENU_ICON_CLASS} />}>
                      {t('props-flip-horizontal')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                  <CompactContextMenuItem
                    onSelect={() => actions.onFlip('vertical')}
                    data-testid={`${testId}-flip-vertical`}
                  >
                    <MenuLabel icon={<ArrowsClockwiseIcon className={MENU_ICON_CLASS} />}>
                      {t('props-flip-vertical')}
                    </MenuLabel>
                  </CompactContextMenuItem>
                </CompactContextMenuSubContent>
              </ContextMenuSub>
            ) : null}

            {(showAlignMenu || showDistributeMenu || showFlipMenu) && showGroupingActions ? (
              <ContextMenuSeparator />
            ) : null}

            {capabilities.canGroup ? (
              <CompactContextMenuItem onSelect={actions.onGroup} data-testid={`${testId}-group`}>
                {t('props-group')}
              </CompactContextMenuItem>
            ) : null}

            {capabilities.canUngroup ? (
              <CompactContextMenuItem onSelect={actions.onUngroup} data-testid={`${testId}-ungroup`}>
                {t('props-ungroup')}
              </CompactContextMenuItem>
            ) : null}

            {capabilities.canDuplicate ? (
              <CompactContextMenuItem onSelect={actions.onDuplicate} data-testid={`${testId}-duplicate`}>
                <MenuLabel icon={<CopyIcon className={MENU_ICON_CLASS} />}>{t('props-duplicate')}</MenuLabel>
              </CompactContextMenuItem>
            ) : null}

            {capabilities.canLock ? (
              <CompactContextMenuItem onSelect={actions.onLockSelection} data-testid={`${testId}-lock`}>
                <MenuLabel icon={<LockIcon className={MENU_ICON_CLASS} />}>{t('props-lock')}</MenuLabel>
              </CompactContextMenuItem>
            ) : null}

            {capabilities.canUnlock ? (
              <CompactContextMenuItem onSelect={actions.onUnlockSelection} data-testid={`${testId}-unlock`}>
                <MenuLabel icon={<LockOpenIcon className={MENU_ICON_CLASS} />}>{t('props-unlock')}</MenuLabel>
              </CompactContextMenuItem>
            ) : null}

            {canCreateComments ? (
              <>
                <ContextMenuSeparator />
                <CompactContextMenuItem onSelect={actions.onOpenCommentPanel} data-testid={`${testId}-new-comment`}>
                  <MenuLabel shortcut="⌘+Shift+M" icon={<ChatCircleIcon className={MENU_ICON_CLASS} />}>
                    {t('context-menu-new-comment')}
                  </MenuLabel>
                </CompactContextMenuItem>
              </>
            ) : null}

            {capabilities.canDelete ? (
              <>
                <ContextMenuSeparator />
                <CompactContextMenuItem
                  onSelect={actions.onDelete}
                  className="gba:text-destructive"
                  data-testid={`${testId}-delete`}
                >
                  <MenuLabel icon={<TrashIcon className={MENU_ICON_CLASS} />}>{t('props-delete')}</MenuLabel>
                </CompactContextMenuItem>
              </>
            ) : null}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
