import React from 'react'

interface SuccessTabPageProps {
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
  'data-testid'?: string
}

export const SuccessTabPage: React.FC<SuccessTabPageProps> = ({
  title,
  description,
  actions,
  children,
  'data-testid': testId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-4 gba:lg:flex-row gba:lg:items-end gba:lg:justify-between">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">{title}</h2>
          <p className="gba:max-w-3xl gba:text-sm gba:text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
