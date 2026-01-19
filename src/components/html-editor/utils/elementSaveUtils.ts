import { EditorElement } from '../types'

/**
 * Generate a unique, non-deterministic ID for an element
 */
const generateElementId = (): string => {
  // Prefer crypto.randomUUID() where available (modern browsers, Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `element-${crypto.randomUUID()}`
  }
  // Fallback: timestamp + random
  return `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Type guard to check if formData has a content property
 */
const hasContent = (formData: Partial<EditorElement>): formData is Partial<EditorElement> & { content: string } => {
  return typeof formData === 'object' && 'content' in formData && typeof formData.content === 'string'
}

/**
 * Create an EditorElement from form data
 */
export const createElementFromFormData = (formData: Partial<EditorElement>, elementId?: string): EditorElement => {
  const id = elementId || generateElementId()
  const colSpan = formData.colSpan || 12
  const rowIndex = formData.rowIndex

  switch (formData.type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'paragraph':
      return {
        id,
        type: 'paragraph',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'text':
      return {
        id,
        type: 'text',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'card':
      return {
        id,
        type: 'card',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'table':
      return {
        id,
        type: 'table',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'list':
      return {
        id,
        type: 'list',
        content: formData.content || '',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'divider':
      return {
        id,
        type: 'divider',
        colSpan,
        rowIndex
      }
    case 'spacer':
      return {
        id,
        type: 'spacer',
        colSpan,
        rowIndex,
        config: formData.config
      }
    case 'image':
      return {
        id,
        type: 'image',
        colSpan,
        rowIndex,
        config: {
          src: formData.config?.src || '',
          alt: formData.config?.alt,
          width: formData.config?.width
        }
      }
    case 'button':
      return {
        id,
        type: 'button',
        label: hasContent(formData) ? formData.content : 'Button',
        colSpan,
        rowIndex,
        config: formData.config
      }
    default:
      // Fallback to paragraph
      return {
        id,
        type: 'paragraph',
        content: '',
        colSpan,
        rowIndex
      }
  }
}
