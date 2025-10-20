import React from 'react'
import { Button, Separator } from '@newwork/nw-design-system'
import {
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextHThreeIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  CodeIcon
} from '@phosphor-icons/react'

interface ToolbarProps {
  onAction: (action: string, value?: string) => void
  disabled?: boolean
  prefixDataTestId?: string
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAction, disabled, prefixDataTestId = 'html-editor-toolbar' }) => {
  const toolbarGroups = [
    {
      name: 'text-style',
      items: [
        { icon: TextBIcon, action: 'bold', title: 'Bold (Ctrl+B)' },
        { icon: TextItalicIcon, action: 'italic', title: 'Italic (Ctrl+I)' },
        { icon: TextUnderlineIcon, action: 'underline', title: 'Underline (Ctrl+U)' }
      ]
    },
    {
      name: 'headings',
      items: [
        { icon: TextHOneIcon, action: 'heading', value: '1', title: 'Heading 1' },
        { icon: TextHTwoIcon, action: 'heading', value: '2', title: 'Heading 2' },
        { icon: TextHThreeIcon, action: 'heading', value: '3', title: 'Heading 3' }
      ]
    },
    {
      name: 'lists',
      items: [
        { icon: ListBulletsIcon, action: 'ul', title: 'Bullet List' },
        { icon: ListNumbersIcon, action: 'ol', title: 'Numbered List' }
      ]
    },
    {
      name: 'alignment',
      items: [
        { icon: TextAlignLeftIcon, action: 'align', value: 'left', title: 'Align Left' },
        { icon: TextAlignCenterIcon, action: 'align', value: 'center', title: 'Align Center' },
        { icon: TextAlignRightIcon, action: 'align', value: 'right', title: 'Align Right' }
      ]
    },
    {
      name: 'insert',
      items: [
        { icon: LinkIcon, action: 'link', title: 'Insert Link' },
        { icon: ImageIcon, action: 'image', title: 'Insert Image' },
        { icon: TableIcon, action: 'table', title: 'Insert Table' },
        { icon: CodeIcon, action: 'code', title: 'Code Block' }
      ]
    }
  ]

  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:p-2 gba:border gba:border-b gba:border-input gba:bg-muted/30"
      data-testid={prefixDataTestId}
    >
      {toolbarGroups.map((group, groupIndex) => (
        <React.Fragment key={group.name}>
          {groupIndex > 0 && <Separator orientation="vertical" className="gba:h-6" />}
          <div className="gba:flex gba:gap-1">
            {group.items.map(item => (
              <Button
                key={item.action + ('value' in item ? item.value : '')}
                variant="ghost"
                size="iconSm"
                onClick={() => onAction(item.action, 'value' in item ? item.value : undefined)}
                disabled={disabled}
                title={item.title}
                data-testid={`${prefixDataTestId}-${item.action}${'value' in item && item.value ? `-${item.value}` : ''}`}
              >
                <item.icon className="gba:w-4 gba:h-4" />
              </Button>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

export default Toolbar
