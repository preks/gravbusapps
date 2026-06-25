import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'

interface MyTimeErrorStateCardProps {
  message: string
}

export const MyTimeErrorStateCard: React.FC<MyTimeErrorStateCardProps> = ({ message }) => (
  <Card className="gba:mb-4">
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
      <p className="gba:text-base gba:font-medium gba:text-destructive">{message}</p>
    </CardContent>
  </Card>
)

interface MyTimeLoadingStateCardProps {
  message: string
}

export const MyTimeLoadingStateCard: React.FC<MyTimeLoadingStateCardProps> = ({ message }) => (
  <Card className="gba:mb-4">
    <CardContent className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8">
      <Spinner />
      <span className="gba:text-sm gba:text-muted-foreground">{message}</span>
    </CardContent>
  </Card>
)

export const getMyTimeErrorMessage = (error: string, loadingMessage: string): string =>
  error === 'Failed to load time entries' ? loadingMessage : error
