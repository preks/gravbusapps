import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'

interface ErrorStateCardProps {
  message: string
}

export const ErrorStateCard: React.FC<ErrorStateCardProps> = ({ message }) => (
  <Card>
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
      <WarningCircleIcon size={32} className="gba:text-destructive" />
      <p className="gba:text-sm gba:text-destructive">{message}</p>
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
