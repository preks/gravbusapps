import React from 'react'
import { Card, CardContent, Alert, AlertTitle, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'

export const CompensationReviewForm: React.FC<BusinessAppContextProps> = () => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:p-6">
      <h1 className="gba:text-2xl gba:font-semibold gba:mb-1">{t('title')}</h1>
      <p className="gba:text-muted-foreground gba:text-sm gba:mb-6">{t('subtitle')}</p>

      <Alert className="gba:mb-6">
        <AlertTitle>Not Available Yet</AlertTitle>
        <AlertDescription>
          Reviewing compensation proposals requires the compensation_employee_proposal backend table to be configured.
          Once available, senior managers and HR will be able to review, approve, reject, or send back manager proposals
          from this screen.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="gba:p-6">
          <h3 className="gba:text-sm gba:font-semibold gba:mb-4">Planned Features</h3>
          <ul className="gba:list-disc gba:space-y-2 gba:pl-5 gba:text-sm gba:text-muted-foreground">
            <li>View all submitted compensation proposals from managers</li>
            <li>See proposed salary increases, bonuses, and justifications</li>
            <li>Bulk approve, reject, or send back proposals with review notes</li>
            <li>Summary statistics: total cost impact, average increase percentage</li>
            <li>Upon final approval, trigger existing salary adjustment and bonus BPMN processes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
