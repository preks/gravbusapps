import React, { useState, Component } from 'react'
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
  LocalizationProvider,
  useTranslation,
  useLocalizationContext,
  SupportedLocale
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import translations from './i18n'

// ErrorBoundary to catch context errors
class ProviderErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

// Component that tries to use context
const ContextTester: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const ctx = useLocalizationContext()
  React.useEffect(() => {
    if (ctx) {
      onSuccess()
    }
  }, [ctx, onSuccess])
  return null
}

// Wrapper that conditionally provides LocalizationProvider
const ConditionalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const locale = getCurrentActiveUserLocale() as SupportedLocale
  const [hasProvider, setHasProvider] = useState<boolean | null>(null)

  // Check if we're in a provider
  if (hasProvider === null) {
    return (
      <ProviderErrorBoundary
        onError={() => {
          console.log('[LocalizationExample] No provider found, creating own with locale:', locale)
          setHasProvider(false)
        }}
      >
        <ContextTester
          onSuccess={() => {
            console.log('[LocalizationExample] Provider found, reusing existing provider')
            setHasProvider(true)
          }}
        />
      </ProviderErrorBoundary>
    )
  }

  // If we have a provider, just render children
  if (hasProvider) {
    return <>{children}</>
  }

  // No provider, wrap with our own
  console.log('[LocalizationExample] Wrapping with LocalizationProvider, locale:', locale)
  return <LocalizationProvider locale={locale}>{children}</LocalizationProvider>
}

export const LocalizationExample: React.FC<BusinessAppContextProps> = () => {
  return (
    <ConditionalProvider>
      <LocalizationExampleContent />
    </ConditionalProvider>
  )
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
