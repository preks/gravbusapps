import React from 'react'
import { CardHeader } from '@newwork/nw-design-system'

type SuccessSectionCardHeaderProps = React.ComponentProps<typeof CardHeader>

export const SuccessSectionCardHeader: React.FC<SuccessSectionCardHeaderProps> = ({ className, ...props }) => {
  const resolvedClassName = ['gba:border-b gba:border-border gba:pb-5', className].filter(Boolean).join(' ')

  return <CardHeader className={resolvedClassName} {...props} />
}
