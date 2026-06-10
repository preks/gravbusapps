import React from 'react'

interface DetailPanelFieldProps {
  readonly label: string
  readonly children: React.ReactNode
}

interface DetailPanelSectionProps {
  readonly title: string
  readonly children: React.ReactNode
  readonly action?: React.ReactNode
}

export const DetailPanelField: React.FC<DetailPanelFieldProps> = ({ label, children }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:py-1.5 gba:text-sm">
    <span className="gba:shrink-0 gba:text-muted-foreground">{label}</span>
    <span className="gba:min-w-0 gba:max-w-64 gba:break-words gba:text-left gba:font-medium gba:text-foreground">
      {children || <span className="gba:text-muted-foreground">-</span>}
    </span>
  </div>
)

export const DetailPanelSection: React.FC<DetailPanelSectionProps> = ({ title, children, action }) => (
  <div className="gba:mb-6">
    <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:pb-2">
      <h4 className="gba:min-w-0 gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>
      {action ? <div className="gba:shrink-0">{action}</div> : null}
    </div>
    <div className="gba:space-y-1">{children}</div>
  </div>
)
