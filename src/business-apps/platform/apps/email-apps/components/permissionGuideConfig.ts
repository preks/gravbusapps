/**
 * Permission guide configuration for email provider admin settings.
 * Defines required/optional OAuth scopes and setup instructions per provider.
 */

export interface PermissionFeature {
  name: string
  scopes: string[]
  description: string
  required: boolean
}

export interface ProviderGuide {
  name: string
  setupUrl: string | null
  setupGuide: string
  features: PermissionFeature[]
  defaultScopes: string
  instructions: string[]
}

/** Permission/scope requirements per feature per provider */
export const PERMISSION_GUIDE: Record<string, ProviderGuide> = {
  microsoft: {
    name: 'Microsoft 365 / Outlook',
    setupUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps',
    setupGuide: 'Azure Portal > App registrations > New registration',
    features: [
      {
        name: 'Email (Read & Send)',
        scopes: ['Mail.Read', 'Mail.Send'],
        description: 'Read inbox, send emails, manage folders',
        required: true
      },
      {
        name: 'Calendar (Read)',
        scopes: ['Calendars.Read'],
        description: 'View calendar events in the everyone calendar',
        required: false
      },
      {
        name: 'User Profile',
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        description: 'Basic user info and refresh token support',
        required: true
      }
    ],
    defaultScopes: 'openid profile email offline_access Mail.Read Mail.Send Calendars.Read',
    instructions: [
      'Go to Azure Portal > App registrations > New registration',
      'Set "Supported account types" to "Accounts in any organizational directory"',
      'Add redirect URI: {origin}/platform/mail/oauth/callback (Single-page application)',
      'Under API permissions, add: Mail.Read, Mail.Send, Calendars.Read (Microsoft Graph, Delegated)',
      'Under Certificates & secrets, create a new client secret',
      'Copy the Application (client) ID and Client secret below'
    ]
  },
  google: {
    name: 'Google / Gmail',
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    setupGuide: 'Google Cloud Console > APIs & Services > Credentials',
    features: [
      {
        name: 'Email (Full access)',
        scopes: ['https://mail.google.com/'],
        description: 'Read, send, and manage Gmail messages',
        required: true
      },
      {
        name: 'Calendar (Read)',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        description: 'View calendar events in the everyone calendar',
        required: false
      },
      {
        name: 'User Profile',
        scopes: ['openid', 'email', 'profile'],
        description: 'Basic user info for account identification',
        required: true
      }
    ],
    defaultScopes: 'openid email profile https://mail.google.com/ https://www.googleapis.com/auth/calendar.readonly',
    instructions: [
      'Go to Google Cloud Console > APIs & Services > Credentials',
      'Create an OAuth 2.0 Client ID (Web application)',
      'Add authorized redirect URI: {origin}/platform/mail/oauth/callback',
      'Enable Gmail API and Google Calendar API in the API Library',
      'Configure the OAuth consent screen with required scopes',
      'Copy the Client ID and Client secret below'
    ]
  },
  imap_smtp: {
    name: 'IMAP / SMTP',
    setupUrl: null,
    setupGuide: 'Configure default IMAP/SMTP server settings for your organization',
    features: [
      {
        name: 'Email (IMAP/SMTP)',
        scopes: [],
        description: 'Connect via standard email protocols',
        required: true
      }
    ],
    defaultScopes: '',
    instructions: [
      'Set default IMAP and SMTP server addresses for your organization',
      'Users will enter their own credentials (username/password or app password)',
      'Calendar sync is not available for IMAP/SMTP accounts'
    ]
  }
}

export type ProviderKey = 'microsoft' | 'google' | 'imap_smtp'
