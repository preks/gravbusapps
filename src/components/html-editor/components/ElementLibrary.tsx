import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import {
  TextHOneIcon,
  TextAlignLeftIcon,
  SquareIcon,
  ListBulletsIcon,
  LinkIcon,
  ImageIcon,
  MinusIcon,
  ArrowsOutLineVerticalIcon
} from '@phosphor-icons/react'

interface ElementType {
  type: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface ElementLibraryProps {
  onSelect: (type: string) => void
  disabled?: boolean
  prefixDataTestId?: string
  isDragSource?: boolean
}

const ELEMENT_TYPES: ElementType[] = [
  {
    type: 'heading',
    label: 'Heading',
    description: 'H1-H6 titles',
    icon: TextHOneIcon
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Text content',
    icon: TextAlignLeftIcon
  },
  {
    type: 'card',
    label: 'Card',
    description: 'Container box',
    icon: SquareIcon
  },
  {
    type: 'list',
    label: 'List',
    description: 'Bullet/numbered',
    icon: ListBulletsIcon
  },
  {
    type: 'button',
    label: 'Button',
    description: 'Link button',
    icon: LinkIcon
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Picture/photo',
    icon: ImageIcon
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal line',
    icon: MinusIcon
  },
  {
    type: 'spacer',
    label: 'Spacer',
    description: 'Empty space',
    icon: ArrowsOutLineVerticalIcon
  }
]

export const ElementLibrary: React.FC<ElementLibraryProps> = ({
  onSelect,
  disabled,
  prefixDataTestId = 'element-library',
  isDragSource = true
}) => {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('elementType', type)
  }

  return (
    <Card data-testid={prefixDataTestId}>
      <CardHeader>
        <CardTitle className="gba:text-base">HTML Elements</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Click or drag to canvas</p>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {ELEMENT_TYPES.map(element => (
          <button
            key={element.type}
            onClick={() => onSelect(element.type)}
            disabled={disabled}
            draggable={isDragSource && !disabled}
            onDragStart={e => isDragSource && handleDragStart(e, element.type)}
            className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-md gba:border gba:border-input gba:bg-background hover:gba:bg-accent hover:gba:border-primary gba:transition-all gba:text-left disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:cursor-grab active:gba:cursor-grabbing"
            data-testid={`${prefixDataTestId}-${element.type}`}
          >
            <div className="gba:flex-shrink-0 gba:w-8 gba:h-8 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-primary/10">
              <element.icon className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:font-medium gba:text-sm gba:text-foreground">{element.label}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{element.description}</div>
            </div>
          </button>
        ))}

        <div className="gba:pt-3 gba:mt-3 gba:border-t gba:border-input">
          <p className="gba:text-xs gba:text-muted-foreground">Click any element to add it to your template</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ElementLibrary
