import React from 'react'
import { Card, Tag } from 'antd'
import { PaperclipIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface LinksRendererProps {
  links: any[]
  testId?: string
}

export const LinksRenderer: React.FC<LinksRendererProps> = ({ links, testId = 'links-renderer' }) => {
  if (!links || links.length === 0) {
    return null
  }

  return (
    <Card
      size="small"
      title={
        <div className="gba:flex gba:items-center gba:gap-2">
          <PaperclipIcon />
          <span>{getTranslationFromI18nKeyAndLabel('flow.step.links', 'Links')}</span>
        </div>
      }
      data-testid={`${testId}-links-card`}
    >
      <div className="gba:space-y-2">
        {links.map((link, index) => (
          <div
            key={index}
            className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-gray-50 gba:rounded"
            data-testid={`${testId}-link-${index}`}
          >
            <PaperclipIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm">{link.name || link.url}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
