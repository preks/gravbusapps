import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateInput,
  Input,
  Button,
  Label,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './i18n'

export const LocalizationExample: React.FC<BusinessAppContextProps> = () => {
  return <LocalizationExampleContent />
}

const LocalizationExampleContent: React.FC = () => {
  const { t } = useTranslation(translations)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [userName, setUserName] = useState<string>('John Doe')
  const [itemCount, setItemCount] = useState<number>(5)

  const handleReset = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setUserName('John Doe')
    setItemCount(5)
  }
  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="localization-example-container">
      <Card data-testid="localization-example-card">
        <CardHeader>
          <CardTitle data-testid="localization-example-title">{t('welcome-title')}</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="localization-example-subtitle">
            {t('welcome-subtitle')}
          </p>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          <div className="gba:space-y-4">
            <div className="gba:space-y-2">
              <Label htmlFor="name-input" data-testid="name-label">
                {t('name-label')}
              </Label>
              <Input
                id="name-input"
                data-testid="name-input"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder={t('name-label')}
              />
              {userName && (
                <p className="gba:text-sm gba:text-success" data-testid="welcome-message">
                  {t('welcome-user', { name: userName })}
                </p>
              )}
            </div>

            <Separator />

            <div className="gba:space-y-2">
              <Label htmlFor="date-input" data-testid="date-label">
                {t('date-label')}
              </Label>
              <DateInput data-testid="date-input" value={selectedDate} onChange={setSelectedDate} />
              {selectedDate && (
                <p className="gba:text-sm gba:text-info" data-testid="selected-date-message">
                  {t('selected-date', { date: selectedDate })}
                </p>
              )}
            </div>

            <Separator />

            <div className="gba:space-y-2">
              <Label htmlFor="item-count-input" data-testid="item-count-label">
                {t('item-count-label')}
              </Label>
              <Input
                id="item-count-input"
                data-testid="item-count-input"
                type="number"
                min="0"
                value={itemCount}
                onChange={e => setItemCount(Number(e.target.value))}
              />
              <p className="gba:text-sm gba:text-warning" data-testid="items-count-message">
                {t('items-count', { count: itemCount })}
              </p>
            </div>

            <Separator />

            <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
              <p className="gba:text-sm" data-testid="description-text">
                {t('description')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:gap-2 gba:justify-end">
            <Button variant="outline" onClick={handleReset} data-testid="reset-button">
              {t('reset-button')}
            </Button>
            <Button variant="outline" data-testid="cancel-button">
              {t('cancel-button')}
            </Button>
            <Button data-testid="save-button">{t('save-button')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
