import React from 'react'

export type DetailsPanelField = {
  label: React.ReactNode
  value: React.ReactNode
  dataTestId?: string
}

export interface DetailsPanelContentProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  headerRight?: React.ReactNode
  /**
   * Content to render immediately after the title/status header, before the field list.
   */
  afterHeaderContent?: React.ReactNode
  fields: DetailsPanelField[]
  extraContent?: React.ReactNode
  footer?: React.ReactNode
  dataTestIdPrefix: string
  /**
   * If false, the internal header (title/subtitle/right) is not rendered.
   * Use this when the surrounding container (e.g. DataDetails) already renders a header.
   */
  showHeader?: boolean
}

export const DetailsPanelContent: React.FC<DetailsPanelContentProps> = ({
  title,
  subtitle,
  headerRight,
  afterHeaderContent,
  fields,
  extraContent,
  footer,
  dataTestIdPrefix,
  showHeader = true
}) => {
  return (
    <div className="gba:relative" data-testid={`${dataTestIdPrefix}-content`}>
      {showHeader ? (
        <div
          className="gba:flex gba:justify-between gba:items-center gba:mb-4"
          data-testid={`${dataTestIdPrefix}-header`}
        >
          <div className="gba:min-w-0">
            <h3
              className="gba:text-lg gba:font-semibold gba:mb-1 gba:truncate"
              data-testid={`${dataTestIdPrefix}-title`}
            >
              {title}
            </h3>
            {subtitle ? (
              <p
                className="gba:text-sm gba:text-muted-foreground gba:truncate"
                data-testid={`${dataTestIdPrefix}-subtitle`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerRight ? <div data-testid={`${dataTestIdPrefix}-header-right`}>{headerRight}</div> : null}
        </div>
      ) : null}

      {afterHeaderContent ? (
        <div className="gba:mb-4" data-testid={`${dataTestIdPrefix}-after-header`}>
          {afterHeaderContent}
        </div>
      ) : null}

      <dl className="gba:space-y-3" data-testid={`${dataTestIdPrefix}-dl`}>
        {fields.map((field, idx) => {
          const labelKey = field.dataTestId || `${dataTestIdPrefix}-field-${idx}`
          return (
            <div
              key={labelKey}
              className="gba:flex gba:justify-between gba:gap-4"
              data-testid={field.dataTestId || `${dataTestIdPrefix}-row-${idx}`}
            >
              <dt className="gba:font-medium gba:text-muted-foreground gba:shrink-0">{field.label}:</dt>
              <dd className="gba:text-sm gba:text-foreground gba:text-right gba:truncate gba:min-w-0">{field.value}</dd>
            </div>
          )
        })}
      </dl>

      {extraContent ? (
        <div className="gba:mt-6" data-testid={`${dataTestIdPrefix}-extra`}>
          {extraContent}
        </div>
      ) : null}
      {footer ? (
        <div className="gba:mt-4" data-testid={`${dataTestIdPrefix}-footer`}>
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export default DetailsPanelContent
