/**
 * Insert image dialog: Upload (file picker / drop zone) and From URL.
 * Replaces window.prompt for image URL with a proper dialog (Google Docs / Word style).
 */

import React, { useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import { Upload } from 'lucide-react'
import translations from '../../_i18n'
import { uploadDocumentImage } from '../../services/DocumentImageUploadService'

export interface InsertImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  documentId: string | null
  accessToken: string
  'data-testid'?: string
}

export function InsertImageDialog({
  open,
  onOpenChange,
  editor,
  documentId,
  accessToken,
  'data-testid': testId = 'document-editor-insert-image-dialog'
}: InsertImageDialogProps) {
  const { t } = useTranslation(translations)
  const [urlValue, setUrlValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setUrlValue('')
    setError(null)
    setUploading(false)
    setIsDragging(false)
  }, [])

  const handleInsertByUrl = useCallback(() => {
    const url = urlValue.trim()
    if (!url || !editor) return
    setError(null)
    editor.chain().focus().setImage({ src: url }).run()
    onOpenChange(false)
    resetState()
  }, [editor, urlValue, onOpenChange, resetState])

  const insertImage = useCallback(
    (src: string) => {
      if (!editor) return
      editor.chain().focus().setImage({ src }).run()
      onOpenChange(false)
      resetState()
    },
    [editor, onOpenChange, resetState]
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (!editor || !accessToken) return
      setError(null)
      setUploading(true)
      try {
        const { url } = await uploadDocumentImage(file, documentId, accessToken)
        insertImage(url)
      } catch {
        setError(t('insert-image-upload-failed'))
      } finally {
        setUploading(false)
      }
    },
    [editor, accessToken, documentId, insertImage, t]
  )

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      }
      e.target.value = ''
    },
    [handleFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      } else {
        setError(t('insert-image-upload-failed'))
      }
    },
    [handleFile, t]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState()
      onOpenChange(next)
    },
    [onOpenChange, resetState]
  )

  if (!editor) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gba:max-w-md"
        data-testid={testId}
        onPointerDownOutside={() => !uploading && handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>{t('insert-image-dialog-title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="gba:w-full">
          <TabsList className="gba:w-full gba:grid gba:grid-cols-2">
            <TabsTrigger value="upload" data-testid="document-editor-insert-image-upload">
              {t('insert-image-tab-upload')}
            </TabsTrigger>
            <TabsTrigger value="url" data-testid="document-editor-insert-image-from-url">
              {t('insert-image-tab-from-url')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="gba:space-y-4 gba:pt-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              className={`gba:border-2 gba:border-dashed gba:rounded-md gba:p-8 gba:text-center gba:cursor-pointer gba:transition-colors ${
                isDragging
                  ? 'gba:border-primary gba:bg-primary/5'
                  : 'gba:border-muted-foreground/25 gba:hover:border-muted-foreground/50'
              } ${uploading ? 'gba:pointer-events-none gba:opacity-70' : ''}`}
              data-testid="document-editor-insert-image-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                className="gba:sr-only"
                aria-label={t('insert-image-choose-file')}
              />
              {uploading ? (
                <span className="gba:text-muted-foreground">{t('insert-image-uploading')}</span>
              ) : (
                <>
                  <Upload className="gba:mx-auto gba:h-10 gba:w-10 gba:text-muted-foreground gba:mb-2" />
                  <p className="gba:text-sm gba:text-muted-foreground">{t('insert-image-drop-here')}</p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="gba:space-y-4 gba:pt-4">
            <div className="gba:space-y-2">
              <Label htmlFor="insert-image-url">{t('editor-toolbar-image-prompt')}</Label>
              <Input
                id="insert-image-url"
                type="url"
                placeholder={t('insert-image-url-placeholder')}
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                className="gba:w-full"
                data-testid="document-editor-insert-image-url-input"
              />
            </div>
            <Button
              onClick={handleInsertByUrl}
              disabled={!urlValue.trim()}
              data-testid="document-editor-insert-image-url-insert"
            >
              {t('insert-image-insert')}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="gba:text-sm gba:text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>
            {t('insert-image-cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
