/**
 * In-document table of contents (Word-style block): live heading list with optional page numbers.
 */

import React, { useCallback, useMemo } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper, useEditorState } from '@tiptap/react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { createSafePaginationSelection } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationLayoutHelpers'
import { isDocumentTocStructurallyStale, parseDocumentTocSnapshot } from '../../../utils/documentTocSnapshot'
import { buildDocumentTocTextStyleObject, parseDocumentTocStyles } from '../../../utils/documentTocStyleUtils'
import { getDocumentTocLayoutHints } from '../../../utils/tocLayoutBridge'
import { scrollEditorSelectionNodeIntoView } from '../commentSidebarNavigation'
import translations from '../../../_i18n'

export const DOCUMENT_TOC_OPEN_FORMAT_EVENT = 'document:toc-open-format-sidebar'

type DocumentTocOpenFormatEventDetail = {
  pos: number
}

export function DocumentTableOfContentsView({ editor, node, getPos, selected }: Readonly<NodeViewProps>) {
  const { t } = useTranslation(translations)

  const tocBlockEnd = useMemo(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return 0
    return pos + node.nodeSize
  }, [getPos, node.nodeSize])

  const liveDoc = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor?.state.doc ?? null
  })
  const doc = liveDoc ?? editor.state.doc
  const snapshot = useMemo(
    () => parseDocumentTocSnapshot(String(node.attrs.snapshotJson ?? '[]')),
    [node.attrs.snapshotJson]
  )
  const maxHeadingLevel = useMemo(
    () => Math.max(1, Math.min(6, Number(node.attrs.maxHeadingLevel ?? 3))),
    [node.attrs.maxHeadingLevel]
  )
  const tocStyles = useMemo(() => parseDocumentTocStyles(String(node.attrs.stylesJson ?? '')), [node.attrs.stylesJson])
  const titleStyle = useMemo(() => buildDocumentTocTextStyleObject(tocStyles.title), [tocStyles.title])
  const entryStyle = useMemo(() => buildDocumentTocTextStyleObject(tocStyles.entries), [tocStyles.entries])
  const emptyStateStyle = useMemo(
    () => ({
      ...entryStyle,
      color: tocStyles.entries.color ?? 'var(--nw-muted-foreground)'
    }),
    [entryStyle, tocStyles.entries.color]
  )
  const visibleEntries = useMemo(
    () => snapshot.entries.filter(entry => entry.level <= maxHeadingLevel),
    [maxHeadingLevel, snapshot.entries]
  )
  const scrollToHeading = useCallback(
    (headingPos: number) => {
      if (headingPos <= 0) return
      const selection = createSafePaginationSelection(doc, headingPos, 1)
      editor.view.dispatch(editor.state.tr.setSelection(selection))
      editor.view.focus()
      const hints = getDocumentTocLayoutHints()
      scrollEditorSelectionNodeIntoView(
        {
          view: editor.view,
          commands: editor.commands,
          layoutHints: {
            pageBounds: hints?.pageBounds ?? hints?.mountedPageBodyBounds ?? [],
            pageSpans: hints?.pageSpans ?? [],
            retainedPageSpans: hints?.retainedPageSpans ?? [],
            mountedPageBodyBounds: hints?.mountedPageBodyBounds ?? [],
            pagePositionRanges: hints?.pagePositionRanges ?? []
          }
        },
        selection.from,
        selection.to,
        'start'
      )
    },
    [doc, editor]
  )

  const editable = editor.isEditable
  const showPageNumbers = node.attrs.showPageNumbers !== false
  const rightAlignPageNumbers = node.attrs.rightAlignPageNumbers !== false
  const tabLeader = node.attrs.tabLeader === 'none' ? 'none' : 'dot'
  const headingLinks = node.attrs.headingLinks !== false
  const structureStale = useMemo(
    () =>
      isDocumentTocStructurallyStale({
        snapshot,
        doc,
        afterPos: tocBlockEnd,
        maxHeadingLevel
      }),
    [doc, maxHeadingLevel, snapshot, tocBlockEnd]
  )
  const canFollowHeadingLinks = editable && headingLinks && !structureStale

  const openFormatSidebar = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.chain().focus().setNodeSelection(pos).run()
    globalThis.window.dispatchEvent(
      new CustomEvent<DocumentTocOpenFormatEventDetail>(DOCUMENT_TOC_OPEN_FORMAT_EVENT, { detail: { pos } })
    )
  }, [editor, getPos])

  const updateTableOfContents = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.commands.updateDocumentTableOfContentsEntireTable(pos)
  }, [editor.commands, getPos])

  const updatePageNumbersOnly = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.commands.updateDocumentTableOfContentsPageNumbers(pos)
  }, [editor.commands, getPos])

  const removeTableOfContents = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.commands.removeDocumentTableOfContents(pos)
  }, [editor.commands, getPos])

  return (
    <React.Fragment>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <NodeViewWrapper
            as="div"
            className={`document-table-of-contents gba:my-3 gba:w-full gba:max-w-full ${
              selected ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
            }`}
            data-document-toc=""
            contentEditable={false}
            data-testid="document-table-of-contents"
            onMouseDown={(event: MouseEvent) => {
              const target = event.target
              if (target instanceof HTMLElement && target.closest('button[data-testid^="document-toc-line"]')) {
                return
              }
              const pos = getPos()
              if (typeof pos !== 'number') return
              editor.chain().focus().setNodeSelection(pos).run()
            }}
          >
            <div className="gba:mb-3 gba:text-base gba:text-foreground" style={titleStyle}>
              {t('document-toc-block-title')}
            </div>
            {visibleEntries.length === 0 ? (
              <p className="gba:m-0 gba:text-sm" style={emptyStateStyle}>
                {t('document-toc-empty')}
              </p>
            ) : (
              <div className="gba:m-0 gba:space-y-1 gba:p-0">
                {visibleEntries.map((entry, idx) => {
                  const pad =
                    ['', 'gba:pl-2', 'gba:pl-4', 'gba:pl-6', 'gba:pl-8', 'gba:pl-10'][Math.min(entry.level, 6)] ??
                    'gba:pl-10'
                  const pageLabel = showPageNumbers ? (entry.pageNumber ?? t('document-toc-page-unknown')) : ''
                  const titleBaseClass =
                    'gba:block gba:min-w-0 gba:w-full gba:bg-transparent gba:border-0 gba:p-0 gba:text-left gba:leading-snug gba:whitespace-normal gba:break-words gba:overflow-wrap-anywhere'
                  const titleClass = titleBaseClass
                  const titleNode =
                    canFollowHeadingLinks && entry.pos > 0 ? (
                      <button
                        type="button"
                        onMouseDown={event => event.stopPropagation()}
                        onClick={() => scrollToHeading(entry.pos)}
                        className={`${titleClass} gba:text-left hover:gba:underline`}
                        style={entryStyle}
                        data-testid={`document-toc-line-${idx}`}
                      >
                        {entry.text || t('title-untitled')}
                      </button>
                    ) : (
                      <span className={titleClass} style={entryStyle} data-testid={`document-toc-line-${idx}`}>
                        {entry.text || t('title-untitled')}
                      </span>
                    )

                  return (
                    <div key={`${entry.blockStart}-${entry.text}-${idx}`} className={pad}>
                      {rightAlignPageNumbers ? (
                        <div className="gba:flex gba:w-full gba:min-w-0 gba:flex-nowrap gba:items-end gba:gap-x-2">
                          <div className="gba:min-w-0 gba:w-fit gba:max-w-[calc(100%-4rem)] gba:shrink">
                            {titleNode}
                          </div>
                          {tabLeader === 'dot' ? (
                            <span
                              className="gba:mb-1.5 gba:min-h-[0.65rem] gba:min-w-2 gba:flex-1 gba:shrink-0 gba:self-end gba:border-b gba:border-dotted gba:border-border"
                              aria-hidden
                            />
                          ) : (
                            <span className="gba:min-w-8 gba:flex-1 gba:shrink-0" aria-hidden />
                          )}
                          {pageLabel !== '' ? (
                            <span
                              className="gba:shrink-0 gba:min-w-8 gba:text-right gba:tabular-nums"
                              style={entryStyle}
                            >
                              {pageLabel}
                            </span>
                          ) : (
                            <span className="gba:min-w-0" aria-hidden />
                          )}
                        </div>
                      ) : (
                        <div className="gba:flex gba:min-h-7 gba:flex-wrap gba:items-end gba:gap-x-2 gba:gap-y-1">
                          <div className="gba:min-w-0 gba:flex-1">{titleNode}</div>
                          {tabLeader === 'dot' && pageLabel !== '' ? (
                            <span
                              className="gba:mb-1.5 gba:inline-block gba:min-w-16 gba:border-b gba:border-dotted gba:border-border"
                              aria-hidden
                            />
                          ) : null}
                          {pageLabel !== '' ? (
                            <span className="gba:tabular-nums" style={entryStyle}>
                              {pageLabel}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </NodeViewWrapper>
        </ContextMenuTrigger>
        <ContextMenuContent className="gba:w-64" data-testid="document-toc-context-menu">
          {showPageNumbers ? (
            <ContextMenuItem onSelect={updatePageNumbersOnly} data-testid="document-toc-context-update-page-numbers">
              {t('document-toc-context-update-page-numbers')}
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem onSelect={updateTableOfContents} data-testid="document-toc-context-update-entire">
            {t('document-toc-context-update-entire')}
          </ContextMenuItem>
          <ContextMenuItem onSelect={openFormatSidebar} data-testid="document-toc-context-format">
            {t('document-toc-context-format')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={removeTableOfContents} data-testid="document-toc-context-remove">
            {t('document-toc-context-remove')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </React.Fragment>
  )
}
