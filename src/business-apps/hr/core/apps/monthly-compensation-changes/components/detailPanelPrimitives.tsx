import React from 'react'
import { Card } from '@newwork/nw-design-system'

export const Section: React.FC<Readonly<{ title: string; children: React.ReactNode }>> = ({ title, children }) => (
  <Card className="gba:p-4">
    <div className="gba:mb-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
      <h4 className="gba:min-w-0 gba:flex-1 gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>
    </div>
    <div className="gba:space-y-2">{children}</div>
  </Card>
)

export const FieldRow: React.FC<Readonly<{ label: string; value: React.ReactNode }>> = ({ label, value }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:max-w-[60%] gba:text-right gba:font-medium gba:text-foreground">{value || '-'}</span>
  </div>
)
