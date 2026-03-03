/**
 * Shared constants and ToolbarButton for the document editor ribbon.
 */

import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'

export const FONT_FAMILY_KEYS: Record<string, string> = {
  '': 'editor-font-default',
  'Arial, sans-serif': 'editor-font-arial',
  'Times New Roman, serif': 'editor-font-times',
  'Georgia, serif': 'editor-font-georgia',
  'Verdana, sans-serif': 'editor-font-verdana',
  'Courier New, monospace': 'editor-font-courier',
  'Garamond, serif': 'editor-font-garamond',
  'Trebuchet MS, sans-serif': 'editor-font-trebuchet',
  'Calibri, Candara, Segoe UI, sans-serif': 'editor-font-calibri',
  'Cambria, Georgia, serif': 'editor-font-cambria',
  'Tahoma, Verdana, sans-serif': 'editor-font-tahoma',
  'Comic Sans MS, cursive': 'editor-font-comic-sans',
  'Consolas, Courier New, monospace': 'editor-font-consolas',
  'Palatino Linotype, Palatino, Book Antiqua, serif': 'editor-font-palatino',
  'Century Gothic, CenturyGothic, sans-serif': 'editor-font-century-gothic',
  'Constantia, Georgia, serif': 'editor-font-constantia',
  'Candara, Segoe UI, sans-serif': 'editor-font-candara',
  'Corbel, Candara, sans-serif': 'editor-font-corbel'
}

export const FONT_FAMILIES = [
  { value: '' },
  { value: 'Arial, sans-serif' },
  { value: 'Times New Roman, serif' },
  { value: 'Georgia, serif' },
  { value: 'Verdana, sans-serif' },
  { value: 'Courier New, monospace' },
  { value: 'Garamond, serif' },
  { value: 'Trebuchet MS, sans-serif' },
  { value: 'Calibri, Candara, Segoe UI, sans-serif' },
  { value: 'Cambria, Georgia, serif' },
  { value: 'Tahoma, Verdana, sans-serif' },
  { value: 'Comic Sans MS, cursive' },
  { value: 'Consolas, Courier New, monospace' },
  { value: 'Palatino Linotype, Palatino, Book Antiqua, serif' },
  { value: 'Century Gothic, CenturyGothic, sans-serif' },
  { value: 'Constantia, Georgia, serif' },
  { value: 'Candara, Segoe UI, sans-serif' },
  { value: 'Corbel, Candara, sans-serif' }
]

export const FONT_SIZES = [
  { label: '5', value: '5pt' },
  { label: '5.5', value: '5.5pt' },
  { label: '6.5', value: '6.5pt' },
  { label: '7.5', value: '7.5pt' },
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '10.5', value: '10.5pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '22', value: '22pt' },
  { label: '24', value: '24pt' },
  { label: '26', value: '26pt' },
  { label: '28', value: '28pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
  { label: '72', value: '72pt' }
]

export const HEADING_LEVELS = [
  { label: 'Normal', value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
  { label: 'Heading 4', value: 4 },
  { label: 'Heading 5', value: 5 },
  { label: 'Heading 6', value: 6 }
]

export const LINE_SPACING_OPTIONS = [
  { key: 'single', value: 1 },
  { key: '1-15', value: 1.15 },
  { key: '1-5', value: 1.5 },
  { key: 'double', value: 2 }
]

export const PARAGRAPH_SPACING_EM = '0.5em'

export const COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#B7B7B7',
  '#CCCCCC',
  '#D9D9D9',
  '#EFEFEF',
  '#F3F3F3',
  '#FFFFFF',
  '#980000',
  '#FF0000',
  '#FF9900',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#4A86E8',
  '#0000FF',
  '#9900FF',
  '#FF00FF',
  '#E6B8AF',
  '#F4CCCC',
  '#FCE5CD',
  '#FFF2CC',
  '#D9EAD3',
  '#D0E0E3',
  '#C9DAF8',
  '#CFE2F3',
  '#D9D2E9',
  '#EAD1DC',
  '#DD7E6B',
  '#EA9999',
  '#F9CB9C',
  '#FFE599',
  '#B6D7A8',
  '#A2C4C9',
  '#A4C2F4',
  '#9FC5E8',
  '#B4A7D6',
  '#D5A6BD',
  '#CC4125',
  '#E06666',
  '#F6B26B',
  '#FFD966',
  '#93C47D',
  '#76A5AF',
  '#6D9EEB',
  '#6FA8DC',
  '#8E7CC3',
  '#C27BA0',
  '#A61C00',
  '#CC0000',
  '#E69138',
  '#F1C232',
  '#6AA84F',
  '#45818E',
  '#3C78D8',
  '#3D85C6',
  '#674EA7',
  '#A64D79',
  '#85200C',
  '#990000',
  '#B45F06',
  '#BF9000',
  '#38761D',
  '#134F5C',
  '#1155CC',
  '#0B5394',
  '#351C75',
  '#741B47'
]

export const HIGHLIGHT_COLORS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FF0000', '#0000FF', '#FFA500', '#FFB6C1']

export const ToolbarButton: React.FC<{
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
  children: React.ReactNode
}> = ({ onClick, isActive, disabled, tooltip, children }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="gba:h-8 gba:w-8 gba:p-0"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export function RibbonGroup({
  label,
  children,
  'data-testid': testId
}: Readonly<{
  label: string
  children: React.ReactNode
  'data-testid'?: string
}>) {
  return (
    <div
      className="gba:flex gba:items-center gba:gap-1.5 gba:border-r gba:border-border gba:pr-2 gba:mr-2 gba:last:border-r-0 gba:last:pr-0 gba:last:mr-0"
      data-testid={testId}
    >
      <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">{label}</span>
      <div className="gba:flex gba:items-center gba:gap-0.5">{children}</div>
    </div>
  )
}
