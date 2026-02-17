/**
 * SignatureToolbar - Compact formatting toolbar for the signature editor.
 * Receives TipTap editor instance as a prop and renders formatting controls.
 */

import React, { useCallback, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Highlighter,
  Palette
} from 'lucide-react'

interface SignatureToolbarProps {
  editor: Editor
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  'data-testid'?: string
}

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' }
]

const FONT_SIZES = [
  { label: 'Auto', value: '' },
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '24', value: '24pt' },
  { label: '36', value: '36pt' }
]

const COLORS = [
  '#000000',
  '#374151',
  '#6B7280',
  '#1D4ED8',
  '#059669',
  '#DC2626',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0891B2'
]

/** Compact toolbar button */
const ToolbarBtn: React.FC<{
  active: boolean
  onClick: () => void
  title: string
  testId?: string
  children: React.ReactNode
}> = ({ active, onClick, title, testId, children }) => (
  <Button
    type="button"
    variant={active ? 'secondary' : 'ghost'}
    size="icon"
    className="gba:h-7 gba:w-7"
    onClick={onClick}
    title={title}
    data-testid={testId}
  >
    {children}
  </Button>
)

export const SignatureToolbar: React.FC<SignatureToolbarProps> = ({
  editor,
  onFileSelect,
  'data-testid': testId = 'sig-toolbar'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImageFromUrl = useCallback(() => {
    const url = window.prompt('Image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  return (
    <>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-0.5 gba:px-2 gba:py-1.5 gba:border-b gba:bg-muted/30">
        {/* Font family */}
        <select
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={e => {
            const val = e.target.value
            if (val) {
              editor.chain().focus().setFontFamily(val).run()
            } else {
              editor.chain().focus().unsetFontFamily().run()
            }
          }}
          className="gba:h-7 gba:text-xs gba:bg-background gba:border gba:rounded gba:px-1 gba:w-28"
          data-testid={`${testId}-font-family`}
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font size */}
        <select
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={e => {
            const val = e.target.value
            if (val) {
              editor.chain().focus().setMark('textStyle', { fontSize: val }).run()
            } else {
              editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
            }
          }}
          className="gba:h-7 gba:text-xs gba:bg-background gba:border gba:rounded gba:px-1 gba:w-14"
          data-testid={`${testId}-font-size`}
        >
          {FONT_SIZES.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-0.5" />

        {/* Text formatting */}
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
          testId={`${testId}-bold`}
        >
          <Bold className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
          testId={`${testId}-italic`}
        >
          <Italic className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
          testId={`${testId}-underline`}
        >
          <UnderlineIcon className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          testId={`${testId}-strike`}
        >
          <Strikethrough className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-0.5" />

        {/* Text color */}
        <div className="gba:relative gba:group">
          <ToolbarBtn active={false} onClick={() => {}} title="Text color" testId={`${testId}-color`}>
            <Palette className="gba:w-3.5 gba:h-3.5" />
          </ToolbarBtn>
          <div className="gba:hidden group-hover:gba:block gba:absolute gba:top-full gba:left-0 gba:z-50 gba:p-2 gba:bg-popover gba:border gba:rounded-lg gba:shadow-sm gba:mt-1">
            <div className="gba:grid gba:grid-cols-5 gba:gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                  className="gba:w-5 gba:h-5 gba:rounded gba:border hover:gba:scale-110 gba:transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Highlight */}
        <ToolbarBtn
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          title="Highlight"
          testId={`${testId}-highlight`}
        >
          <Highlighter className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-0.5" />

        {/* Alignment */}
        <ToolbarBtn
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
          testId={`${testId}-align-left`}
        >
          <AlignLeft className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
          testId={`${testId}-align-center`}
        >
          <AlignCenter className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
          testId={`${testId}-align-right`}
        >
          <AlignRight className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-0.5" />

        {/* Lists */}
        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          testId={`${testId}-bullet-list`}
        >
          <List className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
          testId={`${testId}-ordered-list`}
        >
          <ListOrdered className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-0.5" />

        {/* Link */}
        <ToolbarBtn active={editor.isActive('link')} onClick={setLink} title="Insert link" testId={`${testId}-link`}>
          <LinkIcon className="gba:w-3.5 gba:h-3.5" />
        </ToolbarBtn>

        {/* Image (upload + URL) */}
        <div className="gba:relative gba:group">
          <ToolbarBtn
            active={false}
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
            testId={`${testId}-image`}
          >
            <ImageIcon className="gba:w-3.5 gba:h-3.5" />
          </ToolbarBtn>
          <div className="gba:hidden group-hover:gba:block gba:absolute gba:top-full gba:right-0 gba:z-50 gba:bg-popover gba:border gba:rounded-lg gba:shadow-sm gba:mt-1 gba:py-1 gba:w-36">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="gba:w-full gba:text-left gba:px-3 gba:py-1.5 gba:text-xs hover:gba:bg-muted gba:text-foreground"
            >
              Upload from file
            </button>
            <button
              onClick={addImageFromUrl}
              className="gba:w-full gba:text-left gba:px-3 gba:py-1.5 gba:text-xs hover:gba:bg-muted gba:text-foreground"
            >
              Insert from URL
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="gba:hidden"
        data-testid={`${testId}-file-input`}
      />
    </>
  )
}
