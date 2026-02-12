/**
 * AccountSetupDialog - Dialog for connecting a new email account.
 * Supports:
 * - Microsoft OAuth (code sent to backend for server-side exchange)
 * - Google OAuth (code sent to backend for server-side exchange)
 * - Gmail IMAP/SMTP with app passwords
 * - Generic IMAP/SMTP manual configuration
 */

import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input
} from '@newwork/nw-design-system'
import { Mail, Globe, Shield, Loader2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { MicrosoftOAuthService } from '../services/MicrosoftOAuthService'
import { GoogleOAuthService } from '../services/GoogleOAuthService'
import { EmailProviderSettingsApi, type PublicProviderConfig } from '../services/EmailProviderSettingsApi'
import type { CreateEmailAccountRequest, EmailAccountProvider } from '../types'

interface AccountSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated: () => void
  accessToken?: string
  'data-testid'?: string
}

type SetupStep = 'provider' | 'gmail-choice' | 'credentials' | 'testing'

interface ProviderOption {
  id: EmailAccountProvider
  name: string
  description: string
  icon: React.ReactNode
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  useOAuth?: boolean
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'microsoft',
    name: 'Microsoft 365 / Outlook',
    description: 'Sign in with Microsoft (recommended)',
    icon: <Globe className="gba:w-6 gba:h-6" />,
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    useOAuth: true
  },
  {
    id: 'google',
    name: 'Gmail / Google Workspace',
    description: 'Sign in with Google or use App Password',
    icon: <Mail className="gba:w-6 gba:h-6" />,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587
  },
  {
    id: 'imap_smtp',
    name: 'Other email (IMAP/SMTP)',
    description: 'Manual configuration',
    icon: <Shield className="gba:w-6 gba:h-6" />,
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 587
  }
]

export const AccountSetupDialog: React.FC<AccountSetupDialogProps> = ({
  open,
  onOpenChange,
  onAccountCreated,
  accessToken,
  'data-testid': testId = 'account-setup'
}) => {
  const [step, setStep] = useState<SetupStep>('provider')
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null)
  const [tenantSettings, setTenantSettings] = useState<PublicProviderConfig[]>([])
  const [isLoadingProviderSettings, setIsLoadingProviderSettings] = useState(false)
  const [providerSettingsLoaded, setProviderSettingsLoaded] = useState(false)

  const [formData, setFormData] = useState<CreateEmailAccountRequest>({
    displayName: '',
    emailAddress: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    authUser: '',
    authPass: '',
    isDefault: true
  })

  // Load tenant provider settings when dialog opens
  useEffect(() => {
    if (!open || !accessToken) return
    EmailProviderSettingsApi.setAccessToken(accessToken)

    let cancelled = false
    setIsLoadingProviderSettings(true)
    setProviderSettingsLoaded(false)

    EmailProviderSettingsApi.getPublicSettings()
      .then(data => {
        if (cancelled) return
        setTenantSettings(data)
        setProviderSettingsLoaded(true)
      })
      .catch(err => {
        if (cancelled) return
        console.error('[AccountSetupDialog] Failed to load provider settings:', err)
        setTenantSettings([])
        setProviderSettingsLoaded(false)
        toast.error('Failed to load email provider settings. Please try again or contact your admin.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoadingProviderSettings(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, accessToken])

  const hasValue = (v?: string): boolean => !!v?.trim()
  const msSettings = tenantSettings.find(s => s.provider === 'microsoft')
  const googleSettings = tenantSettings.find(s => s.provider === 'google')

  const msReady =
    providerSettingsLoaded &&
    !!msSettings?.isEnabled &&
    hasValue(msSettings.publicConfig?.clientId as string) &&
    hasValue(msSettings.publicConfig?.authority as string) &&
    hasValue(msSettings.publicConfig?.scopes as string)

  const googleOAuthReady =
    providerSettingsLoaded &&
    !!googleSettings?.isEnabled &&
    hasValue(googleSettings.publicConfig?.clientId as string) &&
    hasValue(googleSettings.publicConfig?.scopes as string)

  const handleMicrosoftOAuth = useCallback(async () => {
    try {
      setStep('testing')

      if (!providerSettingsLoaded) {
        toast.error(
          isLoadingProviderSettings
            ? 'Provider settings are still loading. Please try again.'
            : 'Microsoft provider is not configured. Please ask your admin to configure it.'
        )
        setStep('provider')
        return
      }

      if (!msSettings?.isEnabled) {
        toast.error('Microsoft provider is not enabled. Please ask your admin to enable it in provider settings.')
        setStep('provider')
        return
      }

      const config = MicrosoftOAuthService.buildConfig(
        msSettings.publicConfig as {
          clientId?: string
          authority?: string
          scopes?: string
        }
      )

      // Redirect flow — callback page completes the code exchange.
      await MicrosoftOAuthService.startAuth(config)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect Microsoft account')
      setStep('provider')
    }
  }, [providerSettingsLoaded, isLoadingProviderSettings, msSettings])

  const handleGoogleOAuth = useCallback(async () => {
    try {
      setStep('testing')

      if (!providerSettingsLoaded) {
        toast.error(
          isLoadingProviderSettings
            ? 'Provider settings are still loading. Please try again.'
            : 'Google provider is not configured. Please ask your admin to configure it.'
        )
        setStep('provider')
        return
      }

      if (!googleSettings?.isEnabled) {
        toast.error('Google provider is not enabled. Please ask your admin to enable it in provider settings.')
        setStep('provider')
        return
      }

      const config = GoogleOAuthService.buildConfig(
        googleSettings.publicConfig as { clientId?: string; scopes?: string }
      )

      // Redirect flow — callback page completes the code exchange.
      await GoogleOAuthService.startAuth(config)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect Google account')
      setStep('provider')
    }
  }, [providerSettingsLoaded, isLoadingProviderSettings, googleSettings])

  const handleProviderSelect = async (provider: ProviderOption) => {
    if (provider.id === 'microsoft') {
      await handleMicrosoftOAuth()
      return
    }

    if (provider.id === 'google') {
      // Check if Google OAuth is available
      if (googleOAuthReady) {
        // Show choice between OAuth and App Password
        setSelectedProvider(provider)
        setStep('gmail-choice')
      } else {
        // No Google OAuth configured - go straight to IMAP/SMTP credentials
        setSelectedProvider(provider)
        setFormData(prev => ({
          ...prev,
          provider: provider.id,
          imapHost: provider.imapHost,
          imapPort: provider.imapPort,
          smtpHost: provider.smtpHost,
          smtpPort: provider.smtpPort
        }))
        setStep('credentials')
      }
      return
    }

    // Generic IMAP/SMTP — use admin-configured defaults if available
    const imapDefaults = tenantSettings.find(s => s.provider === 'imap_smtp')?.publicConfig
    setSelectedProvider(provider)
    setFormData(prev => ({
      ...prev,
      provider: provider.id,
      imapHost: (imapDefaults?.defaultImapHost as string) || provider.imapHost,
      imapPort: Number((imapDefaults?.defaultImapPort as string) || provider.imapPort),
      smtpHost: (imapDefaults?.defaultSmtpHost as string) || provider.smtpHost,
      smtpPort: Number((imapDefaults?.defaultSmtpPort as string) || provider.smtpPort)
    }))
    setStep('credentials')
  }

  const updateField = (field: keyof CreateEmailAccountRequest, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTestAndCreate = useCallback(async () => {
    if (!formData.emailAddress || !formData.displayName) {
      toast.error('Please fill in all required fields')
      return
    }

    setStep('testing')

    try {
      const testResult = await EmailApiService.testConnection(formData)
      if (!testResult.success) {
        toast.error(`Connection failed: ${testResult.error}`)
        setStep('credentials')
        return
      }

      await EmailApiService.createAccount(formData)
      toast.success('Email account connected successfully')
      onAccountCreated()
      onOpenChange(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
      setStep('credentials')
    }
  }, [formData, onAccountCreated, onOpenChange])

  const resetForm = () => {
    setStep('provider')
    setSelectedProvider(null)
    setFormData({
      displayName: '',
      emailAddress: '',
      imapHost: '',
      imapPort: 993,
      imapSecure: true,
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      authUser: '',
      authPass: '',
      isDefault: true
    })
  }

  const msConfigured = msReady

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        onOpenChange(v)
        if (!v) resetForm()
      }}
    >
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Connect email account</DialogTitle>
          <DialogDescription>Connect your email to send and receive messages within NEWWORK.</DialogDescription>
        </DialogHeader>

        {/* Step 1: Provider selection */}
        {step === 'provider' && (
          <div className="gba:space-y-3 gba:py-4">
            {PROVIDERS.filter(provider => {
              // If tenant settings are loaded, respect the enabled flag
              if (tenantSettings.length === 0) return true // No settings yet, show all
              if (provider.id === 'imap_smtp') {
                const imapSettings = tenantSettings.find(s => s.provider === 'imap_smtp')
                // Show IMAP if no explicit setting exists (default) or if enabled
                return !imapSettings || imapSettings.isEnabled
              }
              return true // Microsoft and Google always show (they handle their own enabled state)
            }).map(provider => {
              const isMicrosoft = provider.id === 'microsoft'
              const isDisabled = isMicrosoft && !msReady

              return (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  disabled={isDisabled}
                  className={`gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:transition-colors gba:text-left ${
                    isDisabled ? 'gba:opacity-50 gba:cursor-not-allowed' : 'gba:hover:bg-muted/50'
                  }`}
                  data-testid={`${testId}-provider-${provider.id}`}
                >
                  <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    {provider.icon}
                  </div>
                  <div className="gba:flex-1">
                    <p className="gba:font-medium gba:text-foreground">{provider.name}</p>
                    <p className="gba:text-xs gba:text-muted-foreground">{provider.description}</p>
                  </div>
                  {provider.id === 'microsoft' && (
                    <span className="gba:text-xs gba:bg-primary/10 gba:text-primary gba:px-2 gba:py-1 gba:rounded">
                      {msConfigured
                        ? 'OAuth'
                        : isLoadingProviderSettings
                          ? 'OAuth (loading)'
                          : 'OAuth (needs admin setup)'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Step 1b: Gmail choice - OAuth or App Password */}
        {step === 'gmail-choice' && (
          <div className="gba:space-y-3 gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">Choose how to connect your Gmail account:</p>
            <button
              onClick={handleGoogleOAuth}
              className="gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
              data-testid={`${testId}-gmail-oauth`}
            >
              <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
                <Globe className="gba:w-6 gba:h-6" />
              </div>
              <div className="gba:flex-1">
                <p className="gba:font-medium gba:text-foreground">Sign in with Google</p>
                <p className="gba:text-xs gba:text-muted-foreground">Recommended — uses OAuth for secure access</p>
              </div>
              <span className="gba:text-xs gba:bg-primary/10 gba:text-primary gba:px-2 gba:py-1 gba:rounded">
                OAuth
              </span>
            </button>
            <button
              onClick={() => {
                if (selectedProvider) {
                  setFormData(prev => ({
                    ...prev,
                    provider: selectedProvider.id,
                    imapHost: selectedProvider.imapHost,
                    imapPort: selectedProvider.imapPort,
                    smtpHost: selectedProvider.smtpHost,
                    smtpPort: selectedProvider.smtpPort
                  }))
                }
                setStep('credentials')
              }}
              className="gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
              data-testid={`${testId}-gmail-apppassword`}
            >
              <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
                <Shield className="gba:w-6 gba:h-6" />
              </div>
              <div className="gba:flex-1">
                <p className="gba:font-medium gba:text-foreground">App Password (IMAP/SMTP)</p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Use an app-specific password from myaccount.google.com/apppasswords
                </p>
              </div>
            </button>
            <div className="gba:pt-2">
              <Button variant="ghost" onClick={() => setStep('provider')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Credentials (IMAP/SMTP) */}
        {step === 'credentials' && (
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Display name</label>
              <Input
                value={formData.displayName}
                onChange={e => updateField('displayName', e.target.value)}
                placeholder="Your name"
                data-testid={`${testId}-display-name`}
              />
            </div>
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Email address</label>
              <Input
                type="email"
                value={formData.emailAddress}
                onChange={e => {
                  updateField('emailAddress', e.target.value)
                  if (!formData.authUser) updateField('authUser', e.target.value)
                }}
                placeholder="you@example.com"
                data-testid={`${testId}-email`}
              />
            </div>
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Password / App password</label>
              <Input
                type="password"
                value={formData.authPass || ''}
                onChange={e => updateField('authPass', e.target.value)}
                placeholder="Enter password"
                data-testid={`${testId}-password`}
              />
              <p className="gba:text-xs gba:text-muted-foreground">For Gmail, use an app-specific password</p>
            </div>

            {/* Advanced: IMAP/SMTP fields for manual config */}
            {selectedProvider?.id === 'imap_smtp' && (
              <>
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <div className="gba:space-y-2">
                    <label className="gba:text-sm gba:font-medium">IMAP host</label>
                    <Input value={formData.imapHost} onChange={e => updateField('imapHost', e.target.value)} />
                  </div>
                  <div className="gba:space-y-2">
                    <label className="gba:text-sm gba:font-medium">IMAP port</label>
                    <Input
                      type="number"
                      value={formData.imapPort}
                      onChange={e => updateField('imapPort', +e.target.value)}
                    />
                  </div>
                </div>
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <div className="gba:space-y-2">
                    <label className="gba:text-sm gba:font-medium">SMTP host</label>
                    <Input value={formData.smtpHost} onChange={e => updateField('smtpHost', e.target.value)} />
                  </div>
                  <div className="gba:space-y-2">
                    <label className="gba:text-sm gba:font-medium">SMTP port</label>
                    <Input
                      type="number"
                      value={formData.smtpPort}
                      onChange={e => updateField('smtpPort', +e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="gba:flex gba:justify-between gba:pt-4">
              <Button variant="ghost" onClick={() => setStep('provider')}>
                Back
              </Button>
              <Button onClick={handleTestAndCreate} data-testid={`${testId}-connect`}>
                Test and connect
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Testing */}
        {step === 'testing' && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
            <Loader2 className="gba:w-10 gba:h-10 gba:animate-spin gba:text-primary gba:mb-4" />
            <p className="gba:text-foreground gba:font-medium">Connecting...</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Setting up your email account</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
