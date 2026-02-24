import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'

export interface PreviewTemplateItem {
  id: string
  label: string
}

export interface PreviewTemplateProps {
  items: PreviewTemplateItem[]
  children: (selectedId: string) => React.ReactNode
  className?: string
  'data-testid'?: string
}

export const PreviewTemplate: React.FC<PreviewTemplateProps> = ({
  items,
  children,
  className,
  'data-testid': testId
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => items[0]?.id ?? '')
  const activeId = items.some(i => i.id === selectedId) ? selectedId : (items[0]?.id ?? '')

  return (
    <div className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 ${className ?? ''}`} data-testid={testId}>
      {items.length > 1 && (
        <div className="gba:flex gba:gap-1 gba:mb-4 gba:shrink-0 gba:flex-wrap">
          {items.map(item => (
            <Button
              key={item.id}
              variant={item.id === activeId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedId(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {children(activeId)}
    </div>
  )
}
