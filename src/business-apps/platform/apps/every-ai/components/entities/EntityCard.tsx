import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'

type EntityCardVariant = 'default' | 'decorative'

interface EntityCardProps {
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  status?: string
  statusVariant?: 'default' | 'success' | 'warning' | 'destructive'
  fields?: Array<{ label: string; value: string | number | null | undefined }>
  actions?: React.ReactNode
  isLoading?: boolean
  error?: string
  onClick?: () => void
  variant?: EntityCardVariant
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
  actions,
  isLoading,
  error,
  onClick,
  variant = 'default',
  'data-testid': dataTestId
}) => {
  const s = variantStyles[variant]

  if (isLoading) {
    return (
      <Card className={`${s.card} ${onClick ? 'gba:cursor-pointer' : ''}`} onClick={onClick} data-testid={dataTestId}>
        <CardContent className="gba:p-5">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className={`gba:h-11 gba:w-11 gba:rounded-xl ${s.skeletonIcon} gba:animate-pulse`} />
            <div className="gba:flex-1 gba:space-y-3">
              <div className={`gba:h-5 ${s.skeleton} gba:rounded-lg gba:w-3/4 gba:animate-pulse`} />
              <div className={`gba:h-4 ${s.skeleton} gba:rounded-lg gba:w-1/2 gba:animate-pulse`} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={s.errorCard} data-testid={dataTestId}>
        <CardContent className="gba:p-5">
          <p className={`gba:text-sm gba:font-medium ${s.errorText}`}>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`gba:group gba:transition-all gba:relative gba:overflow-hidden ${s.card} ${onClick ? `gba:cursor-pointer ${s.cardClickable}` : ''}`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      <div
        className={`gba:absolute gba:inset-0 ${s.overlay} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:pointer-events-none`}
      />

      <CardContent className="gba:p-5 gba:relative">
        <div className="gba:flex gba:items-start gba:gap-4">
          {icon && <div className="gba:flex-shrink-0">{icon}</div>}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:mb-2">
              <div className="gba:flex-1 gba:min-w-0">
                <h4 className={`gba:text-base gba:font-bold gba:truncate ${s.title}`}>{title}</h4>
                {subtitle && <p className={`gba:text-sm gba:truncate gba:mt-0.5 ${s.subtitle}`}>{subtitle}</p>}
              </div>
              {status && (
                <Badge variant={statusVariant} className="gba:text-xs gba:flex-shrink-0">
                  {status}
                </Badge>
              )}
            </div>

            {description && (
              <p className={`gba:text-sm gba:mt-2 gba:line-clamp-2 gba:leading-relaxed ${s.description}`}>
                {description}
              </p>
            )}

            {fields && fields.length > 0 && (
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

            {actions && <div className="gba:mt-4">{actions}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EntityCard
