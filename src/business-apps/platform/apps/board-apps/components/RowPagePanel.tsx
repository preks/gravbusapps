/**
 * RowPagePanel - Notion-style row page as a large centered modal overlay.
 * Modern, sleek design with auto-save and rich editing.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, Spinner, Badge, toast } from '@newwork/nw-design-system'
import { X, Save, ChevronRight } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import DOMPurify from 'dompurify'
import type { BoardRow, BoardColumn } from '../types'
import { BoardApiService } from '../services/BoardApiService'
import { CellRenderer } from './table/CellRenderer'
import { FlowTimelinePanel } from './flow-engine/FlowTimelinePanel'

export interface RowPagePanelProps {
  boardId: string
  sheetId: string
  row: BoardRow
  columns: BoardColumn[]
  onClose: () => void
  onPageCreated?: (rowId: string) => void
  'data-testid'?: string
}

export const RowPagePanel: React.FC<RowPagePanelProps> = ({
  boardId,
  sheetId,
  row,
  columns,
  onClose,
  onPageCreated,
  'data-testid': testId = 'row-page-panel'
}) => {
  const [pageContent, setPageContent] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [fieldsExpanded, setFieldsExpanded] = useState(true)
  const isSettingContentRef = React.useRef(false)

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing...' })],
    content: '',
    onUpdate: () => {
      if (!isSettingContentRef.current) setIsDirty(true)
    },
    editorProps: {
      attributes: {
        class: 'gba:min-h-64 gba:outline-none gba:text-base gba:leading-relaxed gba:prose gba:prose-sm gba:max-w-none'
      }
    }
  })

  const rowTitle = useMemo(() => {
    const firstTextCol = columns.find(c => c.type === 'text' && c.order === 0) || columns[0]
    return firstTextCol ? String(row.data[firstTextCol.name] || 'Untitled') : 'Row'
  }, [columns, row.data])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setIsDirty(false)
    void (async () => {
      try {
        const result = await BoardApiService.getRowPage(boardId, sheetId, row.id)
        if (cancelled) return
        setNoteId(result.noteId)
        setPageTitle(result.title || null)
        setPageContent(result.content || null)
        setLocalTitle(result.title || '')
      } catch {
        if (cancelled) return
        try {
          const titleCol = columns.find(c => c.type === 'text' && c.order === 0)
          const title = titleCol ? String(row.data[titleCol.name] || 'Untitled') : 'Row Page'
          const created = await BoardApiService.createRowPage(boardId, sheetId, row.id, { title })
          if (cancelled) return
          setNoteId(created.noteId)
          setPageTitle(created.title || title)
          setPageContent('<p></p>')
          setLocalTitle(created.title || title)
          onPageCreated?.(row.id)
        } catch {
          if (!cancelled) setPageContent(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [boardId, sheetId, row.id, columns, row.data, onPageCreated])

  useEffect(() => {
    if (!editor || !noteId || pageContent === null) return
    isSettingContentRef.current = true
    try {
      editor.commands.setContent(DOMPurify.sanitize(pageContent) || '', false)
    } finally {
      isSettingContentRef.current = false
      setIsDirty(false)
    }
  }, [editor, noteId, pageContent])

  const handleCreatePage = useCallback(async () => {
    const titleCol = columns.find(c => c.type === 'text' && c.order === 0)
    const title = titleCol ? String(row.data[titleCol.name] || 'Untitled') : 'Row Page'
    try {
      const result = await BoardApiService.createRowPage(boardId, sheetId, row.id, { title })
      setNoteId(result.noteId)
      setPageTitle(result.title || title)
      setPageContent('<p></p>')
      setLocalTitle(result.title || title)
      onPageCreated?.(row.id)
    } catch {
      /* silent */
    }
  }, [boardId, sheetId, row.id, columns, row.data, onPageCreated])

  const handleSave = useCallback(async () => {
    if (!noteId) {
      await handleCreatePage()
      return
    }
    if (!editor) return
    setIsSaving(true)
    try {
      const html = editor.getHTML()
      const title = localTitle.trim() || pageTitle || rowTitle
      const result = await BoardApiService.updateRowPage(boardId, sheetId, row.id, { title, content: html })
      setNoteId(result.noteId)
      setPageTitle(result.title || title)
      setPageContent(html)
      setIsDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [noteId, editor, localTitle, pageTitle, rowTitle, boardId, sheetId, row.id, handleCreatePage])

  useEffect(() => {
    if (!noteId) return
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [noteId, handleSave])

  useEffect(() => {
    if (!isDirty || !noteId || !editor) return
    const t = setTimeout(() => void handleSave(), 3000)
    return () => clearTimeout(t)
  }, [isDirty, noteId, editor, handleSave])

  const handleClose = useCallback(async () => {
    if (isDirty && noteId && editor && !isSaving) await handleSave()
    onClose()
  }, [isDirty, noteId, editor, isSaving, handleSave, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="gba:fixed gba:inset-0 gba:bg-background/60 gba:backdrop-blur-sm gba:z-50"
        onClick={handleClose}
        data-testid={`${testId}-backdrop`}
      />

      {/* Modal */}
      <div
        className="gba:fixed gba:inset-4 gba:md:inset-x-16 gba:md:inset-y-8 gba:lg:inset-x-32 gba:lg:inset-y-10 gba:bg-card gba:rounded-xl gba:border gba:z-50 gba:flex gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        {/* Top bar */}
        <header className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-3 gba:border-b gba:flex-shrink-0 gba:bg-card">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            {isDirty && (
              <Badge variant="outline" className="gba:text-xs gba:px-1.5 gba:py-0 gba:animate-pulse">
                Editing
              </Badge>
            )}
            {isSaving && (
              <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0">
                Saving...
              </Badge>
            )}
            {!isDirty && !isSaving && noteId && (
              <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0 gba:text-success">
                Saved
              </Badge>
            )}
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleSave()}
                className="gba:h-7 gba:text-xs gba:gap-1"
                data-testid={`${testId}-save`}
              >
                <Save className="gba:w-3 gba:h-3" /> Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="gba:h-7 gba:w-7"
              data-testid={`${testId}-close`}
            >
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </header>

        <div className="gba:flex-1 gba:overflow-auto">
          <div className="gba:max-w-2xl gba:mx-auto gba:px-8 gba:py-8">
            {/* Properties (collapsible) */}
            <section className="gba:mb-8">
              <button
                onClick={() => setFieldsExpanded(!fieldsExpanded)}
                className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:mb-2"
                data-testid={`${testId}-toggle-fields`}
              >
                <ChevronRight
                  className={`gba:w-3 gba:h-3 gba:transition-transform ${fieldsExpanded ? 'gba:rotate-90' : ''}`}
                />
                Properties
                <span className="gba:text-muted-foreground/50">{columns.length}</span>
              </button>
              {fieldsExpanded && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-x-6 gba:gap-y-1 gba:pl-5">
                  {columns.map(col => (
                    <div
                      key={col.id}
                      className="gba:flex gba:items-center gba:gap-3 gba:py-1.5 gba:rounded gba:hover:bg-muted/20 gba:px-2 gba:-mx-2 gba:transition-colors"
                    >
                      <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:flex-shrink-0 gba:truncate">
                        {col.label}
                      </span>
                      <span className="gba:flex-1 gba:min-w-0">
                        <CellRenderer
                          value={row.data[col.name]}
                          type={col.type}
                          columnName={col.name}
                          options={col.selectOptions}
                          isPrimary={!!col.isPrimary}
                          rowData={row.data}
                          relationConfig={col.relationConfig}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Flow timeline (when row is a flow instance) */}
            {row.data.flowId && typeof row.data.flowId === 'string' && (
              <section className="gba:mb-8">
                <FlowTimelinePanel flowId={row.data.flowId} data-testid={`${testId}-flow-timeline`} />
              </section>
            )}

            {/* Divider */}
            <div className="gba:h-px gba:bg-border gba:mb-8" />

            {/* Page content */}
            {isLoading ? (
              <div className="gba:flex gba:justify-center gba:py-16">
                <Spinner />
              </div>
            ) : noteId ? (
              <>
                <input
                  value={localTitle}
                  onChange={e => {
                    setLocalTitle(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Untitled"
                  className="gba:w-full gba:text-3xl gba:font-bold gba:text-foreground gba:bg-transparent gba:border-0 gba:outline-none gba:placeholder-muted-foreground/30 gba:mb-6"
                  data-testid={`${testId}-title`}
                />
                <div data-testid={`${testId}-editor`}>
                  {editor ? (
                    <EditorContent editor={editor} />
                  ) : (
                    <p className="gba:text-sm gba:text-muted-foreground">Loading editor...</p>
                  )}
                </div>
              </>
            ) : (
              <div className="gba:text-center gba:py-20">
                <div className="gba:w-14 gba:h-14 gba:rounded-full gba:bg-muted/40 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Save className="gba:w-6 gba:h-6 gba:text-muted-foreground/40" />
                </div>
                <p className="gba:text-muted-foreground gba:mb-4">Start writing to create a page</p>
                <Button variant="outline" onClick={handleCreatePage} data-testid={`${testId}-create-page`}>
                  Create page
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="gba:border-t gba:px-6 gba:py-2 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0 gba:bg-muted/10">
          <span className="gba:text-xs gba:text-muted-foreground">
            {isDirty ? 'Auto-saves in 3s' : noteId ? 'All changes saved' : ''}
          </span>
          <span className="gba:text-xs gba:text-muted-foreground/50">Cmd/Ctrl+S to save</span>
        </footer>
      </div>
    </>
  )
}
