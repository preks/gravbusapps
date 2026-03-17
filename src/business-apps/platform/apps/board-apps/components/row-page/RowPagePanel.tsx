import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, Spinner, toast } from '@newwork/nw-design-system'
import { X, FileText } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { BoardRow, BoardColumn } from '../../types'
import { BoardApiService } from '../../services/BoardApiService'
import { RowPageHeader } from './RowPageHeader'
import { RowPageProperties } from './RowPageProperties'
import { RowPageEditor } from './RowPageEditor'
import { useRowPageEditor } from './useRowPageEditor'
import { useRowPageCover } from './useRowPageCover'
import { SaveIndicator } from './SaveIndicator'
import { encodeMetaIntoHtml, decodeMetaFromHtml } from './rowPageMeta'

export interface RowPagePanelProps {
  boardId: string
  sheetId: string
  row: BoardRow
  columns: BoardColumn[]
  accessToken: string
  onClose: () => void
  onPageCreated?: (rowId: string) => void
  'data-testid'?: string
}

export const RowPagePanel: React.FC<RowPagePanelProps> = ({
  boardId,
  sheetId,
  row,
  columns,
  accessToken,
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
  const [pageIcon, setPageIcon] = useState<string | null>(null)

  const markDirty = useCallback(() => setIsDirty(true), [])

  const { editor, setContent, getHTML, insertImageViaFilePicker } = useRowPageEditor({
    accessToken,
    documentId: noteId,
    onDirty: markDirty
  })

  const { coverImage, displayCover, setCover, loadCover, pickCoverFile, isUploadingCover } = useRowPageCover({
    accessToken,
    documentId: noteId,
    onDirty: markDirty
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
        setLocalTitle(result.title || '')

        const rawContent = result.content || ''
        const { meta, html: editorHtml } = decodeMetaFromHtml(rawContent)
        setPageContent(editorHtml || null)
        if (meta.icon) setPageIcon(meta.icon)
        if (meta.coverImage) loadCover(meta.coverImage)
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
  }, [boardId, sheetId, row.id, columns, row.data, onPageCreated, loadCover])

  useEffect(() => {
    if (!noteId || pageContent === null) return
    setContent(DOMPurify.sanitize(pageContent) || '')
    setIsDirty(false)
  }, [noteId, pageContent, setContent])

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
      const editorHtml = getHTML()
      const title = localTitle.trim() || pageTitle || rowTitle
      const contentWithMeta = encodeMetaIntoHtml(editorHtml, {
        icon: pageIcon,
        coverImage
      })
      const result = await BoardApiService.updateRowPage(boardId, sheetId, row.id, {
        title,
        content: contentWithMeta
      })
      setNoteId(result.noteId)
      setPageTitle(result.title || title)
      setIsDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [
    noteId,
    editor,
    localTitle,
    pageTitle,
    rowTitle,
    boardId,
    sheetId,
    row.id,
    handleCreatePage,
    getHTML,
    pageIcon,
    coverImage
  ])

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

  const handleTitleChange = useCallback((value: string) => {
    setLocalTitle(value)
    setIsDirty(true)
  }, [])

  const handleIconChange = useCallback((emoji: string | null) => {
    setPageIcon(emoji)
    setIsDirty(true)
  }, [])

  return (
    <>
      <div
        className="gba:fixed gba:inset-0 gba:bg-background/60 gba:backdrop-blur-sm gba:z-50 gba:animate-in gba:fade-in-0 gba:duration-200"
        onClick={handleClose}
        data-testid={`${testId}-backdrop`}
      />

      <div
        className="gba:fixed gba:inset-4 gba:md:inset-x-16 gba:md:inset-y-6 gba:lg:inset-x-32 gba:lg:inset-y-8 gba:bg-card gba:rounded-xl gba:border gba:shadow-2xl gba:z-50 gba:flex gba:flex-col gba:overflow-hidden gba:animate-in gba:fade-in-0 gba:zoom-in-95 gba:duration-200"
        data-testid={testId}
      >
        <header className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <SaveIndicator isDirty={isDirty} isSaving={isSaving} hasPage={!!noteId} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="gba:h-8 gba:w-8 gba:rounded-lg gba:hover:bg-muted"
            data-testid={`${testId}-close`}
          >
            <X className="gba:w-4 gba:h-4" />
          </Button>
        </header>

        <div className="gba:flex-1 gba:overflow-auto">
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:py-24">
              <Spinner />
            </div>
          ) : noteId ? (
            <>
              <RowPageHeader
                title={localTitle}
                onTitleChange={handleTitleChange}
                icon={pageIcon}
                onIconChange={handleIconChange}
                coverImage={displayCover}
                onCoverChange={setCover}
                onCoverUpload={pickCoverFile}
                isUploadingCover={isUploadingCover}
                data-testid={`${testId}-header`}
              />

              <RowPageProperties row={row} columns={columns} data-testid={`${testId}-properties`} />

              <div className="gba:max-w-2xl gba:mx-auto gba:px-8 gba:pb-16">
                <RowPageEditor
                  editor={editor}
                  onInsertImage={insertImageViaFilePicker}
                  data-testid={`${testId}-editor`}
                />
              </div>
            </>
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-32">
              <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-muted/40 gba:flex gba:items-center gba:justify-center gba:mb-5">
                <FileText className="gba:w-7 gba:h-7 gba:text-muted-foreground/40" />
              </div>
              <p className="gba:text-muted-foreground gba:mb-5 gba:text-sm">Create a page to start writing</p>
              <Button
                variant="outline"
                onClick={handleCreatePage}
                className="gba:rounded-lg"
                data-testid={`${testId}-create-page`}
              >
                Create page
              </Button>
            </div>
          )}
        </div>

        <footer className="gba:border-t gba:px-4 gba:py-1.5 gba:flex gba:items-center gba:justify-end gba:flex-shrink-0 gba:bg-muted/5">
          <span className="gba:text-[11px] gba:text-muted-foreground/40 gba:tabular-nums">
            {isDirty ? 'Saving...' : noteId ? 'Saved' : ''}
          </span>
        </footer>
      </div>
    </>
  )
}
