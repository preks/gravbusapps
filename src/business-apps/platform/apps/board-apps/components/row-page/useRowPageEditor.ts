import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Highlight } from '@tiptap/extension-highlight'
import { Typography } from '@tiptap/extension-typography'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import Collaboration from '@tiptap/extension-collaboration'
import { createYjsCursorExtension } from '@/business-apps/platform/apps/document-apps/components/PagedDocumentEditor/extensions/YjsCursor'
import { DocumentImage } from '@/business-apps/platform/apps/document-apps/components/PagedDocumentEditor/extensions/DocumentImage'
import { uploadDocumentImage } from '@/business-apps/platform/apps/document-apps/services/DocumentImageUploadService'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

export interface UseRowPageEditorOptions {
  accessToken: string
  documentId: string | null
  onDirty: () => void
  ydoc?: Y.Doc | null
  awareness?: Awareness | null
}

export function useRowPageEditor({ accessToken, documentId, onDirty, ydoc, awareness }: UseRowPageEditorOptions) {
  const isCollaborationMode = Boolean(ydoc && awareness)
  const isSettingContentRef = useRef(false)
  const editorRef = useRef<Editor | null>(null)
  const accessTokenRef = useRef(accessToken)
  accessTokenRef.current = accessToken
  const documentIdRef = useRef(documentId)
  documentIdRef.current = documentId

  const uploadAndInsert = useCallback(async (file: File) => {
    const ed = editorRef.current
    if (!ed) return
    try {
      const { url } = await uploadDocumentImage(file, documentIdRef.current, accessTokenRef.current)
      ed.chain().focus().setImage({ src: url }).run()
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        ed.chain()
          .focus()
          .setImage({ src: reader.result as string })
          .run()
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const uploadAndInsertMultiple = useCallback(async (files: File[], dropPos: number | null) => {
    const ed = editorRef.current
    if (!ed) return
    try {
      const results = await Promise.all(
        files.map(f => uploadDocumentImage(f, documentIdRef.current, accessTokenRef.current))
      )
      const urls = results.map(r => r.url)
      if (dropPos != null) {
        ed.chain()
          .focus()
          .insertContentAt(dropPos, { type: 'image', attrs: { src: urls[0] } })
          .run()
        for (let i = 1; i < urls.length; i++) {
          ed.chain().focus().setImage({ src: urls[i] }).run()
        }
      } else {
        urls.forEach(url => ed.chain().focus().setImage({ src: url }).run())
      }
    } catch {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = () => {
        ed.chain()
          .focus()
          .setImage({ src: reader.result as string })
          .run()
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const collaborationExtension = useMemo(() => (ydoc ? Collaboration.configure({ document: ydoc }) : null), [ydoc])
  const yjsCursorExtension = useMemo(() => (awareness ? createYjsCursorExtension(awareness) : null), [awareness])

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          ...(isCollaborationMode ? { history: false, undoRedo: false } : {}),
          link: false,
          underline: false
        } as any),
        Placeholder.configure({ placeholder: 'Type / for commands...' }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false, autolink: true }),
        Highlight.configure({ multicolor: false }),
        Typography,
        TaskList,
        TaskItem.configure({ nested: true }),
        DocumentImage.configure({ getAccessToken: () => accessTokenRef.current }),
        ...(collaborationExtension ? [collaborationExtension] : []),
        ...(yjsCursorExtension ? [yjsCursorExtension] : [])
      ],
      content: isCollaborationMode ? '<p></p>' : '<p></p>',
      onUpdate: () => {
        if (!isSettingContentRef.current && !isCollaborationMode) onDirty()
      },
      editorProps: {
        attributes: {
          class: 'gba:outline-none'
        },
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.items
          if (!items) return false
          for (const item of items) {
            if (item.type.includes('image')) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                void uploadAndInsert(file)
                return true
              }
            }
          }
          return false
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false
          const files = event.dataTransfer?.files
          const imageFiles = files ? Array.from(files).filter(f => f.type.startsWith('image/')) : []
          if (imageFiles.length === 0) return false
          event.preventDefault()
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          void uploadAndInsertMultiple(imageFiles, coords?.pos ?? null)
          return true
        }
      }
    },
    [isCollaborationMode, collaborationExtension, yjsCursorExtension]
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const setContent = useCallback(
    (html: string) => {
      if (!editor) return
      isSettingContentRef.current = true
      try {
        editor.commands.setContent(html || '', false)
      } finally {
        isSettingContentRef.current = false
      }
    },
    [editor]
  )

  const getHTML = useCallback(() => editor?.getHTML() ?? '', [editor])

  const insertImageViaFilePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void uploadAndInsert(file)
    }
    input.click()
  }, [uploadAndInsert])

  return { editor, setContent, getHTML, insertImageViaFilePicker }
}
