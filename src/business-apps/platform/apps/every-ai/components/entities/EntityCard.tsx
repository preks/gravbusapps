import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'

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
  'data-testid'?: string
}

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
  'data-testid': dataTestId
}) => {
  if (isLoading) {
    return (
      <Card
        className={`gba:border-2 gba:shadow-lg ${onClick ? 'gba:cursor-pointer' : ''}`}
        onClick={onClick}
        data-testid={dataTestId}
      >
        <CardContent className="gba:p-5">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:h-14 gba:w-14 gba:rounded-full gba:bg-gradient-to-br gba:from-muted gba:to-muted/50 gba:animate-pulse gba:shadow-md" />
            <div className="gba:flex-1 gba:space-y-3">
              <div className="gba:h-5 gba:bg-muted gba:rounded-lg gba:w-3/4 gba:animate-pulse" />
              <div className="gba:h-4 gba:bg-muted gba:rounded-lg gba:w-1/2 gba:animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:border-2 gba:border-destructive/30 gba:shadow-lg" data-testid={dataTestId}>
        <CardContent className="gba:p-5">
          <p className="gba:text-sm gba:text-destructive gba:font-medium">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`gba:group gba:border-2 gba:shadow-lg hover:gba:shadow-xl gba:transition-all gba:relative gba:overflow-hidden ${onClick ? 'gba:cursor-pointer hover:gba:border-primary/50' : ''}`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-ai/5 gba:to-ai-secondary/5 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:pointer-events-none" />

      <CardContent className="gba:p-5 gba:relative">
        <div className="gba:flex gba:items-start gba:gap-4">
          {icon && <div className="gba:flex-shrink-0">{icon}</div>}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:mb-2">
              <div className="gba:flex-1 gba:min-w-0">
                <h4 className="gba:text-base gba:font-bold gba:text-foreground gba:truncate">{title}</h4>
                {subtitle && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mt-0.5">{subtitle}</p>
                )}
              </div>
              {status && (
                <Badge variant={statusVariant} className="gba:text-xs gba:flex-shrink-0 gba:shadow-sm">
                  {status}
                </Badge>
              )}
            </div>

            {description && (
              <p className="gba:text-sm gba:text-foreground gba:mt-2 gba:line-clamp-2 gba:leading-relaxed">
                {description}
              </p>
            )}

            {fields && fields.length > 0 && (
              <div className="gba:mt-4 gba:grid gba:grid-cols-2 gba:gap-3">
                {fields.map((field, idx) => (
                  <div key={idx} className="gba:min-w-0 gba:p-2 gba:rounded-lg gba:bg-muted/30">
                    <p className="gba:text-xs gba:text-muted-foreground gba:font-medium gba:mb-0.5">{field.label}</p>
                    <p className="gba:text-sm gba:text-foreground gba:truncate gba:font-semibold">
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
