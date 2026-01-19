import { useState } from 'react'
import { EditorElement, TemplateVariable } from '../types'
import { elementsToHtml, toColSpan } from '../utils/htmlParser'
import { DEFAULT_ELEMENTS } from '../templates'

interface UseElementHandlersProps {
  elements: EditorElement[]
  setElements: (elements: EditorElement[]) => void
  onHtmlChange: (html: string) => void
  activeTab: 'visual' | 'code' | 'preview'
  codeValue: string
}

export const useElementHandlers = ({
  elements,
  setElements,
  onHtmlChange,
  activeTab,
  codeValue
}: UseElementHandlersProps) => {
  const [editingElement, setEditingElement] = useState<EditorElement | null>(null)
  const [isElementEditorOpen, setIsElementEditorOpen] = useState(false)

  const updateElementsAndHtml = (newElements: EditorElement[]) => {
    setElements(newElements)
    const newHtml = elementsToHtml(newElements)
    onHtmlChange(newHtml)
  }

  const handleAddElement = (elementType?: string, targetRowIndex?: number) => {
    if (elementType && DEFAULT_ELEMENTS[elementType as keyof typeof DEFAULT_ELEMENTS]) {
      // Quick add with default template
      const defaultElement = DEFAULT_ELEMENTS[elementType as keyof typeof DEFAULT_ELEMENTS]
      const newElement = {
        ...defaultElement,
        id: `element-${Date.now()}-${Math.random()}`,
        rowIndex: targetRowIndex
      } as EditorElement
      const newElements = [...elements, newElement]
      updateElementsAndHtml(newElements)
    } else {
      // Open editor for manual configuration
      setEditingElement(null)
      setIsElementEditorOpen(true)
    }
  }

  const handleEditElement = (element: EditorElement) => {
    setEditingElement(element)
    setIsElementEditorOpen(true)
  }

  const handleSaveElement = (element: EditorElement) => {
    let newElements: EditorElement[]

    if (editingElement) {
      // Update existing
      newElements = elements.map(el => (el.id === element.id ? element : el))
    } else {
      // Add new
      newElements = [...elements, element]
    }

    updateElementsAndHtml(newElements)
    setIsElementEditorOpen(false)
  }

  const handleDeleteElement = (id: string) => {
    const newElements = elements.filter(el => el.id !== id)
    updateElementsAndHtml(newElements)
  }

  const handleResizeElement = (id: string, newColSpan: number) => {
    const newElements = elements.map(el => (el.id === id ? { ...el, colSpan: toColSpan(newColSpan) } : el))
    updateElementsAndHtml(newElements)
  }

  const handleToolbarAction = (action: string, value?: string) => {
    // Toolbar actions for quick formatting
    let newHtml = codeValue

    switch (action) {
      case 'bold':
        newHtml += '<strong>Bold text</strong>'
        break
      case 'italic':
        newHtml += '<em>Italic text</em>'
        break
      case 'underline':
        newHtml += '<u>Underlined text</u>'
        break
      case 'heading': {
        // Validate heading level: must be integer 1-6
        const level = parseInt(value || '1', 10)
        if (isNaN(level) || level < 1 || level > 6) {
          console.warn(`Invalid heading level: ${value}. Skipping.`)
          return
        }
        newHtml += `<h${level}>Heading ${level}</h${level}>`
        break
      }
      case 'ul':
        newHtml += '<ul><li>List item</li></ul>'
        break
      case 'ol':
        newHtml += '<ol><li>List item</li></ol>'
        break
      case 'link':
        newHtml += '<a href="https://example.com">Link text</a>'
        break
      case 'image':
        newHtml += '<img src="https://via.placeholder.com/150" alt="Image" />'
        break
      case 'table':
        newHtml += '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>'
        break
      case 'code':
        newHtml += '<pre><code>Code block</code></pre>'
        break
    }

    onHtmlChange(newHtml)
  }

  const handleInsertVariable = (variable: TemplateVariable) => {
    const variableText = `{{${variable.key}}}`

    if (activeTab === 'visual') {
      // Insert as a text element with the variable
      const newElement: EditorElement = {
        id: `element-${Date.now()}-${Math.random()}`,
        type: 'text',
        content: variableText,
        config: { weight: 'semibold', size: 'sm' }
      }
      const newElements = [...elements, newElement]
      updateElementsAndHtml(newElements)
    } else {
      // Insert directly in code
      onHtmlChange(codeValue + variableText)
    }
  }

  return {
    editingElement,
    isElementEditorOpen,
    setIsElementEditorOpen,
    handleAddElement,
    handleEditElement,
    handleSaveElement,
    handleDeleteElement,
    handleResizeElement,
    handleToolbarAction,
    handleInsertVariable
  }
}
