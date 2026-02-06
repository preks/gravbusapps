/**
 * AccountSetupDialog - Dialog for connecting a new email account.
 * Supports IMAP/SMTP manual config and provider presets for Outlook/Gmail.
 */

import React, { useState, useCallback } from 'react'
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
import type { CreateEmailAccountRequest, EmailAccountProvider } from '../types'

interface AccountSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated: () => void
  'data-testid'?: string
}

type SetupStep = 'provider' | 'credentials' | 'testing'

const PROVIDERS: Array<{
  id: EmailAccountProvider
  name: string
  description: string
  icon: React.ReactNode
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  useOAuth?: boolean
}> = [
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
    description: 'Requires App Password',
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
  'data-testid': testId = 'account-setup'
}) => {
  const [step, setStep] = useState<SetupStep>('provider')
  const [selectedProvider, setSelectedProvider] = useState<(typeof PROVIDERS)[0] | null>(null)

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

  const handleProviderSelect = async (provider: (typeof PROVIDERS)[0]) => {
    // For Microsoft, use OAuth flow directly
    if (provider.id === 'microsoft') {
      try {
        await MicrosoftOAuthService.startAuth()
        // Page will redirect to Microsoft login
        return
      } catch {
        toast.error('Failed to start Microsoft sign-in')
        return
      }
    }

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

  const updateField = (field: keyof CreateEmailAccountRequest, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTestAndCreate = useCallback(async () => {
    if (!formData.emailAddress || !formData.displayName) {
      toast.error('Please fill in all required fields')
      return
    }

    setStep('testing')
    setIsTesting(true)

    try {
      // Test connection
      const testResult = await EmailApiService.testConnection(formData)
      if (!testResult.success) {
        toast.error(`Connection failed: ${testResult.error}`)
        setStep('credentials')
        return
      }

      // Create account
      await EmailApiService.createAccount(formData)
      toast.success('Email account connected successfully')
      onAccountCreated()
      onOpenChange(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
      setStep('credentials')
    } finally {
      setIsTesting(false)
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
            {PROVIDERS.map(provider => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider)}
                className="gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border hover:gba:bg-muted/50 gba:transition-colors gba:text-left"
                data-testid={`${testId}-provider-${provider.id}`}
              >
                <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
                  {provider.icon}
                </div>
                <div className="gba:flex-1">
                  <p className="gba:font-medium gba:text-foreground">{provider.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{provider.description}</p>
                </div>
                {provider.useOAuth && (
                  <span className="gba:text-xs gba:bg-primary/10 gba:text-primary gba:px-2 gba:py-1 gba:rounded">
                    OAuth
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Credentials */}
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
              <p className="gba:text-xs gba:text-muted-foreground">For Gmail/Outlook, use an app-specific password</p>
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
            <p className="gba:text-foreground gba:font-medium">Testing connection...</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Verifying your email settings</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
