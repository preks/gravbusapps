import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import { GlassTiltShell } from './GlassTiltShell'

type EntityCardVariant = 'default' | 'decorative'
type EntityCardSize = 'default' | 'compact'
type EntityCardSurface = 'solid' | 'glass'

interface EntityCardProps {
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  status?: string
  statusVariant?: 'default' | 'success' | 'warning' | 'destructive'
  fields?: Array<{ label: string; value: string | number | null | undefined }>
  /**
   * Rich content rendered below the fields grid, separated by a hairline. Use
   * for relationship rows (e.g. a manager person-row with avatar) that read far
   * better than a flat label/value field box.
   */
  footer?: React.ReactNode
  actions?: React.ReactNode
  isLoading?: boolean
  error?: string
  onClick?: () => void
  variant?: EntityCardVariant
  /**
   * `compact` is a denser, lighter-chrome layout for list/rail contexts (e.g.
   * the assistant references rail): smaller padding/avatar, lighter border, and
   * inline label/value pairs instead of large boxed fields — so a card with one
   * or two facts stays small instead of leaving dead space.
   */
  size?: EntityCardSize
  /**
   * `glass` renders the card as a translucent light-blue frosted surface with a
   * subtle cursor-follow 3D tilt (via `GlassTiltShell`) instead of the solid
   * design-system `Card`. Used by the references rail. Text tokens stay the
   * default dark palette for readability on the light-blue surface.
   */
  surface?: EntityCardSurface
  'data-testid'?: string
}

/** Variant-driven style tokens to keep the JSX clean */
const variantStyles = {
  default: {
    card: 'gba:border-2 gba:shadow-lg hover:gba:shadow-xl',
    cardClickable: 'hover:gba:border-primary/50',
    overlay: 'gba:bg-gradient-to-br gba:from-ai/5 gba:to-ai-secondary/5',
    title: 'gba:text-foreground',
    subtitle: 'gba:text-muted-foreground',
    description: 'gba:text-foreground',
    fieldBg: 'gba:bg-muted/30',
    fieldLabel: 'gba:text-muted-foreground',
    fieldValue: 'gba:text-foreground',
    skeleton: 'gba:bg-muted',
    skeletonIcon: 'gba:bg-gradient-to-br gba:from-muted gba:to-muted/50',
    errorCard: 'gba:border-2 gba:border-destructive/30 gba:shadow-lg',
    errorText: 'gba:text-destructive'
  },
  decorative: {
    card: 'gba:bg-card-decorative gba:border-0',
    cardClickable: '',
    overlay: 'gba:bg-decorative-foreground/5',
    title: 'gba:text-decorative-foreground',
    subtitle: 'gba:text-decorative-foreground/70',
    description: 'gba:text-decorative-foreground/80',
    fieldBg: 'gba:bg-decorative-foreground/10',
    fieldLabel: 'gba:text-decorative-foreground/60',
    fieldValue: 'gba:text-decorative-foreground',
    skeleton: 'gba:bg-decorative-foreground/20',
    skeletonIcon: 'gba:bg-decorative-foreground/20',
    errorCard: 'gba:bg-card-decorative gba:border-0',
    errorText: 'gba:text-decorative-foreground'
  }
} as const

export const EntityCard: React.FC<EntityCardProps> = ({
  title,
  subtitle,
  description,
  icon,
  status,
  statusVariant = 'default',
  fields,
  footer,
  actions,
  isLoading,
  error,
  onClick,
  variant = 'default',
  size = 'default',
  surface = 'solid',
  'data-testid': dataTestId
}) => {
  const s = variantStyles[variant]
  const compact = size === 'compact'
  const glass = surface === 'glass'

  // Compact uses a single hairline border + soft shadow instead of the default
  // border-2 / shadow-lg, so rail cards feel light rather than chunky. Glass
  // chrome is provided by GlassTiltShell, so the solid chrome is skipped.
  const cardChrome = compact
    ? `gba:border gba:border-border/60 gba:shadow-sm hover:gba:shadow-md ${variant === 'decorative' ? s.card : ''}`
    : s.card
  const contentPadding = compact ? 'gba:p-3' : 'gba:p-5'

  if (isLoading) {
    const skeleton = (
      <div className="gba:flex gba:items-center gba:gap-3">
        <div
          className={`${compact ? 'gba:h-10 gba:w-10' : 'gba:h-11 gba:w-11'} gba:rounded-full ${s.skeletonIcon} gba:animate-pulse`}
        />
        <div className="gba:flex-1 gba:space-y-2">
          <div className={`gba:h-4 ${s.skeleton} gba:rounded gba:w-3/4 gba:animate-pulse`} />
          <div className={`gba:h-3 ${s.skeleton} gba:rounded gba:w-1/2 gba:animate-pulse`} />
        </div>
      </div>
    )

    if (glass) {
      return (
        <GlassTiltShell onClick={onClick} data-testid={dataTestId}>
          <div className={`${contentPadding} gba:relative`}>{skeleton}</div>
        </GlassTiltShell>
      )
    }

    return (
      <Card
        className={`${cardChrome} ${onClick ? 'gba:cursor-pointer' : ''}`}
        onClick={onClick}
        data-testid={dataTestId}
      >
        <CardContent className={contentPadding}>{skeleton}</CardContent>
      </Card>
    )
  }

  if (error) {
    if (glass) {
      return (
        <GlassTiltShell data-testid={dataTestId}>
          <div className={contentPadding}>
            <p className="gba:text-sm gba:font-medium gba:text-destructive">{error}</p>
          </div>
        </GlassTiltShell>
      )
    }
    return (
      <Card className={s.errorCard} data-testid={dataTestId}>
        <CardContent className="gba:p-5">
          <p className={`gba:text-sm gba:font-medium ${s.errorText}`}>{error}</p>
        </CardContent>
      </Card>
    )
  }

  const body = (
    <div className={`gba:flex ${compact ? 'gba:items-center gba:gap-3' : 'gba:items-start gba:gap-4'}`}>
      {icon && <div className="gba:flex-shrink-0">{icon}</div>}
      <div className="gba:flex-1 gba:min-w-0">
        <div className={`gba:flex gba:items-start gba:justify-between gba:gap-3 ${compact ? '' : 'gba:mb-2'}`}>
          <div className="gba:flex-1 gba:min-w-0">
            <h4
              className={`${compact ? 'gba:text-sm gba:font-semibold' : 'gba:text-base gba:font-bold'} gba:truncate ${s.title}`}
            >
              {title}
            </h4>
            {subtitle && (
              <p className={`${compact ? 'gba:text-xs' : 'gba:text-sm gba:mt-0.5'} gba:truncate ${s.subtitle}`}>
                {subtitle}
              </p>
            )}
          </div>
          {status && (
            <Badge variant={statusVariant} className="gba:text-xs gba:flex-shrink-0">
              {status}
            </Badge>
          )}
        </div>

        {description && (
          <p
            className={`${compact ? 'gba:text-xs gba:mt-1.5' : 'gba:text-sm gba:mt-2'} gba:line-clamp-2 gba:leading-relaxed ${s.description}`}
          >
            {description}
          </p>
        )}

        {fields && fields.length > 0 && compact && (
          <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-x-5 gba:gap-y-2">
            {fields.map((field, idx) => (
              <div key={idx} className="gba:min-w-0">
                <p
                  className={`gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wide gba:leading-tight ${s.fieldLabel}`}
                >
                  {field.label}
                </p>
                <p className={`gba:text-xs gba:font-semibold gba:truncate gba:leading-tight ${s.fieldValue}`}>
                  {field.value !== null && field.value !== undefined ? field.value : '-'}
                </p>
              </div>
            ))}
          </div>
        )}

        {fields && fields.length > 0 && !compact && (
          <div className="gba:mt-4 gba:grid gba:grid-cols-2 gba:gap-3">
            {fields.map((field, idx) => (
              <div key={idx} className={`gba:min-w-0 gba:p-2 gba:rounded-lg ${s.fieldBg}`}>
                <p className={`gba:text-xs gba:font-medium gba:mb-0.5 ${s.fieldLabel}`}>{field.label}</p>
                <p className={`gba:text-sm gba:truncate gba:font-semibold ${s.fieldValue}`}>
                  {field.value !== null && field.value !== undefined ? field.value : '-'}
                </p>
              </div>
            ))}
          </div>
        )}

        {footer && (
          <div
            className={`${compact ? 'gba:mt-2.5 gba:pt-2.5' : 'gba:mt-4 gba:pt-4'} gba:border-t gba:border-border/60`}
          >
            {footer}
          </div>
        )}

        {actions && <div className={compact ? 'gba:mt-3' : 'gba:mt-4'}>{actions}</div>}
      </div>
    </div>
  )

  if (glass) {
    return (
      <GlassTiltShell onClick={onClick} data-testid={dataTestId}>
        <div className={`${contentPadding} gba:relative`}>{body}</div>
      </GlassTiltShell>
    )
  }

  return (
    <Card
      className={`gba:group gba:transition-all gba:relative gba:overflow-hidden ${cardChrome} ${onClick ? `gba:cursor-pointer ${s.cardClickable}` : ''}`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      <div
        className={`gba:absolute gba:inset-0 ${s.overlay} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:pointer-events-none`}
      />

      <CardContent className={`${contentPadding} gba:relative`}>{body}</CardContent>
    </Card>
  )
}

export default EntityCard
