import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform, getEntityUrl } from '../links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

export interface GenericEntityDisplayProps {
  entity: string
  id: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

const StandardIcon: React.FC = () => (
  <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-muted/40 gba:flex gba:items-center gba:justify-center">
    <svg className="gba:h-6 gba:w-6 gba:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
)

const GenericEntityDisplay: React.FC<GenericEntityDisplayProps> = ({
  entity,
  id,
  accessToken,
  operation,
  textHuman,
  textTitle
}) => {
  const icon = <StandardIcon />
  const operationBadge = getOperationBadge(operation)
  const url = getEntityUrl(entity, id)

  const handleTitleClick = () => {
    if (!url) return
    // Force reload to ensure updated entity content is shown
    navigateTo(url, { forceReload: true })
  }

  const content = textHuman || ''
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid={`entity-display-${entity}`}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            {url ? (
              <button
                type="button"
                className="gba:underline hover:gba:text-primary"
                onClick={handleTitleClick}
                data-testid={`entity-title-link-${entity}`}
              >
                {textTitle || entity.replace(/_/g, ' ')}
              </button>
            ) : (
              <span>{textTitle || entity.replace(/_/g, ' ')}</span>
            )}
          </CardTitle>
        </div>
        {operationBadge && (
          <Badge variant={operationBadge.variant} className="gba:text-xs" data-testid={`entity-operation-${entity}`}>
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

export default GenericEntityDisplay
