/**
 * NavigationPanel: expandable left panel with Headings, Find, and Replace tabs.
 * Word/Google Docs style. Used when showNavigationPanel is true in PagedDocumentEditor.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronLeft, ChevronDown, ChevronUp, Search } from 'lucide-react'
import translations from '../../_i18n'
import { TextSelection } from '@tiptap/pm/state'
import { createSafePaginationSelection } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationLayoutHelpers'
import {
  getHeadingsFromDoc,
  findMatchesInDoc,
  getMatchSnippet,
  replaceRange,
  replaceAllRanges,
  type HeadingItem
} from '../../utils/navigationPanelUtils'
import { scrollEditorSelectionNodeIntoView } from './commentSidebarNavigation'
import type { DocumentLayoutViewportModel } from './hooks/useDocumentLayoutViewportModel'

export interface NavigationPanelProps {
  readonly editor: Editor | null
  readonly layoutViewportModel?: Pick<
    DocumentLayoutViewportModel,
    'pageBounds' | 'mountedPageBodyBounds' | 'pagePositionRanges' | 'pageSpans' | 'retainedPageSpans'
  >
  readonly onClose: () => void
  readonly requestedTab?: NavTab
  readonly 'data-testid'?: string
}

type NavTab = 'headings' | 'find' | 'replace'

/** Renders snippet with the search term visually emphasized (bold). */
function SnippetWithHighlight({
  snippet,
  searchTerm,
  caseSensitive
}: {
  readonly snippet: string
  readonly searchTerm: string
  readonly caseSensitive: boolean
}) {
  if (!searchTerm.trim()) return <>{snippet}</>
  const idx = caseSensitive ? snippet.indexOf(searchTerm) : snippet.toLowerCase().indexOf(searchTerm.toLowerCase())
  if (idx === -1) return <>{snippet}</>
  const before = snippet.slice(0, idx)
  const match = snippet.slice(idx, idx + searchTerm.length)
  const after = snippet.slice(idx + searchTerm.length)
  return (
    <>
      {before}
      <span className="gba:font-semibold gba:bg-primary gba:text-primary-foreground gba:px-0.5 gba:rounded gba:ring-1 gba:ring-primary gba:ring-offset-1 gba:ring-offset-background">
        {match}
      </span>
      {after}
    </>
  )
}

export function NavigationPanel({
  editor,
  layoutViewportModel,
  onClose,
  requestedTab = 'headings',
  'data-testid': testId = 'navigation-panel'
}: NavigationPanelProps) {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<NavTab>(requestedTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWordsOnly, setWholeWordsOnly] = useState(false)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0)

  const headings = useMemo(() => {
    if (!editor) return []
    return getHeadingsFromDoc(editor.state.doc)
  }, [editor, editor?.state.doc])

  const matches = useMemo(() => {
    if (!editor || !searchTerm.trim()) return []
    return findMatchesInDoc(editor.state.doc, searchTerm, caseSensitive, wholeWordsOnly)
  }, [editor, editor?.state.doc, searchTerm, caseSensitive, wholeWordsOnly])

  const matchItems = useMemo(() => {
    if (!editor || matches.length === 0) return []
    const doc = editor.state.doc
    return matches.map((m, i) => ({
      ...m,
      index: i,
      snippet: getMatchSnippet(doc, m.from, m.to)
    }))
  }, [editor, editor?.state.doc, matches])

  useEffect(() => {
    setActiveTab(requestedTab)
  }, [requestedTab])

  useEffect(() => {
    setSelectedMatchIndex(0)
  }, [searchTerm, caseSensitive, wholeWordsOnly, matches.length])

  useEffect(() => {
    if (!editor) return
    if (!searchTerm.trim() || matches.length === 0) {
      editor.commands.clearSearchHighlights()
      return
    }
    editor.commands.setSearchHighlights(matches, selectedMatchIndex)
  }, [editor, searchTerm, matches, selectedMatchIndex])

  const scrollToPos = useCallback(
    (pos: number) => {
      if (!editor) return
      const doc = editor.state.doc
      const selection = createSafePaginationSelection(doc, pos, 1)
      editor.view.dispatch(editor.state.tr.setSelection(selection))
      editor.view.focus()
      scrollEditorSelectionNodeIntoView(
        {
          view: editor.view,
          commands: editor.commands,
          layoutHints: {
            pageBounds: layoutViewportModel?.pageBounds ?? layoutViewportModel?.mountedPageBodyBounds ?? [],
            pageSpans: layoutViewportModel?.pageSpans ?? [],
            retainedPageSpans: layoutViewportModel?.retainedPageSpans ?? [],
            mountedPageBodyBounds: layoutViewportModel?.mountedPageBodyBounds ?? [],
            pagePositionRanges: layoutViewportModel?.pagePositionRanges ?? []
          }
        },
        selection.from,
        selection.to,
        'start'
      )
    },
    [
      editor,
      layoutViewportModel?.mountedPageBodyBounds,
      layoutViewportModel?.pageBounds,
      layoutViewportModel?.pagePositionRanges,
      layoutViewportModel?.pageSpans,
      layoutViewportModel?.retainedPageSpans
    ]
  )

  const handleHeadingClick = useCallback(
    (pos: number) => {
      scrollToPos(pos)
    },
    [scrollToPos]
  )

  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return
      const i = ((index % matches.length) + matches.length) % matches.length
      setSelectedMatchIndex(i)
      const { from, to } = matches[i]
      if (!editor) return
      const { state, view } = editor
      const doc = state.doc
      const rawA = Math.max(0, Math.min(from, doc.content.size))
      const rawB = Math.max(0, Math.min(to, doc.content.size))
      const clampedFrom = Math.min(rawA, rawB)
      const clampedTo = Math.max(rawA, rawB)
      const rangeSelection = TextSelection.between(doc.resolve(clampedFrom), doc.resolve(clampedTo), 1)
      view.dispatch(state.tr.setSelection(rangeSelection))
      view.focus()
      scrollEditorSelectionNodeIntoView(
        {
          view: editor.view,
          commands: editor.commands,
          layoutHints: {
            pageBounds: layoutViewportModel?.pageBounds ?? layoutViewportModel?.mountedPageBodyBounds ?? [],
            pageSpans: layoutViewportModel?.pageSpans ?? [],
            retainedPageSpans: layoutViewportModel?.retainedPageSpans ?? [],
            mountedPageBodyBounds: layoutViewportModel?.mountedPageBodyBounds ?? [],
            pagePositionRanges: layoutViewportModel?.pagePositionRanges ?? []
          }
        },
        rangeSelection.from,
        rangeSelection.to,
        'center'
      )
    },
    [
      editor,
      layoutViewportModel?.mountedPageBodyBounds,
      layoutViewportModel?.pageBounds,
      layoutViewportModel?.pagePositionRanges,
      layoutViewportModel?.pageSpans,
      layoutViewportModel?.retainedPageSpans,
      matches
    ]
  )

  const handleFindNext = useCallback(() => {
    goToMatch(selectedMatchIndex + 1)
  }, [goToMatch, selectedMatchIndex])

  const handleFindPrev = useCallback(() => {
    goToMatch(selectedMatchIndex - 1)
  }, [goToMatch, selectedMatchIndex])

  const handleReplace = useCallback(() => {
    if (!editor || matches.length === 0) return
    const { from, to } = matches[selectedMatchIndex]
    const tr = editor.state.tr
    const next = replaceRange(tr, from, to, replaceTerm)
    editor.view.dispatch(next)
    const newMatches = findMatchesInDoc(next.doc, searchTerm, caseSensitive, wholeWordsOnly)
    const newIndex = newMatches.length > 0 ? Math.min(selectedMatchIndex, newMatches.length - 1) : 0
    setSelectedMatchIndex(newIndex)
    if (newMatches.length > 0) {
      const m = newMatches[newIndex]
      editor.commands.setTextSelection({ from: m.from, to: m.to })
    }
  }, [editor, matches, selectedMatchIndex, replaceTerm, searchTerm, caseSensitive, wholeWordsOnly])

  const handleReplaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return
    const tr = editor.state.tr
    const next = replaceAllRanges(tr, matches, replaceTerm)
    editor.view.dispatch(next)
    setSelectedMatchIndex(0)
  }, [editor, matches, replaceTerm])

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:bg-background gba:border-r gba:border-border"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border">
        <span className="gba:font-medium gba:text-sm gba:text-foreground">{t('navigation-panel-title')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('navigation-panel-close')}
          data-testid={`${testId}-close`}
          className="gba:h-8 gba:w-8 gba:p-0"
        >
          <ChevronLeft className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as NavTab)}
        className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0"
      >
        <TabsList className="gba:grid gba:grid-cols-3 gba:rounded-none gba:border-b gba:border-border gba:bg-muted/30 gba:w-full">
          <TabsTrigger value="headings" data-testid={`${testId}-headings-tab`} className="gba:text-xs">
            {t('navigation-panel-headings-tab')}
          </TabsTrigger>
          <TabsTrigger value="find" data-testid={`${testId}-find-tab`} className="gba:text-xs">
            {t('navigation-panel-find-tab')}
          </TabsTrigger>
          <TabsTrigger value="replace" data-testid={`${testId}-replace-tab`} className="gba:text-xs">
            {t('navigation-panel-replace-tab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="headings" className="gba:flex-1 gba:min-h-0 gba:mt-0 gba:overflow-hidden">
          <ScrollArea className="gba:h-full">
            <div className="gba:px-3 gba:py-2">
              {headings.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground">
                  {t('navigation-panel-no-headings')} {t('navigation-panel-no-headings-hint')}
                </p>
              ) : (
                <ul className="gba:space-y-1">
                  {headings.map((h: HeadingItem, idx: number) => {
                    const indentClass =
                      ['', 'gba:pl-2', 'gba:pl-4', 'gba:pl-6', 'gba:pl-8', 'gba:pl-10'][Math.min(h.level, 6)] ??
                      'gba:pl-10'
                    return (
                      <li key={`${h.pos}-${idx}`} className={`gba:list-none ${indentClass}`}>
                        <button
                          type="button"
                          onClick={() => handleHeadingClick(h.pos)}
                          className="gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-sm gba:text-foreground hover:gba:bg-muted"
                          data-testid={`${testId}-heading-item-${idx}`}
                        >
                          {h.text || t('editor-heading-normal')}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="find" className="gba:flex-1 gba:min-h-0 gba:mt-0 gba:flex gba:flex-col gba:overflow-hidden">
          <div className="gba:flex gba:flex-col gba:gap-2 gba:px-3 gba:py-2 gba:shrink-0">
            <div className="gba:relative">
              <Search
                className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-foreground"
                aria-hidden
              />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (e.shiftKey) handleFindPrev()
                    else handleFindNext()
                  }
                }}
                placeholder={t('navigation-panel-search-placeholder')}
                className="gba:pl-8 gba:text-foreground gba:placeholder:text-muted-foreground"
                data-testid={`${testId}-find-input`}
              />
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={e => setCaseSensitive(e.target.checked)}
                  data-testid={`${testId}-case-sensitive`}
                  className="gba:rounded gba:border-border"
                />
                {t('navigation-panel-case-sensitive')}
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={wholeWordsOnly}
                  onChange={e => setWholeWordsOnly(e.target.checked)}
                  data-testid={`${testId}-whole-words`}
                  className="gba:rounded gba:border-border"
                />
                {t('navigation-panel-whole-words')}
              </label>
            </div>
            {searchTerm.trim() && matches.length === 0 && (
              <p className="gba:text-xs gba:text-muted-foreground">{t('navigation-panel-match-count', { count: 0 })}</p>
            )}
            {searchTerm.trim() && matches.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:flex gba:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-7 gba:w-7"
                    onClick={handleFindPrev}
                    aria-label={t('navigation-panel-find-prev')}
                    data-testid={`${testId}-find-prev`}
                  >
                    <ChevronUp className="gba:h-4 gba:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-7 gba:w-7"
                    onClick={handleFindNext}
                    aria-label={t('navigation-panel-find-next')}
                    data-testid={`${testId}-find-next`}
                  >
                    <ChevronDown className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('navigation-panel-match-count', { count: matches.length })}
                </p>
              </div>
            )}
          </div>
          {searchTerm.trim() && matchItems.length > 0 && (
            <ScrollArea className="gba:flex-1 gba:min-h-0 gba:border-t gba:border-border">
              <ul className="gba:px-3 gba:py-2 gba:space-y-1" data-testid={`${testId}-find-matches-list`}>
                {matchItems.map(item => (
                  <li key={`${item.from}-${item.to}-${item.index}`} className="gba:list-none">
                    <button
                      type="button"
                      onClick={() => goToMatch(item.index)}
                      className={`gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-sm gba:block gba:break-words ${
                        item.index === selectedMatchIndex
                          ? 'gba:bg-primary gba:text-primary-foreground'
                          : 'gba:text-foreground hover:gba:bg-muted'
                      }`}
                      data-testid={`${testId}-find-match-${item.index}`}
                      title={item.snippet}
                    >
                      <SnippetWithHighlight
                        snippet={item.snippet}
                        searchTerm={searchTerm}
                        caseSensitive={caseSensitive}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent
          value="replace"
          className="gba:flex-1 gba:min-h-0 gba:mt-0 gba:flex gba:flex-col gba:overflow-hidden"
        >
          <div className="gba:flex gba:flex-col gba:gap-2 gba:px-3 gba:py-2 gba:shrink-0">
            <p className="gba:text-xs gba:text-muted-foreground">{t('navigation-panel-replace-hint')}</p>
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (e.shiftKey) handleFindPrev()
                  else handleFindNext()
                }
              }}
              placeholder={t('navigation-panel-search-placeholder')}
              className="gba:text-foreground gba:placeholder:text-muted-foreground"
              data-testid={`${testId}-replace-find-input`}
            />
            <Input
              value={replaceTerm}
              onChange={e => setReplaceTerm(e.target.value)}
              placeholder={t('navigation-panel-replace-with-placeholder')}
              className="gba:text-foreground gba:placeholder:text-muted-foreground"
              data-testid={`${testId}-replace-input`}
            />
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={e => setCaseSensitive(e.target.checked)}
                  data-testid={`${testId}-replace-case-sensitive`}
                  className="gba:rounded gba:border-border"
                />
                {t('navigation-panel-case-sensitive')}
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={wholeWordsOnly}
                  onChange={e => setWholeWordsOnly(e.target.checked)}
                  data-testid={`${testId}-replace-whole-words`}
                  className="gba:rounded gba:border-border"
                />
                {t('navigation-panel-whole-words')}
              </label>
            </div>
            {searchTerm.trim() && matches.length === 0 && (
              <p className="gba:text-xs gba:text-muted-foreground">{t('navigation-panel-match-count', { count: 0 })}</p>
            )}
            {searchTerm.trim() && matches.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:flex gba:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-7 gba:w-7"
                    onClick={handleFindPrev}
                    aria-label={t('navigation-panel-find-prev')}
                    data-testid={`${testId}-replace-find-prev`}
                  >
                    <ChevronUp className="gba:h-4 gba:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-7 gba:w-7"
                    onClick={handleFindNext}
                    aria-label={t('navigation-panel-find-next')}
                    data-testid={`${testId}-replace-find-next`}
                  >
                    <ChevronDown className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('navigation-panel-match-count', { count: matches.length })}
                </p>
              </div>
            )}
            <div className="gba:flex gba:gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleReplace}
                disabled={matches.length === 0}
                data-testid={`${testId}-replace-btn`}
              >
                {t('navigation-panel-replace')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                data-testid={`${testId}-replace-all-btn`}
              >
                {t('navigation-panel-replace-all')}
              </Button>
            </div>
          </div>
          {searchTerm.trim() && matchItems.length > 0 && (
            <ScrollArea className="gba:flex-1 gba:min-h-0 gba:border-t gba:border-border">
              <ul className="gba:px-3 gba:py-2 gba:space-y-1" data-testid={`${testId}-replace-matches-list`}>
                {matchItems.map(item => (
                  <li key={`${item.from}-${item.to}-${item.index}`} className="gba:list-none">
                    <button
                      type="button"
                      onClick={() => goToMatch(item.index)}
                      className={`gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-sm gba:block gba:break-words ${
                        item.index === selectedMatchIndex
                          ? 'gba:bg-primary gba:text-primary-foreground'
                          : 'gba:text-foreground hover:gba:bg-muted'
                      }`}
                      data-testid={`${testId}-replace-match-${item.index}`}
                      title={item.snippet}
                    >
                      <SnippetWithHighlight
                        snippet={item.snippet}
                        searchTerm={searchTerm}
                        caseSensitive={caseSensitive}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
