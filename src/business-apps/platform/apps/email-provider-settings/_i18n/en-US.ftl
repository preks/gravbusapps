# Common
back-button-label = Go back to email settings
common-enabled = Enabled
common-disabled = Disabled
common-active = Active
common-not-granted = Not granted
common-secret-configured = Secret configured
common-copied-to-clipboard = Copied to clipboard
common-show-secret = Show secret
common-hide-secret = Hide secret
common-open-link = Open link
common-copy-link = Copy link
common-add-custom-scope = Add custom scope
common-remove-custom-scope = Remove custom scope { $scope }

# Screen
screen-title = Email Provider Settings
screen-description = Configure OAuth credentials so users can connect their email accounts.
tab-microsoft = Microsoft 365
tab-google = Google / Gmail
tab-imap-smtp = IMAP / SMTP
tab-assistant-policy = Assistant Policy

# Setup guide
setup-guide-microsoft-title = Microsoft Setup Guide
setup-guide-microsoft-step-1 = Go to Azure Portal > App Registrations > New registration.
setup-guide-microsoft-step-2 = Choose "Web" as the platform type (not SPA) for reliable background sync.
setup-guide-microsoft-step-3 = Add the redirect URI shown above in Authentication > Web.
setup-guide-microsoft-step-4 = Create a Client Secret under Certificates & secrets.
setup-guide-microsoft-step-5 = Enable the required permissions and grant admin consent if needed.
setup-guide-microsoft-step-6 = After saving here, users can connect their Microsoft accounts from the Mail app.
setup-guide-google-title = Google Setup Guide
setup-guide-google-step-1 = Go to Google Cloud Console > APIs & Services > Credentials.
setup-guide-google-step-2 = Create an OAuth 2.0 Client ID (Web application type).
setup-guide-google-step-3 = Add the redirect URI shown above under Authorized redirect URIs.
setup-guide-google-step-4 = Enable the Gmail API in APIs & Services > Library.
setup-guide-google-step-5 = Configure the OAuth consent screen with required scopes.
setup-guide-google-step-6 = After saving here, users can connect their Google accounts from the Mail app.
setup-guide-imap-smtp-title = IMAP / SMTP Setup
setup-guide-imap-smtp-step-1 = No external app registration needed.
setup-guide-imap-smtp-step-2 = Enable this provider to let users connect any email account manually.
setup-guide-imap-smtp-step-3 = Optionally pre-fill default server details so users only need their credentials.
setup-guide-imap-smtp-step-4 = Users will enter their email, password, and server details (if not pre-filled).

# Errors
error-load-settings = Failed to load settings
error-load-assistant-policy = Failed to load assistant policy
error-save-assistant-policy = Failed to save assistant policy

# Provider settings
provider-name-microsoft = Microsoft 365 / Outlook
provider-name-google = Google / Gmail
provider-description-microsoft = Configure Azure App Registration for Microsoft OAuth. Users will be able to connect their Microsoft email accounts.
provider-description-google = Configure Google OAuth credentials. Users will be able to connect their Gmail/Google Workspace accounts.
provider-toast-client-id-required = Client ID is required
provider-toast-settings-saved = { $providerName } settings saved successfully
provider-toast-save-failed = Failed to save settings
provider-label-client-id-microsoft = Application (Client) ID
provider-label-client-id-google = OAuth Client ID
provider-hint-client-id-microsoft = From Azure Portal > App Registrations > Your App > Overview
provider-hint-client-id-google = From Google Cloud Console > APIs & Services > Credentials
provider-label-authority = Authority / Tenant
provider-placeholder-authority = organizations
provider-hint-authority = Use "organizations" for work or school accounts, "common" for all accounts, or a specific tenant ID.
provider-label-client-secret = Client Secret
provider-placeholder-client-secret-existing = (secret already configured - leave empty to keep)
provider-placeholder-client-secret-empty = Enter client secret
provider-hint-client-secret-microsoft = Required for background email sync (confidential app). From Azure Portal > Certificates & secrets.
provider-hint-client-secret-google = Required for server-side token exchange. From Google Cloud Console > Credentials.
provider-label-redirect-uri = Redirect URI (add this to your app registration)
provider-label-admin-consent-url = Admin Consent URL
provider-hint-admin-consent = If users see "Need admin approval", open this link to grant consent for the configured scopes.
provider-label-enable-provider = Enable this provider for users
provider-button-save-settings = Save { $providerName } settings

# IMAP / SMTP
imap-card-title = IMAP / SMTP (Generic)
imap-card-description = Allow users to connect any email account via IMAP/SMTP. Optionally set default server details so users only need to enter their credentials.
imap-label-enable-provider = Enable IMAP/SMTP for users
imap-defaults-title = Default Server Settings (optional)
imap-defaults-description = Pre-fill server details so users only need to enter their email and password. Leave empty to let users configure everything themselves.
imap-label-imap-host = Default IMAP Host
imap-placeholder-imap-host = e.g. imap.company.com
imap-label-imap-port = Default IMAP Port
imap-placeholder-imap-port = 993
imap-label-smtp-host = Default SMTP Host
imap-placeholder-smtp-host = e.g. smtp.company.com
imap-label-smtp-port = Default SMTP Port
imap-placeholder-smtp-port = 587
imap-toast-settings-saved = IMAP/SMTP settings saved successfully
imap-button-save-settings = Save IMAP/SMTP settings

# Assistant policy
assistant-title = Email Assistant Policy
assistant-description = Configure assistant behavior for your tenant.
assistant-label-culture-summary = Culture summary
assistant-label-preferred-phrases = Preferred phrases (one per line)
assistant-label-disallowed-phrases = Disallowed phrases (one per line)
assistant-label-required-courtesy-markers = Required courtesy markers (one per line)
assistant-label-default-formality = Default formality
assistant-option-formal = Formal
assistant-option-neutral = Neutral
assistant-option-informal = Informal
assistant-label-history-window-size = History window size
assistant-label-advisory-only = Advisory only (assistant never blocks sending)
assistant-validation-history-window-size = History window size must be between { $min } and { $max }
assistant-button-save = Save policy
assistant-button-saving = Saving policy...

# Permissions
permissions-title = Permissions
permissions-custom-scopes-title = Custom scopes
permissions-placeholder-custom-scope = Add custom scope...
permissions-note-granted = Status badges show which permissions are actually active on the provider side (captured from the last successful user connection). "Not granted" means the scope is configured here but not yet approved in your app registration.
permissions-note-pending = Connect a test account to verify which permissions are active on the provider side. Status badges will appear once a user has successfully connected.

# Microsoft permissions
permission-microsoft-openid-label = OpenID
permission-microsoft-openid-description = Basic identity
permission-microsoft-profile-label = Profile
permission-microsoft-profile-description = User profile info
permission-microsoft-email-label = Email identity
permission-microsoft-email-description = User email address
permission-microsoft-offline-access-label = Offline access
permission-microsoft-offline-access-description = Refresh tokens for background sync
permission-microsoft-mail-read-label = Read emails
permission-microsoft-mail-read-description = Read user mailbox
permission-microsoft-mail-send-label = Send emails
permission-microsoft-mail-send-description = Send mail on behalf of user
permission-microsoft-mail-readwrite-label = Read/write emails
permission-microsoft-mail-readwrite-description = Full mailbox access
permission-microsoft-calendars-read-label = Read calendars
permission-microsoft-calendars-read-description = View calendar events
permission-microsoft-calendars-readwrite-label = Read/write calendars
permission-microsoft-calendars-readwrite-description = Manage calendar events
permission-microsoft-contacts-read-label = Read contacts
permission-microsoft-contacts-read-description = View user contacts

# Google permissions
permission-google-openid-label = OpenID
permission-google-openid-description = Basic identity
permission-google-email-label = Email identity
permission-google-email-description = User email address
permission-google-profile-label = Profile
permission-google-profile-description = User profile info
permission-google-mail-full-label = Full mail access
permission-google-mail-full-description = Read, send, and manage email
permission-google-calendar-readonly-label = Read calendars
permission-google-calendar-readonly-description = View calendar events
permission-google-contacts-readonly-label = Read contacts
permission-google-contacts-readonly-description = View user contacts
