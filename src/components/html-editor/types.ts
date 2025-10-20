export interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  minHeight?: string
  maxHeight?: string
  prefixDataTestId?: string
  showVariableHelper?: boolean
  availableVariables?: TemplateVariable[]
}

export interface TemplateVariable {
  key: string
  label: string
  description?: string
  example?: string
}

export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

interface BaseElement {
  id: string
  colSpan?: ColSpan
  rowIndex?: number
}

export interface HeadingElement extends BaseElement {
  type: 'heading'
  content: string
  config?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6
    alignment?: 'left' | 'center' | 'right'
    weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  }
}

export interface ParagraphElement extends BaseElement {
  type: 'paragraph'
  content: string
  config?: {
    alignment?: 'left' | 'center' | 'right'
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  }
}

export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  config?: {
    alignment?: 'left' | 'center' | 'right'
    weight?: 'normal' | 'medium' | 'semibold' | 'bold'
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  }
}

export interface CardElement extends BaseElement {
  type: 'card'
  content: string
  config?: {
    variant?: 'default' | 'outlined' | 'elevated'
    padding?: 'sm' | 'md' | 'lg'
  }
}

export interface TableElement extends BaseElement {
  type: 'table'
  content: string
  config?: {
    columns?: Array<{ key: string; label: string }>
    rows?: Array<Record<string, string>>
  }
}

export interface ListItem {
  id: string
  text: string
}

export interface ListElement extends BaseElement {
  type: 'list'
  content: string
  config?: {
    listType?: 'ul' | 'ol'
    items?: ListItem[]
  }
}

export interface DividerElement extends BaseElement {
  type: 'divider'
}

export interface SpacerElement extends BaseElement {
  type: 'spacer'
  config?: {
    height?: 'sm' | 'md' | 'lg' | 'xl'
  }
}

export interface ImageElement extends BaseElement {
  type: 'image'
  config: {
    src: string
    alt?: string
    width?: string
  }
}

export interface ButtonElement extends BaseElement {
  type: 'button'
  label: string
  config?: {
    buttonVariant?: 'default' | 'outline' | 'ghost'
    buttonSize?: 'sm' | 'md' | 'lg'
    href?: string
  }
}

export type EditorElement =
  | HeadingElement
  | ParagraphElement
  | TextElement
  | CardElement
  | TableElement
  | ListElement
  | DividerElement
  | SpacerElement
  | ImageElement
  | ButtonElement

export interface DragItem {
  id: string
  index: number
  type: string
}
