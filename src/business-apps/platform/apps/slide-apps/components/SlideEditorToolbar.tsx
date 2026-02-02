/**
 * SlideEditorToolbar Component
 *
 * Rich toolbar for slide editing with formatting, layouts, and themes
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator
} from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Type,
  Palette,
  Layout,
  ChevronDown
} from 'lucide-react'

export interface SlideEditorToolbarProps {
  onFormatBold?: () => void
  onFormatItalic?: () => void
  onFormatUnderline?: () => void
  onAlignLeft?: () => void
  onAlignCenter?: () => void
  onAlignRight?: () => void
  onInsertBulletList?: () => void
  onInsertNumberedList?: () => void
  onInsertImage?: () => void
  onChangeLayout?: (layout: string) => void
  onChangeTheme?: (theme: string) => void
  onChangeFontSize?: (size: string) => void
  'data-testid'?: string
}

const LAYOUTS = [
  { id: 'title', label: 'Title Slide', icon: '📄' },
  { id: 'title-content', label: 'Title & Content', icon: '📋' },
  { id: 'two-column', label: 'Two Columns', icon: '📊' },
  { id: 'content-image', label: 'Content & Image', icon: '🖼️' },
  { id: 'blank', label: 'Blank', icon: '⬜' }
]

const THEMES = [
  { id: 'default', label: 'Default', colors: ['#3b82f6', '#ffffff'] },
  { id: 'dark', label: 'Dark', colors: ['#1e293b', '#f1f5f9'] },
  { id: 'nature', label: 'Nature', colors: ['#16a34a', '#f0fdf4'] },
  { id: 'sunset', label: 'Sunset', colors: ['#ea580c', '#fff7ed'] },
  { id: 'ocean', label: 'Ocean', colors: ['#0ea5e9', '#f0f9ff'] }
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px', '48px', '64px']

export const SlideEditorToolbar: React.FC<SlideEditorToolbarProps> = ({
  onFormatBold,
  onFormatItalic,
  onFormatUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onInsertBulletList,
  onInsertNumberedList,
  onInsertImage,
  onChangeLayout,
  onChangeTheme,
  onChangeFontSize,
  'data-testid': testId = 'slide-editor-toolbar'
}) => {
  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:bg-card gba:flex-wrap"
      data-testid={testId}
    >
      {/* Text Formatting */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onFormatBold} data-testid={`${testId}-bold`}>
          <Bold className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onFormatItalic} data-testid={`${testId}-italic`}>
          <Italic className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onFormatUnderline} data-testid={`${testId}-underline`}>
          <Underline className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Font Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`${testId}-font-size`}>
            <Type className="gba:w-4 gba:h-4 gba:mr-1" />
            <ChevronDown className="gba:w-3 gba:h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {FONT_SIZES.map(size => (
            <DropdownMenuItem key={size} onClick={() => onChangeFontSize?.(size)}>
              <span style={{ fontSize: size }}>{size}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Alignment */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onAlignLeft} data-testid={`${testId}-align-left`}>
          <AlignLeft className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onAlignCenter} data-testid={`${testId}-align-center`}>
          <AlignCenter className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onAlignRight} data-testid={`${testId}-align-right`}>
          <AlignRight className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Lists */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onInsertBulletList} data-testid={`${testId}-bullet-list`}>
          <List className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onInsertNumberedList} data-testid={`${testId}-numbered-list`}>
          <ListOrdered className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Insert Image */}
      <Button variant="ghost" size="sm" onClick={onInsertImage} data-testid={`${testId}-insert-image`}>
        <Image className="gba:w-4 gba:h-4 gba:mr-1" />
        Image
      </Button>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Layout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`${testId}-layout`}>
            <Layout className="gba:w-4 gba:h-4 gba:mr-1" />
            Layout
            <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {LAYOUTS.map(layout => (
            <DropdownMenuItem key={layout.id} onClick={() => onChangeLayout?.(layout.id)}>
              <span className="gba:mr-2">{layout.icon}</span>
              {layout.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`${testId}-theme`}>
            <Palette className="gba:w-4 gba:h-4 gba:mr-1" />
            Theme
            <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {THEMES.map(theme => (
            <DropdownMenuItem key={theme.id} onClick={() => onChangeTheme?.(theme.id)}>
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:flex gba:gap-1">
                  {theme.colors.map(color => (
                    <div
                      key={color}
                      className="gba:w-4 gba:h-4 gba:rounded gba:border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span>{theme.label}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default SlideEditorToolbar
