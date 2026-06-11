import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

interface ComingSoonProps {
  title: string
  description?: string
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid="learning-coming-soon">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="gba:text-sm gba:text-muted-foreground">{description ?? t('learning-coming-soon')}</p>
      </CardContent>
    </Card>
  )
}
