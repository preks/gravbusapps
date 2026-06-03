import React from 'react'

export const Section: React.FC<Readonly<{ title: string; children: React.ReactNode }>> = ({ title, children }) => (
  <div className="gba:mb-6">
    <h4 className="gba:mb-3 gba:border-b gba:border-border gba:pb-2 gba:text-sm gba:font-semibold gba:text-foreground">
      {title}
    </h4>
    <div className="gba:space-y-1">{children}</div>
  </div>
)

export const FieldRow: React.FC<Readonly<{ label: string; value: React.ReactNode }>> = ({ label, value }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:py-1.5 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:max-w-64 gba:text-right gba:font-medium gba:text-foreground">{value || '-'}</span>
  </div>
)
