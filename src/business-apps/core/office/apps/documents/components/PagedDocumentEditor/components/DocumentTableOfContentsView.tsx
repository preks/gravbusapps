/**
 * In-document table of contents (Word-style block): live heading list with optional page numbers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { createSafePaginationSelection } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationLayoutHelpers'
import type { Node as PMNode } from '@tiptap/pm/model'
import {
  getHeadingsForDocumentTableOfContents,
  resolvePageNumberForDocPosition
} from '../../../utils/navigationPanelUtils'
import { getDocumentTocLayoutHints, subscribeDocumentTocLayout } from '../../../utils/tocLayoutBridge'
import { scrollEditorSelectionNodeIntoView } from '../commentSidebarNavigation'
import translations from '../../../_i18n'

export const DOCUMENT_TOC_OPEN_FORMAT_EVENT = 'document:toc-open-format-sidebar'

type DocumentTocOpenFormatEventDetail = {
  pos: number
}

function resolveSpansForPageNumbers() {
  const hints = getDocumentTocLayoutHints()
  if (!hints) return undefined
  if (hints.pageSpans && hints.pageSpans.length > 0) {
    return hints.pageSpans
  }
  if (hints.retainedPageSpans && hints.retainedPageSpans.length > 0) {
    return hints.retainedPageSpans
  }
  return hints.pagePositionRanges
}

function resolveFallbackPageNumber(doc: PMNode, pos: number): number {
  let pageNumber = 1
  doc.descendants((node, nodePos) => {
    if (nodePos >= pos) return false
    if (node.type.name === 'pageBreak') {
      pageNumber += 1
    }
    return true
  })
  return pageNumber
}

export function DocumentTableOfContentsView({ editor, node, getPos, selected }: Readonly<NodeViewProps>) {
  const { t } = useTranslation(translations)
  const [, setRenderTick] = useState(0)

  useEffect(() => {
    const bump = () => setRenderTick(n => n + 1)
    editor.on('update', bump)
    const unsubLayout = subscribeDocumentTocLayout(bump)
    return () => {
      editor.off('update', bump)
      unsubLayout()
    }
  }, [editor])

  const tocBlockEnd = useMemo(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return 0
    return pos + node.nodeSize
  }, [getPos, node.nodeSize])

  const headings = useMemo(
    () => getHeadingsForDocumentTableOfContents(editor.state.doc, tocBlockEnd),
    [editor.state.doc, tocBlockEnd]
  )
  const visibleHeadings = useMemo(() => {
    const maxLevel = Math.max(1, Math.min(6, Number(node.attrs.maxHeadingLevel ?? 3)))
    return headings.filter(h => h.level <= maxLevel)
  }, [headings, node.attrs.maxHeadingLevel])

  const spans = resolveSpansForPageNumbers()

  const scrollToHeading = useCallback(
    (headingPos: number) => {
      const doc = editor.state.doc
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
    [editor]
  )

  const editable = editor.isEditable
  const showPageNumbers = node.attrs.showPageNumbers !== false
  const rightAlignPageNumbers = node.attrs.rightAlignPageNumbers !== false
  const tabLeader = node.attrs.tabLeader === 'none' ? 'none' : 'dot'
  const headingLinks = node.attrs.headingLinks !== false

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
    editor.commands.updateDocumentTableOfContents(pos)
  }, [editor.commands, getPos])

  const removeTableOfContents = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.commands.removeDocumentTableOfContents(pos)
  }, [editor.commands, getPos])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <NodeViewWrapper
          as="div"
          className={`document-table-of-contents gba:my-3 gba:w-full gba:max-w-full gba:rounded-md gba:border gba:border-border/60 gba:p-3 ${
            selected ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
          }`}
          data-document-toc=""
          contentEditable={false}
          data-testid="document-table-of-contents"
          onMouseDown={event => {
            const target = event.target
            if (target instanceof HTMLElement && target.closest('button[data-testid^="document-toc-line"]')) {
              return
            }
            const pos = getPos()
            if (typeof pos !== 'number') return
            editor.chain().focus().setNodeSelection(pos).run()
          }}
        >
          <div className="gba:mb-3 gba:text-base gba:font-semibold gba:text-foreground">
            {t('document-toc-block-title')}
          </div>
          {visibleHeadings.length === 0 ? (
            <p className="gba:m-0 gba:text-sm gba:text-muted-foreground">{t('document-toc-empty')}</p>
          ) : (
            <div className="gba:m-0 gba:space-y-1 gba:p-0">
              {visibleHeadings.map((h, idx) => {
                const pad =
                  ['', 'gba:pl-2', 'gba:pl-4', 'gba:pl-6', 'gba:pl-8', 'gba:pl-10'][Math.min(h.level, 6)] ?? 'gba:pl-10'
                const pageNum = resolvePageNumberForDocPosition(h.blockStart, spans)
                let pageLabel = ''
                if (showPageNumbers) {
                  if (pageNum !== null) {
                    pageLabel = String(pageNum)
                  } else {
                    pageLabel = String(resolveFallbackPageNumber(editor.state.doc, h.blockStart))
                  }
                }
                const titleBaseClass =
                  'gba:block gba:min-w-0 gba:w-full gba:text-left gba:text-base gba:leading-snug gba:text-foreground gba:whitespace-normal gba:break-words gba:overflow-wrap-anywhere'
                const titleClass = titleBaseClass
                const titleNode =
                  editable && headingLinks ? (
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={() => scrollToHeading(h.pos)}
                      className={`${titleClass} gba:text-left hover:gba:underline`}
                      data-testid={`document-toc-line-${idx}`}
                    >
                      {h.text || t('title-untitled')}
                    </button>
                  ) : (
                    <span className={titleClass} data-testid={`document-toc-line-${idx}`}>
                      {h.text || t('title-untitled')}
                    </span>
                  )

                return (
                  <div key={`${h.blockStart}-${idx}`} className={pad}>
                    {rightAlignPageNumbers ? (
                      <div className="gba:flex gba:w-full gba:min-w-0 gba:flex-nowrap gba:items-end gba:gap-x-2">
                        <div className="gba:min-w-0 gba:w-fit gba:max-w-[calc(100%-4rem)] gba:shrink">{titleNode}</div>
                        {tabLeader === 'dot' ? (
                          <span
                            className="gba:mb-1.5 gba:min-h-[0.65rem] gba:min-w-2 gba:flex-1 gba:shrink-0 gba:self-end gba:border-b gba:border-dotted gba:border-border"
                            aria-hidden
                          />
                        ) : (
                          <span className="gba:min-w-8 gba:flex-1 gba:shrink-0" aria-hidden />
                        )}
                        {pageLabel !== '' ? (
                          <span className="gba:shrink-0 gba:min-w-8 gba:text-right gba:text-base gba:tabular-nums gba:text-foreground">
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
                          <span className="gba:text-base gba:tabular-nums gba:text-foreground">{pageLabel}</span>
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
        <ContextMenuItem onSelect={updateTableOfContents} data-testid="document-toc-context-update">
          {t('document-toc-context-update')}
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
  )
}
