# Common
back-button-label = Zu den E-Mail-Einstellungen zurueckkehren
common-enabled = Aktiviert
common-disabled = Deaktiviert
common-active = Aktiv
common-not-granted = Nicht gewaehrt
common-secret-configured = Secret konfiguriert
common-copied-to-clipboard = In die Zwischenablage kopiert
common-show-secret = Secret anzeigen
common-hide-secret = Secret ausblenden
common-open-link = Link oeffnen
common-copy-link = Link kopieren
common-add-custom-scope = Eigenen Scope hinzufuegen
common-remove-custom-scope = Eigenen Scope { $scope } entfernen

# Screen
screen-title = Einstellungen fuer E-Mail-Anbieter
screen-description = Konfigurieren Sie OAuth-Anmeldedaten, damit Benutzer ihre E-Mail-Konten verbinden koennen.
tab-microsoft = Microsoft 365
tab-google = Google / Gmail
tab-imap-smtp = IMAP / SMTP
tab-assistant-policy = Assistant-Richtlinie

# Setup guide
setup-guide-microsoft-title = Microsoft-Einrichtungsanleitung
setup-guide-microsoft-step-1 = Gehen Sie zu Azure Portal > App Registrations > New registration.
setup-guide-microsoft-step-2 = Waehlen Sie "Web" als Plattformtyp (nicht SPA) fuer eine zuverlaessige Synchronisierung im Hintergrund.
setup-guide-microsoft-step-3 = Fuegen Sie die oben angezeigte Redirect-URI unter Authentication > Web hinzu.
setup-guide-microsoft-step-4 = Erstellen Sie unter Certificates & secrets ein Client Secret.
setup-guide-microsoft-step-5 = Aktivieren Sie die erforderlichen Berechtigungen und erteilen Sie bei Bedarf die Admin-Zustimmung.
setup-guide-microsoft-step-6 = Nach dem Speichern koennen Benutzer ihre Microsoft-Konten ueber die Mail-App verbinden.
setup-guide-google-title = Google-Einrichtungsanleitung
setup-guide-google-step-1 = Gehen Sie zu Google Cloud Console > APIs & Services > Credentials.
setup-guide-google-step-2 = Erstellen Sie eine OAuth-2.0-Client-ID (Typ Webanwendung).
setup-guide-google-step-3 = Fuegen Sie die oben angezeigte Redirect-URI unter Authorized redirect URIs hinzu.
setup-guide-google-step-4 = Aktivieren Sie die Gmail API unter APIs & Services > Library.
setup-guide-google-step-5 = Konfigurieren Sie den OAuth-Consent-Screen mit den erforderlichen Scopes.
setup-guide-google-step-6 = Nach dem Speichern koennen Benutzer ihre Google-Konten ueber die Mail-App verbinden.
setup-guide-imap-smtp-title = IMAP-/SMTP-Einrichtung
setup-guide-imap-smtp-step-1 = Keine externe App-Registrierung erforderlich.
setup-guide-imap-smtp-step-2 = Aktivieren Sie diesen Anbieter, damit Benutzer jedes E-Mail-Konto manuell verbinden koennen.
setup-guide-imap-smtp-step-3 = Optional koennen Sie Standard-Serverdaten vorbelegen, damit Benutzer nur noch ihre Zugangsdaten eingeben muessen.
setup-guide-imap-smtp-step-4 = Benutzer geben ihre E-Mail-Adresse, ihr Passwort und die Serverdaten ein, sofern diese nicht vorbelegt sind.

# Errors
error-load-settings = Einstellungen konnten nicht geladen werden
error-load-assistant-policy = Assistant-Richtlinie konnte nicht geladen werden
error-save-assistant-policy = Assistant-Richtlinie konnte nicht gespeichert werden

# Provider settings
provider-name-microsoft = Microsoft 365 / Outlook
provider-name-google = Google / Gmail
provider-description-microsoft = Konfigurieren Sie die Azure-App-Registrierung fuer Microsoft OAuth. Benutzer koennen dann ihre Microsoft-E-Mail-Konten verbinden.
provider-description-google = Konfigurieren Sie Google-OAuth-Anmeldedaten. Benutzer koennen dann ihre Gmail- oder Google-Workspace-Konten verbinden.
provider-toast-client-id-required = Client-ID ist erforderlich
provider-toast-settings-saved = Einstellungen fuer { $providerName } wurden erfolgreich gespeichert
provider-toast-save-failed = Einstellungen konnten nicht gespeichert werden
provider-label-client-id-microsoft = Anwendungs-(Client-)ID
provider-label-client-id-google = OAuth-Client-ID
provider-hint-client-id-microsoft = Aus Azure Portal > App Registrations > Ihre App > Overview
provider-hint-client-id-google = Aus Google Cloud Console > APIs & Services > Credentials
provider-label-authority = Authority / Tenant
provider-placeholder-authority = organizations
provider-hint-authority = Verwenden Sie "organizations" fuer Arbeits- oder Schulkonten, "common" fuer alle Konten oder eine spezifische Mandanten-ID.
provider-label-client-secret = Client Secret
provider-placeholder-client-secret-existing = (Secret bereits konfiguriert - leer lassen, um es beizubehalten)
provider-placeholder-client-secret-empty = Client Secret eingeben
provider-hint-client-secret-microsoft = Erforderlich fuer die E-Mail-Synchronisierung im Hintergrund (vertrauliche App). Aus Azure Portal > Certificates & secrets.
provider-hint-client-secret-google = Erforderlich fuer den serverseitigen Token-Austausch. Aus Google Cloud Console > Credentials.
provider-label-redirect-uri = Redirect-URI (diese Ihrer App-Registrierung hinzufuegen)
provider-label-admin-consent-url = Admin-Consent-URL
provider-hint-admin-consent = Wenn Benutzer "Need admin approval" sehen, oeffnen Sie diesen Link, um die Zustimmung fuer die konfigurierten Scopes zu erteilen.
provider-label-enable-provider = Diesen Anbieter fuer Benutzer aktivieren
provider-button-save-settings = Einstellungen fuer { $providerName } speichern

# IMAP / SMTP
imap-card-title = IMAP / SMTP (Allgemein)
imap-card-description = Ermoeglichen Sie Benutzern, jedes E-Mail-Konto ueber IMAP/SMTP zu verbinden. Optional koennen Standard-Serverdaten gesetzt werden, damit Benutzer nur ihre Zugangsdaten eingeben muessen.
imap-label-enable-provider = IMAP/SMTP fuer Benutzer aktivieren
imap-defaults-title = Standard-Servereinstellungen (optional)
imap-defaults-description = Belegen Sie Serverdaten vor, damit Benutzer nur noch ihre E-Mail-Adresse und ihr Passwort eingeben muessen. Lassen Sie Felder leer, damit Benutzer alles selbst konfigurieren koennen.
imap-label-imap-host = Standard-IMAP-Host
imap-placeholder-imap-host = z. B. imap.company.com
imap-label-imap-port = Standard-IMAP-Port
imap-placeholder-imap-port = 993
imap-label-smtp-host = Standard-SMTP-Host
imap-placeholder-smtp-host = z. B. smtp.company.com
imap-label-smtp-port = Standard-SMTP-Port
imap-placeholder-smtp-port = 587
imap-toast-settings-saved = IMAP/SMTP-Einstellungen wurden erfolgreich gespeichert
imap-button-save-settings = IMAP/SMTP-Einstellungen speichern

# Assistant policy
assistant-title = Richtlinie fuer den E-Mail-Assistenten
assistant-description = Konfigurieren Sie das Verhalten des Assistenten fuer Ihren Tenant.
assistant-label-culture-summary = Kultur-Zusammenfassung
assistant-label-preferred-phrases = Bevorzugte Formulierungen (eine pro Zeile)
assistant-label-disallowed-phrases = Nicht erlaubte Formulierungen (eine pro Zeile)
assistant-label-required-courtesy-markers = Erforderliche Hoeflichkeitsmarker (eine pro Zeile)
assistant-label-default-formality = Standard-Formalitaet
assistant-option-formal = Formal
assistant-option-neutral = Neutral
assistant-option-informal = Informell
assistant-label-history-window-size = Groesse des Verlaufsfensters
assistant-label-advisory-only = Nur hinweisend (der Assistent blockiert das Senden nie)
assistant-validation-history-window-size = Die Groesse des Verlaufsfensters muss zwischen { $min } und { $max } liegen
assistant-button-save = Richtlinie speichern
assistant-button-saving = Richtlinie wird gespeichert...

# Permissions
permissions-title = Berechtigungen
permissions-custom-scopes-title = Eigene Scopes
permissions-placeholder-custom-scope = Eigenen Scope hinzufuegen...
permissions-note-granted = Status-Badges zeigen, welche Berechtigungen auf Anbieterseite tatsaechlich aktiv sind (erfasst bei der letzten erfolgreichen Benutzerverbindung). "Nicht gewaehrt" bedeutet, dass der Scope hier konfiguriert ist, aber in Ihrer App-Registrierung noch nicht genehmigt wurde.
permissions-note-pending = Verbinden Sie ein Testkonto, um zu pruefen, welche Berechtigungen auf Anbieterseite aktiv sind. Status-Badges erscheinen, sobald sich ein Benutzer erfolgreich verbunden hat.

# Microsoft permissions
permission-microsoft-openid-label = OpenID
permission-microsoft-openid-description = Grundlegende Identitaet
permission-microsoft-profile-label = Profil
permission-microsoft-profile-description = Benutzerprofilinformationen
permission-microsoft-email-label = E-Mail-Identitaet
permission-microsoft-email-description = E-Mail-Adresse des Benutzers
permission-microsoft-offline-access-label = Offline-Zugriff
permission-microsoft-offline-access-description = Refresh-Tokens fuer Hintergrundsynchronisierung
permission-microsoft-mail-read-label = E-Mails lesen
permission-microsoft-mail-read-description = Benutzerpostfach lesen
permission-microsoft-mail-send-label = E-Mails senden
permission-microsoft-mail-send-description = E-Mails im Namen des Benutzers senden
permission-microsoft-mail-readwrite-label = E-Mails lesen/schreiben
permission-microsoft-mail-readwrite-description = Voller Zugriff auf das Postfach
permission-microsoft-calendars-read-label = Kalender lesen
permission-microsoft-calendars-read-description = Kalenderereignisse anzeigen
permission-microsoft-calendars-readwrite-label = Kalender lesen/schreiben
permission-microsoft-calendars-readwrite-description = Kalenderereignisse verwalten
permission-microsoft-contacts-read-label = Kontakte lesen
permission-microsoft-contacts-read-description = Benutzerkontakte anzeigen

# Google permissions
permission-google-openid-label = OpenID
permission-google-openid-description = Grundlegende Identitaet
permission-google-email-label = E-Mail-Identitaet
permission-google-email-description = E-Mail-Adresse des Benutzers
permission-google-profile-label = Profil
permission-google-profile-description = Benutzerprofilinformationen
permission-google-mail-full-label = Voller Mail-Zugriff
permission-google-mail-full-description = E-Mails lesen, senden und verwalten
permission-google-calendar-readonly-label = Kalender lesen
permission-google-calendar-readonly-description = Kalenderereignisse anzeigen
permission-google-contacts-readonly-label = Kontakte lesen
permission-google-contacts-readonly-description = Benutzerkontakte anzeigen
