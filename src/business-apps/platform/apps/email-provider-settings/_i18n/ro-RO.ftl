# Common
back-button-label = Inapoi la setarile de e-mail
common-enabled = Activat
common-disabled = Dezactivat
common-active = Activ
common-not-granted = Neaprobat
common-secret-configured = Secret configurat
common-copied-to-clipboard = Copiat in clipboard
common-show-secret = Afiseaza secretul
common-hide-secret = Ascunde secretul
common-open-link = Deschide linkul
common-copy-link = Copiaza linkul
common-add-custom-scope = Adauga un scope personalizat
common-remove-custom-scope = Elimina scope-ul personalizat { $scope }

# Screen
screen-title = Setari furnizor e-mail
screen-description = Configureaza credentialele OAuth pentru ca utilizatorii sa isi poata conecta conturile de e-mail.
tab-microsoft = Microsoft 365
tab-google = Google / Gmail
tab-imap-smtp = IMAP / SMTP
tab-assistant-policy = Politica asistentului

# Setup guide
setup-guide-microsoft-title = Ghid de configurare Microsoft
setup-guide-microsoft-step-1 = Mergi la Azure Portal > App Registrations > New registration.
setup-guide-microsoft-step-2 = Alege "Web" ca tip de platforma (nu SPA) pentru o sincronizare de fundal fiabila.
setup-guide-microsoft-step-3 = Adauga URI-ul de redirectionare afisat mai sus in Authentication > Web.
setup-guide-microsoft-step-4 = Creeaza un Client Secret in Certificates & secrets.
setup-guide-microsoft-step-5 = Activeaza permisiunile necesare si ofera consimtamantul de administrator daca este nevoie.
setup-guide-microsoft-step-6 = Dupa salvare, utilizatorii isi pot conecta conturile Microsoft din aplicatia Mail.
setup-guide-google-title = Ghid de configurare Google
setup-guide-google-step-1 = Mergi la Google Cloud Console > APIs & Services > Credentials.
setup-guide-google-step-2 = Creeaza un OAuth 2.0 Client ID (tipul Web application).
setup-guide-google-step-3 = Adauga URI-ul de redirectionare afisat mai sus la Authorized redirect URIs.
setup-guide-google-step-4 = Activeaza Gmail API in APIs & Services > Library.
setup-guide-google-step-5 = Configureaza ecranul de consimtamant OAuth cu scope-urile necesare.
setup-guide-google-step-6 = Dupa salvare, utilizatorii isi pot conecta conturile Google din aplicatia Mail.
setup-guide-imap-smtp-title = Configurare IMAP / SMTP
setup-guide-imap-smtp-step-1 = Nu este necesara nicio inregistrare externa de aplicatie.
setup-guide-imap-smtp-step-2 = Activeaza acest furnizor pentru a permite utilizatorilor sa conecteze manual orice cont de e-mail.
setup-guide-imap-smtp-step-3 = Optional, poti precompleta detaliile implicite ale serverului, astfel incat utilizatorii sa introduca doar credentialele lor.
setup-guide-imap-smtp-step-4 = Utilizatorii vor introduce adresa de e-mail, parola si detaliile serverului, daca acestea nu sunt precompletate.

# Errors
error-load-settings = Setarile nu au putut fi incarcate
error-load-assistant-policy = Politica asistentului nu a putut fi incarcata
error-save-assistant-policy = Politica asistentului nu a putut fi salvata

# Provider settings
provider-name-microsoft = Microsoft 365 / Outlook
provider-name-google = Google / Gmail
provider-description-microsoft = Configureaza Azure App Registration pentru Microsoft OAuth. Utilizatorii isi vor putea conecta conturile Microsoft de e-mail.
provider-description-google = Configureaza credentialele Google OAuth. Utilizatorii isi vor putea conecta conturile Gmail sau Google Workspace.
provider-toast-client-id-required = Client ID este obligatoriu
provider-toast-settings-saved = Setarile pentru { $providerName } au fost salvate cu succes
provider-toast-save-failed = Setarile nu au putut fi salvate
provider-label-client-id-microsoft = Application (Client) ID
provider-label-client-id-google = OAuth Client ID
provider-hint-client-id-microsoft = Din Azure Portal > App Registrations > Aplicatia ta > Overview
provider-hint-client-id-google = Din Google Cloud Console > APIs & Services > Credentials
provider-label-authority = Authority / Tenant
provider-placeholder-authority = organizations
provider-hint-authority = Foloseste "organizations" pentru conturi de serviciu sau scoala, "common" pentru toate conturile sau un tenant ID specific.
provider-label-client-secret = Client Secret
provider-placeholder-client-secret-existing = (secret deja configurat - lasa gol pentru a-l pastra)
provider-placeholder-client-secret-empty = Introdu client secretul
provider-hint-client-secret-microsoft = Necesar pentru sincronizarea de fundal a e-mailului (aplicatie confidentiala). Din Azure Portal > Certificates & secrets.
provider-hint-client-secret-google = Necesar pentru schimbul de token pe server. Din Google Cloud Console > Credentials.
provider-label-redirect-uri = Redirect URI (adauga-l in inregistrarea aplicatiei)
provider-label-admin-consent-url = URL de consimtamant admin
provider-hint-admin-consent = Daca utilizatorii vad "Need admin approval", deschide acest link pentru a acorda consimtamantul pentru scope-urile configurate.
provider-label-enable-provider = Activeaza acest furnizor pentru utilizatori
provider-button-save-settings = Salveaza setarile pentru { $providerName }

# IMAP / SMTP
imap-card-title = IMAP / SMTP (Generic)
imap-card-description = Permite utilizatorilor sa conecteze orice cont de e-mail prin IMAP/SMTP. Optional, poti seta detalii implicite ale serverului astfel incat utilizatorii sa introduca doar credentialele lor.
imap-label-enable-provider = Activeaza IMAP/SMTP pentru utilizatori
imap-defaults-title = Setari implicite server (optional)
imap-defaults-description = Precompleteaza detaliile serverului astfel incat utilizatorii sa introduca doar adresa de e-mail si parola. Lasa campurile goale daca vrei ca utilizatorii sa configureze totul singuri.
imap-label-imap-host = Host IMAP implicit
imap-placeholder-imap-host = ex. imap.company.com
imap-label-imap-port = Port IMAP implicit
imap-placeholder-imap-port = 993
imap-label-smtp-host = Host SMTP implicit
imap-placeholder-smtp-host = ex. smtp.company.com
imap-label-smtp-port = Port SMTP implicit
imap-placeholder-smtp-port = 587
imap-toast-settings-saved = Setarile IMAP/SMTP au fost salvate cu succes
imap-button-save-settings = Salveaza setarile IMAP/SMTP

# Assistant policy
assistant-title = Politica asistentului de e-mail
assistant-description = Configureaza comportamentul asistentului pentru tenantul tau.
assistant-label-culture-summary = Rezumat cultural
assistant-label-preferred-phrases = Expresii preferate (una pe linie)
assistant-label-disallowed-phrases = Expresii nepermise (una pe linie)
assistant-label-required-courtesy-markers = Formule de politete obligatorii (una pe linie)
assistant-label-default-formality = Formalitate implicita
assistant-option-formal = Formal
assistant-option-neutral = Neutru
assistant-option-informal = Informal
assistant-label-history-window-size = Dimensiunea ferestrei de istoric
assistant-label-advisory-only = Doar consultativ (asistentul nu blocheaza niciodata trimiterea)
assistant-validation-history-window-size = Dimensiunea ferestrei de istoric trebuie sa fie intre { $min } si { $max }
assistant-button-save = Salveaza politica
assistant-button-saving = Se salveaza politica...

# Permissions
permissions-title = Permisiuni
permissions-custom-scopes-title = Scope-uri personalizate
permissions-placeholder-custom-scope = Adauga un scope personalizat...
permissions-note-granted = Badge-urile de stare arata ce permisiuni sunt active efectiv la furnizor (capturate la ultima conectare reusita a unui utilizator). "Neaprobat" inseamna ca scope-ul este configurat aici, dar nu este inca aprobat in inregistrarea aplicatiei tale.
permissions-note-pending = Conecteaza un cont de test pentru a verifica ce permisiuni sunt active la furnizor. Badge-urile de stare vor aparea dupa ce un utilizator se conecteaza cu succes.

# Microsoft permissions
permission-microsoft-openid-label = OpenID
permission-microsoft-openid-description = Identitate de baza
permission-microsoft-profile-label = Profil
permission-microsoft-profile-description = Informatii despre profilul utilizatorului
permission-microsoft-email-label = Identitate e-mail
permission-microsoft-email-description = Adresa de e-mail a utilizatorului
permission-microsoft-offline-access-label = Acces offline
permission-microsoft-offline-access-description = Token-uri de refresh pentru sincronizare in fundal
permission-microsoft-mail-read-label = Citire e-mailuri
permission-microsoft-mail-read-description = Citeste casuta postala a utilizatorului
permission-microsoft-mail-send-label = Trimitere e-mailuri
permission-microsoft-mail-send-description = Trimite e-mailuri in numele utilizatorului
permission-microsoft-mail-readwrite-label = Citire/scriere e-mailuri
permission-microsoft-mail-readwrite-description = Acces complet la casuta postala
permission-microsoft-calendars-read-label = Citire calendare
permission-microsoft-calendars-read-description = Vizualizeaza evenimentele din calendar
permission-microsoft-calendars-readwrite-label = Citire/scriere calendare
permission-microsoft-calendars-readwrite-description = Administreaza evenimentele din calendar
permission-microsoft-contacts-read-label = Citire contacte
permission-microsoft-contacts-read-description = Vizualizeaza contactele utilizatorului

# Google permissions
permission-google-openid-label = OpenID
permission-google-openid-description = Identitate de baza
permission-google-email-label = Identitate e-mail
permission-google-email-description = Adresa de e-mail a utilizatorului
permission-google-profile-label = Profil
permission-google-profile-description = Informatii despre profilul utilizatorului
permission-google-mail-full-label = Acces complet la e-mail
permission-google-mail-full-description = Citeste, trimite si administreaza e-mailuri
permission-google-calendar-readonly-label = Citire calendare
permission-google-calendar-readonly-description = Vizualizeaza evenimentele din calendar
permission-google-contacts-readonly-label = Citire contacte
permission-google-contacts-readonly-description = Vizualizeaza contactele utilizatorului
