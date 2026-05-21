import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Sparkles, CircleCheck } from 'lucide-react'
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
  /** Normalized entity link URL from backend with optional alternateId fragment */
  link?: string
  variant?: 'default' | 'decorative'
  /** When set, replaces the default Sparkles / bolt icon */
  icon?: React.ReactNode
  /** When set (decorative variant), replaces the uppercase line above the title */
  subtitle?: string
  /** When set, title navigates via this handler instead of getEntityUrl */
  onTitleClick?: () => void
}

/** Strip emoji characters from text for a cleaner presentation */
const stripEmojis = (text: string): string =>
  text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/^\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')

const variantStyles = {
  default: {
    card: 'gba:border-2 gba:shadow-lg',
    icon: 'gba:bg-muted/40',
    iconStroke: 'gba:text-foreground',
    title: 'gba:text-foreground',
    titleHover: 'hover:gba:text-primary',
    prose: 'gba:text-foreground'
  },
  decorative: {
    card: 'gba:bg-card-decorative gba:border-0',
    icon: 'gba:bg-decorative-foreground/15',
    iconStroke: 'gba:text-decorative-foreground',
    title: 'gba:text-decorative-foreground',
    titleHover: 'hover:gba:text-decorative-foreground/80',
    prose: 'gba:text-decorative-foreground/85'
  }
} as const

const GenericEntityDisplay: React.FC<GenericEntityDisplayProps> = ({
  entity,
  id,
  accessToken,
  operation,
  textHuman,
  textTitle,
  link,
  variant = 'default',
  icon: customIcon,
  subtitle: customSubtitle,
  onTitleClick: customOnTitleClick
}) => {
  const s = variantStyles[variant]
  const isDecorative = variant === 'decorative'
  const operationBadge = getOperationBadge(operation)
  const url = getEntityUrl(entity, id, link)

  const handleDefaultTitleClick = () => {
    if (!url) return
    navigateTo(url, { forceReload: true })
  }

  const rawContent = textHuman || ''
  const content = isDecorative ? stripEmojis(rawContent) : rawContent
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  const defaultIcon = isDecorative ? (
    <div className="gba:h-11 gba:w-11 gba:rounded-2xl gba:bg-decorative-foreground/10 gba:ring-1 gba:ring-decorative-foreground/20 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
      <Sparkles className="gba:w-5 gba:h-5 gba:text-decorative-foreground" strokeWidth={1.5} />
    </div>
  ) : (
    <div className={`gba:h-12 gba:w-12 gba:rounded-full ${s.icon} gba:flex gba:items-center gba:justify-center`}>
      <svg className={`gba:h-6 gba:w-6 ${s.iconStroke}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )

  const iconElement = customIcon ?? defaultIcon

  const displayTitle = textTitle || entity.replace(/_/g, ' ')
  const subtitleLine = isDecorative ? (customSubtitle ?? entity.replace(/_/g, ' ')) : null

  const titleIsButton = Boolean(customOnTitleClick || url)

  return (
    <Card className={s.card} data-testid={`entity-display-${entity}`}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3">
        {iconElement}
        <div className="gba:min-w-0 gba:flex-1">
          {isDecorative && subtitleLine !== null && (
            <p className="gba:text-xs gba:mb-0.5 gba:text-decorative-foreground/50 gba:font-medium gba:tracking-wide gba:uppercase">
              {subtitleLine}
            </p>
          )}
          <CardTitle
            className={`gba:font-bold gba:tracking-tight ${isDecorative ? 'gba:text-lg' : 'gba:text-base'} ${s.title}`}
          >
            {titleIsButton ? (
              <button
                type="button"
                className={`gba:text-left gba:transition-opacity ${isDecorative ? '' : 'gba:underline'} ${s.titleHover}`}
                onClick={customOnTitleClick ?? handleDefaultTitleClick}
                data-testid={`entity-title-link-${entity}`}
              >
                {displayTitle}
              </button>
            ) : (
              <span>{displayTitle}</span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="gba:p-5">
        <div className={`gba:prose gba:prose-sm gba:max-w-none ${s.prose}`}>
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
        {operationBadge && (
          <div className="gba:flex gba:justify-end gba:mt-4">
            {isDecorative ? (
              <span
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-decorative-foreground/10 gba:ring-1 gba:ring-decorative-foreground/20 gba:text-xs gba:font-medium gba:text-decorative-foreground/80"
                data-testid={`entity-operation-${entity}`}
              >
                <CircleCheck className="gba:w-3 gba:h-3" strokeWidth={2} />
                {operationBadge.text}
              </span>
            ) : (
              <span
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-muted gba:text-xs gba:font-medium gba:text-muted-foreground"
                data-testid={`entity-operation-${entity}`}
              >
                <CircleCheck className="gba:w-3 gba:h-3" strokeWidth={2} />
                {operationBadge.text}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GenericEntityDisplay
