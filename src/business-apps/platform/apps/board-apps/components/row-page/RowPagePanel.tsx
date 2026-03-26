import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button, Spinner, toast } from '@newwork/nw-design-system'
import { X, FileText, Activity } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { BoardRow, BoardColumn } from '../../types'
import { BoardApiService } from '../../services/BoardApiService'
import { RowPageHeader } from './RowPageHeader'
import { RowPageProperties } from './RowPageProperties'
import { RowPageEditor } from './RowPageEditor'
import { useRowPageEditor } from './useRowPageEditor'
import { useRowPageCover } from './useRowPageCover'
import { useRowPageCollaboration } from './useRowPageCollaboration'
import { SaveIndicator } from './SaveIndicator'
import { encodeMetaIntoHtml, decodeMetaFromHtml } from './rowPageMeta'
import { PresenceIndicator } from '../../../shared/components/PresenceIndicator'
import { RowAuditLog } from './RowAuditLog'

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
  const [activeTab, setActiveTab] = useState<'page' | 'activity'>('page')
  const [pageContent, setPageContent] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [collabChangeSeq, setCollabChangeSeq] = useState(0)
  const [localTitle, setLocalTitle] = useState('')
  const [pageIcon, setPageIcon] = useState<string | null>(null)

  const markDirty = useCallback(() => setIsDirty(true), [])
  const editorRef = useRef<import('@tiptap/react').Editor | null>(null)

  const handleLocalCollabChange = useCallback(() => {
    setCollabChangeSeq(prev => prev + 1)
  }, [])

  const { ydoc, awareness, participants, isYjsSynced, isCollaborationConnected } = useRowPageCollaboration({
    noteId,
    accessToken,
    editorRef,
    onLocalDocumentChange: handleLocalCollabChange
  })
  const metaYMap = useMemo(() => ydoc.getMap<unknown>('documentMeta'), [ydoc])

  const { editor, setContent, getHTML, insertImageViaFilePicker } = useRowPageEditor({
    accessToken,
    documentId: noteId,
    onDirty: markDirty,
    ydoc: noteId ? ydoc : null,
    awareness: noteId ? awareness : null
  })

  editorRef.current = editor

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
  }, [boardId, sheetId, row.id, onPageCreated, loadCover])

  useEffect(() => {
    if (noteId) return
    if (pageContent === null) return
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
      if (isYjsSynced) {
        metaYMap.set('title', title)
      }
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
    isYjsSynced,
    metaYMap,
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
    if (!isDirty || !noteId || !editor || isYjsSynced) return
    const t = setTimeout(() => void handleSave(), 3000)
    return () => clearTimeout(t)
  }, [isDirty, noteId, editor, handleSave, isYjsSynced])

  useEffect(() => {
    if (!noteId || !isYjsSynced) return
    if (metaYMap.get('title')) return
    const initial = (localTitle || pageTitle || rowTitle || '').trim()
    if (!initial) return
    metaYMap.set('title', initial)
  }, [noteId, isYjsSynced, metaYMap, localTitle, pageTitle, rowTitle])

  useEffect(() => {
    if (!noteId || !isYjsSynced) return

    const applyFromYjs = () => {
      const next = metaYMap.get('title')
      if (typeof next !== 'string') return
      setLocalTitle(prev => (prev === next ? prev : next))
      setPageTitle(prev => (prev === next ? prev : next))
    }

    applyFromYjs()
    const handler = () => applyFromYjs()
    metaYMap.observe(handler)
    return () => metaYMap.unobserve(handler)
  }, [noteId, isYjsSynced, metaYMap])

  useEffect(() => {
    if (!isYjsSynced || !noteId || !editor) return
    if (collabChangeSeq === 0) return
    const t = setTimeout(() => void handleSave(), 1500)
    return () => clearTimeout(t)
  }, [collabChangeSeq, isYjsSynced, noteId, editor, handleSave])

  useEffect(() => {
    if (!isYjsSynced || !isDirty || !noteId || !editor) return
    const t = setTimeout(() => void handleSave(), 1500)
    return () => clearTimeout(t)
  }, [isYjsSynced, isDirty, noteId, editor, handleSave, localTitle, pageIcon, coverImage])

  const handleClose = useCallback(async () => {
    if (isDirty && noteId && editor && !isSaving) await handleSave()
    onClose()
  }, [isDirty, noteId, editor, isSaving, handleSave, onClose])

  const handleTitleChange = useCallback(
    (value: string) => {
      setLocalTitle(value)
      if (isYjsSynced) {
        metaYMap.set('title', value)
      }
      setIsDirty(true)
    },
    [isYjsSynced, metaYMap]
  )

  const handleIconChange = useCallback((emoji: string | null) => {
    setPageIcon(emoji)
    setIsDirty(true)
  }, [])

  const portalRef = useRef<HTMLDivElement | null>(null)
  if (!portalRef.current) {
    const el = document.createElement('div')
    el.id = 'row-page-drawer-portal'
    document.body.appendChild(el)
    portalRef.current = el
  }
  useEffect(() => {
    return () => {
      portalRef.current?.remove()
      portalRef.current = null
    }
  }, [])

  return createPortal(
    <>
      <style>{`
        @keyframes rowPageSlideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes rowPageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        body > [data-radix-popper-content-wrapper] {
          z-index: 2147483647 !important;
        }
        .EmojiPickerReact {
          z-index: 2147483647 !important;
        }
      `}</style>

      {/* Backdrop — subtle dim, no blur */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483640,
          backgroundColor: 'var(--nw-color-background)',
          opacity: 0.18,
          animation: 'rowPageFadeIn 250ms ease-out'
        }}
        onClick={handleClose}
        data-testid={`${testId}-backdrop`}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(800px, 100vw)',
          zIndex: 2147483641,
          animation: 'rowPageSlideIn 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)'
        }}
        className="gba:bg-card gba:border-l"
        data-testid={testId}
      >
        {/* Drawer header */}
        <header className="gba:flex gba:flex-col gba:flex-shrink-0 gba:border-b gba:border-border/40">
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
              <SaveIndicator isDirty={isDirty} isSaving={isSaving} hasPage={!!noteId} />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {participants.length > 0 && <PresenceIndicator participants={participants} size="sm" />}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="gba:h-8 gba:w-8 gba:rounded-lg gba:hover:bg-muted"
                data-testid={`${testId}-close`}
              >
                <X className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
          {/* Tab bar */}
          <div className="gba:flex gba:gap-0 gba:px-4">
            <button
              onClick={() => setActiveTab('page')}
              className={[
                'gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:border-b-2 gba:transition-colors',
                activeTab === 'page'
                  ? 'gba:border-foreground gba:text-foreground'
                  : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground'
              ].join(' ')}
              data-testid={`${testId}-tab-page`}
            >
              <FileText className="gba:w-3.5 gba:h-3.5" />
              Page
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={[
                'gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:border-b-2 gba:transition-colors',
                activeTab === 'activity'
                  ? 'gba:border-foreground gba:text-foreground'
                  : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground'
              ].join(' ')}
              data-testid={`${testId}-tab-activity`}
            >
              <Activity className="gba:w-3.5 gba:h-3.5" />
              Activity
            </button>
          </div>
        </header>

        {/* Drawer body */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
          {activeTab === 'activity' ? (
            <RowAuditLog boardId={boardId} sheetId={sheetId} rowId={row.id} data-testid={`${testId}-activity`} />
          ) : isLoading ? (
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

              <div className="gba:mx-auto gba:px-8 gba:pb-16" style={{ maxWidth: 680 }}>
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

        {/* Drawer footer */}
        <footer className="gba:border-t gba:px-4 gba:py-1.5 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0 gba:bg-muted/5">
          <span className="gba:text-[11px] gba:text-muted-foreground/40">
            {isYjsSynced && isCollaborationConnected ? 'Collaborative editing' : ''}
          </span>
          <span className="gba:text-[11px] gba:text-muted-foreground/40 gba:tabular-nums">
            {isYjsSynced
              ? isCollaborationConnected
                ? 'Synced'
                : 'Offline'
              : isDirty
                ? 'Saving...'
                : noteId
                  ? 'Saved'
                  : ''}
          </span>
        </footer>
      </div>
    </>,
    portalRef.current
  )
}
