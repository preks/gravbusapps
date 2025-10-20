import React from 'react'
import { EditorElement, ImageElement, SpacerElement } from '../../types'
import { HeadingForm } from './HeadingForm'
import { ParagraphTextForm } from './ParagraphTextForm'
import { ButtonForm } from './ButtonForm'
import { ListForm } from './ListForm'
import { ImageForm } from './ImageForm'
import { CardForm } from './CardForm'
import { SpacerForm } from './SpacerForm'

interface ElementFormMapperProps {
  type: string
  formData: Partial<EditorElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const ElementFormMapper: React.FC<ElementFormMapperProps> = ({ type, formData, onChange, prefixDataTestId }) => {
  switch (type) {
    case 'heading':
      return <HeadingForm formData={formData} onChange={onChange} prefixDataTestId={prefixDataTestId} />
    case 'paragraph':
    case 'text':
      return (
        <ParagraphTextForm formData={formData as any} onChange={onChange as any} prefixDataTestId={prefixDataTestId} />
      )
    case 'card':
      return <CardForm formData={formData} onChange={onChange} prefixDataTestId={prefixDataTestId} />
    case 'list':
      return <ListForm formData={formData as any} onChange={onChange} prefixDataTestId={prefixDataTestId} />
    case 'button':
      return <ButtonForm formData={formData} onChange={onChange} prefixDataTestId={prefixDataTestId} />
    case 'image':
      return (
        <ImageForm
          formData={formData as Partial<ImageElement>}
          onChange={onChange}
          prefixDataTestId={prefixDataTestId}
        />
      )
    case 'spacer':
      return (
        <SpacerForm
          formData={formData as Partial<SpacerElement>}
          onChange={onChange}
          prefixDataTestId={prefixDataTestId}
        />
      )
    case 'divider':
      return (
        <p data-testid="divider-form-message" className="gba:text-sm gba:text-muted-foreground">
          Horizontal divider line will be added.
        </p>
      )
    default:
      return null
  }
}
