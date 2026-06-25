import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'

interface ErrorStateCardProps {
  message: string
  action?: React.ReactNode
}

export const ErrorStateCard: React.FC<ErrorStateCardProps> = ({ message, action }) => (
  <Card>
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
      <p className="gba:text-base gba:font-medium gba:text-destructive">{message}</p>
      {action}
    </CardContent>
  </Card>
)

interface LoadingStateCardProps {
  message: string
}

export const LoadingStateCard: React.FC<LoadingStateCardProps> = ({ message }) => (
  <Card>
    <CardContent className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8">
      <Spinner />
      <span className="gba:text-sm gba:text-muted-foreground">{message}</span>
    </CardContent>
  </Card>
)
