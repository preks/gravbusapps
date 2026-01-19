import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { FloppyDiskIcon, XIcon } from '@phosphor-icons/react'
import { EditorElement } from '../types'
import { DEFAULT_ELEMENTS } from '../templates'
import { ElementFormMapper } from './element-forms/ElementFormMapper'
import { createElementFromFormData } from '../utils'

interface ElementEditorProps {
  element: EditorElement | null
  isOpen: boolean
  onSave: (element: EditorElement) => void
  onClose: () => void
  prefixDataTestId?: string
}

export const ElementEditor: React.FC<ElementEditorProps> = ({
  element,
  isOpen,
  onSave,
  onClose,
  prefixDataTestId = 'element-editor'
}) => {
  const [formData, setFormData] = useState<Partial<EditorElement>>({
    type: 'paragraph',
    content: '',
    config: {}
  })

  useEffect(() => {
    if (element) {
      // For button elements, map label to content for form handling
      if (element.type === 'button') {
        setFormData({
          ...element,
          content: element.label
        } as any)
      } else {
        setFormData(element)
      }
    } else {
      // Use default element template
      setFormData({
        type: 'paragraph',
        ...DEFAULT_ELEMENTS.paragraph
      } as Partial<EditorElement>)
    }
  }, [element, isOpen])

  const handleTypeChange = (newType: string) => {
    // Load default template for new type
    const defaultElement = DEFAULT_ELEMENTS[newType as keyof typeof DEFAULT_ELEMENTS]
    const newFormData = {
      ...formData,
      type: newType,
      ...defaultElement
    }

    // For button elements, map label to content for form handling
    if (newType === 'button' && 'label' in defaultElement) {
      ;(newFormData as any).content = (defaultElement as any).label
    }

    setFormData(newFormData as any)
  }

  const handleSave = () => {
    const elementToSave = createElementFromFormData(formData, element?.id)
    onSave(elementToSave)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl" data-testid={prefixDataTestId}>
        <DialogHeader>
          <DialogTitle>{element ? 'Edit Element' : 'Add Element'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4 gba:max-h-[60vh] gba:overflow-y-auto">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>Element Type</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heading">Heading</SelectItem>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="button">Button</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="divider">Divider</SelectItem>
                  <SelectItem value="spacer">Spacer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label>Column Span (1-12)</Label>
              <Select
                value={String(formData.colSpan || 12)}
                onValueChange={value => setFormData({ ...formData, colSpan: parseInt(value) as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <SelectItem key={num} value={String(num)}>
                      {num} Column{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Form Fields Based on Element Type */}
          <ElementFormMapper
            type={formData.type || 'paragraph'}
            formData={formData}
            onChange={setFormData}
            prefixDataTestId={prefixDataTestId}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-testid={`${prefixDataTestId}-cancel`}>
            <XIcon className="gba:mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${prefixDataTestId}-save`}>
            <FloppyDiskIcon className="gba:mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ElementEditor
