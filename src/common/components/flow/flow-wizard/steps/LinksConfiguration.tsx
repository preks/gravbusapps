import React from 'react'
import { Button, Input, Label, Select } from '@newwork/nw-design-system'
import { Plus, Trash2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface LinksConfigurationProps {
  step: any
  stepIndex: number
  testId: string
  onUpdateStep: (updates: any) => void
}

export const LinksConfiguration: React.FC<LinksConfigurationProps> = ({ step, stepIndex, testId, onUpdateStep }) => {
  const linkOptions = [
    { value: 'START', label: getTranslationFromI18nKeyAndLabel('flow.creator.start', 'Start') },
    { value: 'END', label: getTranslationFromI18nKeyAndLabel('flow.creator.end', 'End') },
    { value: 'PREVIOUS', label: getTranslationFromI18nKeyAndLabel('flow.creator.previous', 'Previous') },
    { value: 'NEXT', label: getTranslationFromI18nKeyAndLabel('flow.creator.next', 'Next') },
    { value: 'CUSTOM', label: getTranslationFromI18nKeyAndLabel('flow.creator.custom', 'Custom') }
  ]

  const handleAddLink = () => {
    const newLinks = [...(step.links || []), { label: '', target: '', url: '' }]
    onUpdateStep({ links: newLinks })
  }

  const handleRemoveLink = (linkIndex: number) => {
    const newLinks = step.links.filter((_: any, index: number) => index !== linkIndex)
    onUpdateStep({ links: newLinks })
  }

  const handleUpdateLink = (linkIndex: number, field: string, value: string) => {
    const newLinks = [...(step.links || [])]
    newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value }
    onUpdateStep({ links: newLinks })
  }

  return (
    <div className="gba:space-y-4 gba:pt-2">
      <div className="gba:flex gba:justify-between gba:items-center">
        <Label data-testid={`${testId}-links-label`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.links', 'Links')}:
        </Label>
        <Button variant="secondary" onClick={handleAddLink} data-testid={`${testId}-add-link-button`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          {getTranslationFromI18nKeyAndLabel('flow.creator.addLink', 'Add Link')}
        </Button>
      </div>

      {(!step.links || step.links.length === 0) && (
        <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:border gba:border-dashed gba:rounded">
          {getTranslationFromI18nKeyAndLabel('flow.creator.noLinksAdded', 'No links added yet')}
        </div>
      )}

      {(step.links || []).map((link: any, linkIndex: number) => (
        <div
          key={linkIndex}
          className="gba:border gba:rounded gba:p-4 gba:space-y-3"
          data-testid={`${testId}-link-${linkIndex}`}
        >
          <div className="gba:flex gba:justify-between gba:items-center">
            <h5 className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('flow.creator.linkNumber', 'Link')} {linkIndex + 1}
            </h5>
            <Button
              variant="secondary"
              onClick={() => handleRemoveLink(linkIndex)}
              data-testid={`${testId}-remove-link-button-${linkIndex}`}
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor={`step-${stepIndex}-link-${linkIndex}-label`}>
              {getTranslationFromI18nKeyAndLabel('flow.creator.label', 'Label')}:
            </Label>
            <Input
              id={`step-${stepIndex}-link-${linkIndex}-label`}
              value={link.label || ''}
              onChange={event => handleUpdateLink(linkIndex, 'label', event.target.value)}
              data-testid={`${testId}-link-label-${linkIndex}`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor={`step-${stepIndex}-link-${linkIndex}-target`}>
              {getTranslationFromI18nKeyAndLabel('flow.creator.target', 'Target')}:
            </Label>
            <Select
              id={`step-${stepIndex}-link-${linkIndex}-target`}
              value={link.target || ''}
              onChange={event => handleUpdateLink(linkIndex, 'target', event.target.value)}
              data-testid={`${testId}-link-target-${linkIndex}`}
            >
              <option value="">
                {getTranslationFromI18nKeyAndLabel('flow.creator.selectTarget', 'Select target')}
              </option>
              {linkOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {link.target === 'CUSTOM' && (
            <div className="gba:space-y-2">
              <Label htmlFor={`step-${stepIndex}-link-${linkIndex}-url`}>
                {getTranslationFromI18nKeyAndLabel('flow.creator.url', 'URL')}:
              </Label>
              <Input
                id={`step-${stepIndex}-link-${linkIndex}-url`}
                value={link.url || ''}
                onChange={event => handleUpdateLink(linkIndex, 'url', event.target.value)}
                placeholder="https://example.com"
                data-testid={`${testId}-link-url-${linkIndex}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export const LinksContent = LinksConfiguration
