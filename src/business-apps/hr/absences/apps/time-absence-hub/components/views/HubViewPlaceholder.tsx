import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'

interface HubViewPlaceholderProps {
  title: string
  description?: string
  testId?: string
  children?: React.ReactNode
}

export const HubViewPlaceholder: React.FC<HubViewPlaceholderProps> = ({ title, description, testId, children }) => (
  <Card data-testid={testId}>
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:py-12 gba:text-center">
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{title}</h3>
      {description && <p className="gba:max-w-prose gba:text-sm gba:text-muted-foreground">{description}</p>}
      {children}
    </CardContent>
  </Card>
)

export default HubViewPlaceholder
