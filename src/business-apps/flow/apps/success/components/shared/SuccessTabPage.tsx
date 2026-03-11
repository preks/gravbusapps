import React from 'react'

interface SuccessTabPageProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  headerVariant?: 'default' | 'dashboard'
  hideHeader?: boolean
  'data-testid'?: string
}

export const SuccessTabPage: React.FC<SuccessTabPageProps> = ({
  title,
  description,
  actions,
  children,
  headerVariant = 'default',
  hideHeader = false,
  'data-testid': testId
}) => {
  const isDashboard = headerVariant === 'dashboard'

  return (
    <div className={`gba:flex gba:flex-col ${isDashboard ? 'gba:gap-8' : 'gba:gap-6'}`} data-testid={testId}>
      {!hideHeader && (title || description || actions) ? (
        <div
          className={`gba:flex gba:flex-col gba:gap-4 ${
            isDashboard
              ? 'gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:p-5'
              : 'gba:lg:flex-row gba:lg:items-end gba:lg:justify-between'
          }`}
        >
          <div className="gba:flex gba:flex-col gba:gap-1">
            {title ? (
              <h2 className={`${isDashboard ? 'gba:text-3xl' : 'gba:text-2xl'} gba:font-semibold gba:text-foreground`}>
                {title}
              </h2>
            ) : null}
            {description ? <p className="gba:max-w-3xl gba:text-sm gba:text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
