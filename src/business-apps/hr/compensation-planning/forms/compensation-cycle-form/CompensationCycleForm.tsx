import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertTitle,
  AlertDescription,
  Input,
  Textarea,
  Switch,
  Separator,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'

export const CompensationCycleForm: React.FC<BusinessAppContextProps> = () => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:p-6 gba:max-w-3xl gba:mx-auto">
      <h1 className="gba:text-2xl gba:font-semibold gba:mb-1">{t('title')}</h1>
      <p className="gba:text-muted-foreground gba:text-sm gba:mb-6">{t('subtitle')}</p>

      <Alert className="gba:mb-6">
        <AlertTitle>Not Available Yet</AlertTitle>
        <AlertDescription>
          Creating compensation cycles requires the backend tables to be configured. This form will be enabled once the
          compensation_planning_cycle table is available.
        </AlertDescription>
      </Alert>

      <div className="gba:space-y-4 gba:opacity-50 gba:pointer-events-none">
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('section-basic')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-name')}</label>
              <Input placeholder={t('field-name-placeholder')} disabled />
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-description')}</label>
              <Textarea placeholder={t('field-description-placeholder')} disabled />
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-fiscal-year')}</label>
              <Input type="number" defaultValue={new Date().getFullYear()} disabled className="gba:w-32" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('section-timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-planning-start')}</label>
                <Input type="date" disabled />
              </div>
              <div>
                <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-planning-end')}</label>
                <Input type="date" disabled />
              </div>
            </div>
            <div className="gba:mt-4">
              <label className="gba:text-sm gba:font-medium gba:mb-1.5 gba:block">{t('field-effective-date')}</label>
              <Input type="date" disabled />
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('field-effective-date-help')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('section-categories')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('section-categories-help')}</p>
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('category-salary')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('category-salary-help')}</div>
                </div>
                <Switch checked disabled />
              </div>
              <Separator />
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('category-bonus')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('category-bonus-help')}</div>
                </div>
                <Switch checked disabled />
              </div>
              <Separator />
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('category-benefits')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('category-benefits-help')}</div>
                </div>
                <Switch disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button variant="outline" disabled>
            {t('cancel')}
          </Button>
          <Button disabled>{t('create')}</Button>
        </div>
      </div>
    </div>
  )
}
