/**
 * In-document table of contents (Word-style block): live heading list with optional page numbers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { useTranslation } from '@newwork/nw-design-system'
import { createSafePaginationSelection } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationLayoutHelpers'
import {
  getHeadingsForDocumentTableOfContents,
  resolvePageNumberForDocPosition
} from '../../../utils/navigationPanelUtils'
import { getDocumentTocLayoutHints, subscribeDocumentTocLayout } from '../../../utils/tocLayoutBridge'
import { scrollEditorSelectionNodeIntoView } from '../commentSidebarNavigation'
import translations from '../../../_i18n'

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

  return (
    <NodeViewWrapper
      as="div"
      className={`document-table-of-contents gba:my-3 gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 ${
        selected ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
      }`}
      data-document-toc=""
      contentEditable={false}
      data-testid="document-table-of-contents"
    >
      <div className="gba:mb-2 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {t('document-toc-block-title')}
      </div>
      {headings.length === 0 ? (
        <p className="gba:m-0 gba:text-sm gba:text-muted-foreground">{t('document-toc-empty')}</p>
      ) : (
        <ul className="gba:m-0 gba:list-none gba:space-y-1 gba:p-0">
          {headings.map((h, idx) => {
            const pad =
              ['', 'gba:pl-2', 'gba:pl-4', 'gba:pl-6', 'gba:pl-8', 'gba:pl-10'][Math.min(h.level, 6)] ?? 'gba:pl-10'
            const pageNum = resolvePageNumberForDocPosition(h.blockStart, spans)
            const pageLabel =
              pageNum !== null ? String(pageNum) : spans && spans.length > 0 ? t('document-toc-page-unknown') : ''

            return (
              <li key={`${h.blockStart}-${idx}`} className={pad}>
                <div className="gba:flex gba:min-h-7 gba:items-end gba:gap-2 gba:w-full">
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => scrollToHeading(h.pos)}
                      className="gba:max-w-[55%] gba:shrink-0 gba:truncate gba:text-left gba:text-sm gba:text-foreground hover:gba:underline"
                      data-testid={`document-toc-line-${idx}`}
                    >
                      {h.text || t('editor-heading-normal')}
                    </button>
                  ) : (
                    <span
                      className="gba:max-w-[55%] gba:shrink-0 gba:truncate gba:text-sm gba:text-foreground"
                      data-testid={`document-toc-line-${idx}`}
                    >
                      {h.text || t('editor-heading-normal')}
                    </span>
                  )}
                  <span
                    className="gba:flex-1 gba:border-b gba:border-dotted gba:border-border gba:mb-1.5 gba:min-w-4"
                    aria-hidden
                  />
                  {pageLabel !== '' ? (
                    <span className="gba:shrink-0 gba:min-w-6 gba:text-right gba:text-sm gba:tabular-nums gba:text-foreground">
                      {pageLabel}
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </NodeViewWrapper>
  )
}
