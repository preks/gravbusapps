import React, { useState } from 'react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@newwork/nw-design-system'

export interface FormAccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

export interface FormAccordionProps {
  items: FormAccordionItem[]
  className?: string
  'data-testid'?: string
}

/**
 * FormAccordion - Centralized accordion component for form layouts
 *
 * Provides consistent styling and behavior across all form layouts:
 * - Transparent backgrounds
 * - Multiple items can be open simultaneously
 * - forceMount enabled for catalog selects compatibility
 * - Proper animation support
 */
export const FormAccordion: React.FC<FormAccordionProps> = ({ items, className, 'data-testid': dataTestId }) => {
  const [accordionValue, setAccordionValue] = useState<string[]>([])

  return (
    <Accordion
      type="multiple"
      value={accordionValue}
      onValueChange={(value: string | string[]) => setAccordionValue(Array.isArray(value) ? value : [value])}
      className={className}
      data-testid={dataTestId}
    >
      {items.map(item => (
        <AccordionItem key={item.id} value={item.id} className="gba:bg-transparent gba:mb-2">
          <AccordionTrigger className="gba:[&&]:bg-transparent gba:text-lg gba:text-bold gba:underline gba:px-0">
            {item.title}
          </AccordionTrigger>
          <AccordionContent
            forceMount={true}
            className="gba:[&&]:bg-transparent gba:[&>div]:bg-transparent gba:pt-2 gba:px-0 gba:[&>div]:px-0"
          >
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
