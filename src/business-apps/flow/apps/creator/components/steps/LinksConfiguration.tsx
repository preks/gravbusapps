import React from 'react'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { Link, Trash2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Link types must be uppercase to match API requirements
type LinkType = 'URL' | 'DOCUMENT' | 'IMAGE' | 'FILE'

interface LinksConfigurationProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

interface LinksTriggerProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

interface LinksContentProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

export const LinksTrigger: React.FC<LinksTriggerProps> = ({ step }) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <Link className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('flow.creator.links', 'Links')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {step.links && step.links.length > 0 && (
          <span className="gba:text-xs gba:bg-blue-100 gba:text-blue-800 gba:px-2 gba:py-1 gba:rounded">
            {step.links.length} {step.links.length === 1 ? 'link' : 'links'}
          </span>
        )}
      </div>
    </div>
  )
}

export const LinksContent: React.FC<LinksContentProps> = ({ step, testId, onUpdateStep }) => {
  const links = step.links || []

  const handleAddLink = () => {
    const newLinks = [...links, { id: `link-${Date.now()}`, name: '', url: '', type: 'URL' as LinkType }]
    onUpdateStep({ links: newLinks })
  }

  const handleUpdateLink = (index: number, field: string, value: string) => {
    const newLinks = [...links]
    newLinks[index] = { ...newLinks[index], [field]: value }
    onUpdateStep({ links: newLinks })
  }

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_: any, i: number) => i !== index)
    onUpdateStep({ links: newLinks })
  }

  return (
    <div className="gba:space-y-3 gba:pt-2">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-sm gba:text-gray-600">
          {links.length === 0 ? 'No links added' : `${links.length} link(s) configured`}
        </span>
        <Button variant="outline" size="sm" onClick={handleAddLink} data-testid={`${testId}-add-link`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.addLink', 'Add Link')}
        </Button>
      </div>

      {links.length > 0 &&
        links.map((link: any, index: number) => (
          <div key={link.id || `link-${index}`} className="gba:p-3 gba:border gba:rounded gba:bg-gray-50">
            <div className="gba:flex gba:gap-2 gba:items-center">
              <Input
                value={link.name || ''}
                onChange={e => handleUpdateLink(index, 'name', e.target.value)}
                placeholder="Link name"
                className="gba:flex-1"
                data-testid={`${testId}-link-name-${index}`}
              />
              <Input
                value={link.url || ''}
                onChange={e => handleUpdateLink(index, 'url', e.target.value)}
                placeholder="URL"
                className="gba:flex-[2]"
                data-testid={`${testId}-link-url-${index}`}
              />
              <Select
                value={link.type || 'URL'}
                onValueChange={value => handleUpdateLink(index, 'type', value)}
                data-testid={`${testId}-link-type-${index}`}
              >
                <SelectTrigger className="gba:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="FILE">File</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveLink(index)}
                data-testid={`${testId}-remove-link-${index}`}
              >
                <Trash2 className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </div>
        ))}
    </div>
  )
}

export const LinksConfiguration: React.FC<LinksConfigurationProps> = props => {
  return (
    <>
      <LinksTrigger {...props} />
      <LinksContent {...props} />
    </>
  )
}
