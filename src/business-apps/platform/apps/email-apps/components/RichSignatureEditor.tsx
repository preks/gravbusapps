/**
 * RichSignatureEditor - TipTap-based WYSIWYG editor for email signatures.
 * Handles paste/drop of images from Outlook, screenshots, and other sources
 * by converting them to inline base64 data URIs. Preserves font sizes, font
 * families, colors, and all formatting when pasting from Outlook/Gmail/Word.
 */

import React, { useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { FontSize } from '../extensions/FontSize'
import { SignatureToolbar } from './SignatureToolbar'

interface RichSignatureEditorProps {
  content: string
  onChange: (html: string) => void
  'data-testid'?: string
}

/** Convert a File/Blob to a base64 data URI. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Extract image files from a DataTransfer object. */
function getImageFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = []
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i]
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  return files
}

/** Check whether pasted HTML has broken image sources (cid:, blob:). */
function hasBrokenImageSrcs(html: string): boolean {
  return /src=["'](blob:|cid:)/i.test(html)
}

/** Replace broken img src references in HTML with base64 data URIs. */
function replaceBrokenImages(html: string, dataUris: string[]): string {
  let idx = 0
  return html.replace(/<img([^>]*)src=["'](blob:|cid:)[^"']*["']([^>]*)\/?>/gi, (_match, before, _scheme, after) => {
    if (idx < dataUris.length) {
      return `<img${before}src="${dataUris[idx++]}"${after}/>`
    }
    return '' // No image data available — remove the broken tag
  })
}

export const RichSignatureEditor: React.FC<RichSignatureEditorProps> = ({
  content,
  onChange,
  'data-testid': testId = 'rich-signature-editor'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'signature-image' }
      })
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        const html = clipboardData.getData('text/html')
        const imageFiles = getImageFiles(clipboardData)

        // CASE 1: HTML exists (from Outlook/Word/Gmail) — always prefer HTML for formatting
        if (html) {
          const hasBroken = hasBrokenImageSrcs(html)

          if (hasBroken && imageFiles.length > 0) {
            // HTML has broken image refs AND we have clipboard image blobs.
            // Replace the cid:/blob: refs with base64 from the clipboard files.
            event.preventDefault()
            Promise.all(imageFiles.map(f => fileToBase64(f))).then(dataUris => {
              const fixedHtml = replaceBrokenImages(html, dataUris)
              const tempDiv = document.createElement('div')
              tempDiv.innerHTML = fixedHtml
              const parser = ProseMirrorDOMParser.fromSchema(view.state.schema)
              const slice = parser.parseSlice(tempDiv)
              view.dispatch(view.state.tr.replaceSelection(slice))
            })
            return true
          }

          if (hasBroken) {
            // Broken image refs but no file blobs — strip broken imgs, keep text
            event.preventDefault()
            const cleanHtml = html.replace(/<img[^>]*src=["'](blob:|cid:)[^"']*["'][^>]*\/?>/gi, '')
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = cleanHtml
            const parser = ProseMirrorDOMParser.fromSchema(view.state.schema)
            const slice = parser.parseSlice(tempDiv)
            view.dispatch(view.state.tr.replaceSelection(slice))
            return true
          }

          // HTML with valid image sources — let TipTap handle it naturally
          // (preserves all formatting, font sizes, colors, valid images)
          return false
        }

        // CASE 2: No HTML, only image files (screenshot paste, drag-from-explorer)
        if (imageFiles.length > 0) {
          event.preventDefault()
          imageFiles.forEach(file => {
            fileToBase64(file).then(dataUri => {
              view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: dataUri })))
            })
          })
          return true
        }

        return false
      },
      handleDrop: (view, event) => {
        const dataTransfer = event.dataTransfer
        if (!dataTransfer) return false

        const imageFiles = getImageFiles(dataTransfer)
        if (imageFiles.length === 0) return false

        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
        imageFiles.forEach(file => {
          fileToBase64(file).then(dataUri => {
            const node = view.state.schema.nodes.image.create({ src: dataUri })
            const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node)
            view.dispatch(tr)
          })
        })
        return true
      }
    }
  })

  /** Handle file input selection — convert to base64 and insert. */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor || !e.target.files?.length) return
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) return
      const dataUri = await fileToBase64(file)
      editor.chain().focus().setImage({ src: dataUri }).run()
      e.target.value = ''
    },
    [editor]
  )

  if (!editor) return null

  return (
    <div className="gba:border gba:rounded-lg gba:overflow-hidden gba:bg-card" data-testid={testId}>
      <SignatureToolbar editor={editor} onFileSelect={handleFileSelect} data-testid={`${testId}-toolbar`} />

      <EditorContent
        editor={editor}
        className="gba:prose gba:prose-sm gba:max-w-none gba:min-h-24 gba:max-h-48 gba:overflow-y-auto gba:px-3 gba:py-2 gba:text-foreground [&_.ProseMirror]:gba:outline-none [&_.ProseMirror]:gba:min-h-20"
        data-testid={`${testId}-content`}
      />
    </div>
  )
}
