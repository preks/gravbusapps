import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'
import { getOperationBadge } from './utils/displayUtils'
import { navigateToEntity, getEntityDefaultTitle } from './utils/entityNavigation'
import { getEntityIcon, getDefaultIcon } from './utils/entityIcons'

export interface MarkdownEntityDisplayProps {
  entityType: 'lead' | 'contact' | 'opportunity' | 'account' | 'company'
  entityId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

/**
 * Unified markdown-based entity display component
 * Replaces LeadDisplay, ContactDisplay, OpportunityDisplay, and CompanyDisplay
 */
export const MarkdownEntityDisplay: React.FC<MarkdownEntityDisplayProps> = ({
  entityType,
  entityId,
  accessToken,
  operation,
  textHuman,
  textTitle
}) => {
  const iconConfig = getEntityIcon(entityType)
  const icon = iconConfig?.icon || getDefaultIcon()
  const operationBadge = getOperationBadge(operation)
  const defaultTitle = getEntityDefaultTitle(entityType)
  const displayTitle = textTitle || defaultTitle

  const handleTitleClick = () => {
    navigateToEntity(entityType, entityId)
  }

  const content = textHuman || ''
  // Convert single newlines to hard line breaks in markdown
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid={`${entityType}-display-markdown`}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid={`${entityType}-title-link`}
            >
              {displayTitle}
            </button>
          </CardTitle>
        </div>
        {operationBadge && (
          <Badge variant={operationBadge.variant} className="gba:text-xs" data-testid={`${entityType}-operation-badge`}>
            {operationBadge.text}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="gba:p-5">
        <div className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ul: ({ ...props }) => <ul className="gba:list-disc gba:ml-6" {...props} />,
              ol: ({ ...props }) => <ol className="gba:list-decimal gba:ml-6" {...props} />,
              a: ({ href, children, ...props }) => (
                <EntityLink href={href} accessToken={accessToken} {...props}>
                  {children}
                </EntityLink>
              )
            }}
            urlTransform={markdownUrlTransform}
          >
            {contentWithLineBreaks}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

export default MarkdownEntityDisplay
