# Sidebar
sidebar-back-to-desk = Back to Desk
sidebar-expand = Expand sidebar
sidebar-collapse = Collapse sidebar
sidebar-brand-title = Documents
sidebar-brand-subtitle = NEWWORK Apps
sidebar-new = New
sidebar-home = Home
sidebar-my-items = My Documents
sidebar-shared = Shared with me
sidebar-templates = Templates
sidebar-favorites = Favorites
sidebar-recent = Recent
sidebar-archived = Archived
sidebar-storage = Storage
sidebar-storage-cloud = Cloud storage
sidebar-storage-local = Local storage
sidebar-storage-documents = { $count } documents

# Create menu
menu-new-blank-title = Blank Document
menu-new-blank-description = Start from scratch
menu-new-upload-word-title = Upload Word
menu-new-upload-word-description = Import .docx or .doc file
menu-new-upload-pdf-title = Upload PDF
menu-new-upload-pdf-description = Import PDF for search and Q&A
menu-new-upload-odf-title = Upload ODF
menu-new-upload-odf-description = Import .odt OpenDocument file
menu-new-from-template-title = From Template
menu-new-from-template-description = Choose a template
menu-new-create-template-title = Create Template
menu-new-create-template-description = Create a new template

# Header and list
header-sort = Sort
header-search-placeholder = Search...
sort-name = Name
sort-modified = Modified
sort-created = Created
table-owner = Owner
menu-open = Open
menu-share = Share
menu-manage-sharing = Manage sharing
menu-copy-link = Copy link
menu-duplicate = Duplicate
menu-send-for-approval = Send for Approval
menu-remove-favorite = Remove from favorites
menu-add-favorite = Add to favorites
menu-delete = Delete

# Upload and templates
common-cancel = Cancel
upload-word-title = Upload Word Document
upload-word-description = Upload your Word document and we will preserve the formatting
upload-pdf-title = Upload PDF Document
upload-pdf-description = Upload a PDF to make it searchable and available for Q&A in Desk
upload-odf-title = Upload ODF Document
upload-odf-description = Upload your OpenDocument text file and we will preserve the formatting
templates-title = Templates

# Empty states
empty-favorites-title = No favorites yet
empty-favorites-description = Star your frequently used documents to see them here.
empty-shared-title = Nothing shared with you
empty-shared-description = When someone shares a document with you, it will appear here.
empty-archived-title = No archived documents
empty-archived-description = Archived documents will appear here.
empty-default-title = No documents yet
empty-default-description = Create your first document to get started.
empty-create-document = Create Document
empty-upload-word = Upload Word

# Status and owner
status-pending = Pending
status-approved = Approved
status-shared = Shared
owner-you = You
owner-unknown = Unknown
title-untitled = Untitled
title-untitled-document = Untitled Document

# Toasts and confirmations
confirm-delete = Are you sure you want to delete this document?
toast-duplicated = Document duplicated
toast-removed-favorites = Removed from favorites
toast-added-favorites = Added to favorites
toast-link-copied = Link copied to clipboard
toast-pdf-uploaded = PDF uploaded successfully

# Shared tooltip
shared-with-count = Shared with { $count } { $count ->
  [one] person
 *[other] people
}
shared-click-manage = Click to manage

# Editor
editor-back = Back to documents
editor-title-placeholder = Document Title
editor-word-count = { $count } words
editor-character-count = { $count } characters
editor-saving = Saving...
editor-unsaved = Unsaved changes
editor-export = Export
editor-export-word = Export as Word (.doc)
editor-export-pdf = Export as PDF
editor-print = Print
editor-save-template = Save as Template
editor-save = Save
editor-content-placeholder = Start writing your document...
editor-status-not-saved = Not saved
editor-status-saved-now = Saved just now
editor-status-saved-minute = Saved 1 minute ago
editor-status-saved-minutes = Saved { $count } minutes ago
editor-status-saved-at = Saved at { $time }

# Relative time (for lists, dates)
time-just-now = Gerade eben
time-minutes-ago = Vor { $count } Min.
time-hours-ago = Vor { $count } Std.
time-days-ago = Vor { $count } Tagen
time-yesterday = Gestern
time-days-ago-count = Vor { $count } Tagen
time-shared-just-now = Gerade eben
time-shared-hours-ago = Vor { $count } Std.
time-shared-days-ago = Vor { $count } Tagen

# Table column headers (used in list view)
table-name = Name
table-modified = Geändert
table-created = Erstellt

# Template creation
template-new-prefix = Neu { $name }

# Word uploader
upload-word-processing = Dokument wird verarbeitet...
upload-word-progress = { $progress }% abgeschlossen
upload-word-file-size-exceeds = Dateigröße überschreitet { $max }MB-Limit
upload-word-preview = Vorschau
upload-word-images-found = { $count } Bilder gefunden
upload-word-parsed-ready = Dokument erfolgreich geparst. Bereit zur Bearbeitung!
upload-word-parse-failed = Dokument konnte nicht geparst werden
upload-word-try-again = Erneut versuchen
upload-word-drop-here = Datei hier ablegen
upload-word-title-dropzone = Word-Dokument hochladen
upload-word-drag-drop = Ziehen Sie Ihr Word-Dokument hierher oder klicken Sie zum Durchsuchen. Wir unterstützen .docx-Dateien (Word 2007+) bis { $max }MB.
upload-word-browse = Dateien durchsuchen
upload-word-format-docx = .docx (Word 2007+)
upload-word-formatting-preserved = Formatierung erhalten
upload-word-formatting-description = Wir behalten Ihre Überschriften, Listen, Tabellen und Bilder bei

# PDF uploader
upload-pdf-select-pdf = Bitte wählen Sie eine PDF-Datei
upload-pdf-upload-failed = PDF-Upload fehlgeschlagen
upload-pdf-uploading = PDF wird hochgeladen...
upload-pdf-progress = { $progress }% abgeschlossen
upload-pdf-uploaded-indexed = PDF hochgeladen und indexiert
upload-pdf-success-message = PDF erfolgreich hochgeladen. Das Dokument wird nach Abschluss der Indizierung durchsuchbar und für Q&A verfügbar sein.
upload-pdf-try-again = Erneut versuchen
upload-pdf-drop-here = PDF hier ablegen
upload-pdf-title-dropzone = PDF-Dokument hochladen
upload-pdf-drag-drop = Ziehen Sie Ihre PDF hierher oder klicken Sie zum Durchsuchen. Wir unterstützen PDF-Dateien bis { $max }MB. Der Inhalt wird für Suche und Q&A extrahiert.
upload-pdf-browse = Dateien durchsuchen
upload-pdf-format = .pdf (PDF-Dokumente)
upload-pdf-searchable = Durchsuchbar & indexiert
upload-pdf-searchable-description = Text wird für Suche und Q&A extrahiert. PDF bleibt schreibgeschützt zur Ansicht.

# ODF uploader
upload-odf-processing = Dokument wird verarbeitet...
upload-odf-progress = { $progress }% abgeschlossen
upload-odf-title-dropzone = ODF-Dokument hochladen
upload-odf-drag-drop = Ziehen Sie Ihre OpenDocument-Textdatei hierher oder klicken Sie zum Durchsuchen. Wir unterstützen .odt-Dateien bis { $max }MB.
upload-odf-format = .odt (OpenDocument Text)

# Template gallery
templates-gallery-title = Vorlagen-Galerie
templates-gallery-subtitle = Beginnen Sie mit einer Vorlage, um Zeit zu sparen
templates-search-placeholder = Vorlagen suchen...
templates-all = Alle Vorlagen
templates-built-in = Integriert
templates-public = Öffentlich
templates-used-times = { $count } mal verwendet
templates-empty-title = Keine Vorlagen gefunden
templates-empty-search = Versuchen Sie einen anderen Suchbegriff
templates-empty-category = Keine Vorlagen in dieser Kategorie verfügbar
templates-category-contracts = Verträge
templates-category-contracts-desc = Vereinbarungen und Verträge
templates-category-agreements = Vereinbarungen
templates-category-agreements-desc = Geschäftsvereinbarungen
templates-category-letters = Briefe
templates-category-letters-desc = Geschäftskorrespondenz
templates-category-reports = Berichte
templates-category-reports-desc = Berichte und Zusammenfassungen
templates-category-proposals = Vorschläge
templates-category-proposals-desc = Geschäftsvorschläge
templates-category-policies = Richtlinien
templates-category-policies-desc = Unternehmensrichtlinien
templates-category-procedures = Verfahren
templates-category-procedures-desc = Standardverfahren
templates-category-forms = Formulare
templates-category-forms-desc = Formularvorlagen
templates-category-other = Sonstige
templates-category-other-desc = Andere Vorlagen

# Share document dialog
share-dialog-title = Dokument teilen
share-dialog-description = "{ $title }" mit anderen teilen und Zugriffsebene festlegen.
share-dialog-success-title = Dokument geteilt!
share-dialog-success-single = { $name } wurde benachrichtigt und kann jetzt auf dieses Dokument zugreifen.
share-dialog-success-multi = { $count } Personen wurden benachrichtigt und können jetzt auf dieses Dokument zugreifen.
share-dialog-default-permission = Standardberechtigung für neue Benutzer
share-dialog-can-view = Kann ansehen
share-dialog-can-comment = Kann kommentieren
share-dialog-can-edit = Kann bearbeiten
share-dialog-add-people = Personen hinzufügen
share-dialog-search-placeholder = Nach Personen suchen...
share-dialog-no-people = Keine Personen gefunden für "{ $query }"
share-dialog-people-access = Personen mit Zugriff ({ $count })
share-dialog-message-label = Nachricht (optional)
share-dialog-message-placeholder = Nachricht für die Empfänger hinzufügen...
share-dialog-info = Personen, mit denen Sie teilen, erhalten eine Benachrichtigung und können basierend auf ihrer Berechtigung auf das Dokument zugreifen.
share-dialog-sharing = Wird geteilt...
share-dialog-share-button = Teilen
share-dialog-toast = Dokument mit { $count } { $count ->
  [one] Person
 *[other] Personen
} geteilt!
share-dialog-error-select = Bitte wählen Sie mindestens eine Person zum Teilen aus
share-dialog-error-failed = Teilen mit einigen Benutzern fehlgeschlagen
share-dialog-error-general = Dokument konnte nicht geteilt werden. Bitte versuchen Sie es erneut.
share-permission-view = Ansehen
share-permission-comment = Kommentieren
share-permission-edit = Bearbeiten

# Manage shares dialog
manage-shares-title = Freigabe verwalten
manage-shares-description = Personen mit Zugriff auf "{ $title }"
manage-shares-empty = Dieses Dokument wurde noch mit niemandem geteilt.
manage-shares-share-someone = Mit jemandem teilen
manage-shares-person-has = { $count } { $count ->
  [one] Person hat
 *[other] Personen haben
} Zugriff
manage-shares-add-more = Weitere hinzufügen
manage-shares-done = Fertig
manage-shares-loading = Wird geladen...
manage-shares-error = Freigabebenutzer konnten nicht geladen werden
manage-shares-toast-updated = Berechtigung aktualisiert
manage-shares-toast-update-failed = Berechtigung konnte nicht aktualisiert werden
manage-shares-toast-removed = Zugriff für { $name } entfernt
manage-shares-toast-remove-failed = Zugriff konnte nicht entfernt werden
manage-shares-confirm-remove = Zugriff für { $name } entfernen?
manage-shares-shared-at = Geteilt { $time }
manage-shares-user-fallback = dieser Benutzer

# Send for approval dialog
approval-dialog-title = Zur Genehmigung senden
approval-dialog-description = Genehmiger für "{ $title }" auswählen und zur Überprüfung senden.
approval-dialog-success-title = Genehmigungsanfrage gesendet!
approval-dialog-success-message = Die ausgewählten Genehmiger werden benachrichtigt und können Ihr Dokument prüfen.
approval-dialog-approvers = Genehmiger *
approval-dialog-search-placeholder = Nach Genehmigern suchen...
approval-dialog-no-users = Keine Benutzer gefunden für "{ $query }"
approval-dialog-message-label = Nachricht (optional)
approval-dialog-message-placeholder = Nachricht für die Genehmiger hinzufügen...
approval-dialog-due-date = Fälligkeitsdatum (optional)
approval-dialog-info-1 = Genehmiger erhalten eine Aufgabe in ihrem Posteingang zur Überprüfung und Genehmigung oder Ablehnung des Dokuments.
approval-dialog-info-2 = Sie werden benachrichtigt, wenn eine Entscheidung getroffen wurde.
approval-dialog-sending = Wird gesendet...
approval-dialog-send-button = Zur Genehmigung senden
approval-dialog-toast = Genehmigungsanfrage an { $count } { $count ->
  [one] Person
 *[other] Personen
} gesendet!
approval-dialog-error-select = Bitte wählen Sie mindestens einen Genehmiger aus
approval-dialog-error-valid = Keine gültigen Benutzer ausgewählt
approval-dialog-error-send = Genehmigungsanfrage konnte nicht gesendet werden

# Create template dialog
create-template-title = Vorlage erstellen
create-template-description = Geben Sie einen Namen, eine optionale Beschreibung ein und wählen Sie eine Kategorie. Sie können den Inhalt nach der Erstellung bearbeiten.
create-template-name-label = Name
create-template-name-placeholder = z.B. Angebotsschreiben
create-template-description-label = Beschreibung (optional)
create-template-description-placeholder = Kurze Beschreibung der Vorlage
create-template-category-label = Kategorie
create-template-context-label = Kontext
create-template-creating = Wird erstellt…
create-template-create-button = Erstellen

# AI Edit panel
ai-edit-title = KI-Editor
ai-edit-mode-selection = Auswahl bearbeiten
ai-edit-mode-document = Gesamtes Dokument bearbeiten
ai-edit-placeholder = Beschreiben Sie, was Sie ändern möchten (z.B. formeller, kürzer, übersetzen)...
ai-edit-apply = Anwenden
ai-edit-fast-mode = Schnellmodus (Groq)
ai-edit-smart-mode = Intelligenter Modus (OpenAI)

# Quill/Editor heading labels (for picker)
editor-heading-normal = Normal
editor-heading-1 = Überschrift 1
editor-heading-2 = Überschrift 2
editor-heading-3 = Überschrift 3
editor-heading-4 = Überschrift 4
editor-heading-5 = Überschrift 5
editor-heading-6 = Überschrift 6

# Synced missing keys
pdf-back = Back
pdf-download = Download
pdf-open-new-tab = Open in New Tab
pdf-loading = Loading PDF...
pdf-error-title = Failed to load PDF
pdf-try-again = Try Again
pdf-read-only = Read-only
pdf-uploaded = Uploaded
pdf-original = Original
pdf-error-path-not-found = PDF file path not found
pdf-error-load-failed = Failed to load PDF
ai-edit-smart = Smart
ai-edit-fast = Fast
editor-toolbar-undo = Undo (Ctrl+Z)
editor-toolbar-redo = Redo (Ctrl+Y)
editor-toolbar-bold = Bold (Ctrl+B)
editor-toolbar-italic = Italic (Ctrl+I)
editor-toolbar-underline = Underline (Ctrl+U)
editor-toolbar-strike = Strikethrough
editor-toolbar-subscript = Subscript
editor-toolbar-superscript = Superscript
editor-toolbar-text-color = Text Color
editor-toolbar-remove-color = Remove Color
editor-toolbar-highlight = Highlight Color
editor-toolbar-remove-highlight = Remove Highlight
editor-toolbar-align-left = Align Left
editor-toolbar-align-center = Align Center
editor-toolbar-align-right = Align Right
editor-toolbar-justify = Justify
editor-toolbar-bullet-list = Bullet List
editor-toolbar-numbered-list = Numbered List
editor-toolbar-decrease-indent = Decrease Indent
editor-toolbar-increase-indent = Increase Indent
editor-toolbar-quote = Quote
editor-toolbar-code-block = Code Block
editor-toolbar-horizontal-rule = Horizontal Rule
editor-toolbar-insert-link = Insert Link
editor-toolbar-insert-image = Insert Image
editor-toolbar-insert-table = Insert Table
editor-toolbar-page-break = Insert Page Break (Ctrl+Enter)
editor-toolbar-clear-formatting = Clear Formatting
editor-toolbar-font = Schriftart
editor-font-default = Standard
editor-font-arial = Arial
editor-font-times = Times New Roman
editor-font-georgia = Georgia
editor-font-verdana = Verdana
editor-font-courier = Courier New
editor-font-garamond = Garamond
editor-font-trebuchet = Trebuchet MS
editor-toolbar-link-prompt = URL
editor-toolbar-image-prompt = Image URL
editor-back-title = Back to documents
editor-save-document = Save Document
editor-approval-pending = Pending Approval
editor-approval-approved = Approved
editor-approval-rejected = Rejected
editor-approval-more = +{ $count } weitere { $count ->
  [one] Genehmiger
 *[other] Genehmiger
}
editor-document-menu = Document
editor-version-history = Version History
editor-save-checkpoint = Save Checkpoint
editor-unlock-document = Unlock Document
editor-lock-document = Lock Document
editor-publish = Publish...
editor-save-as-template = Save as Template
editor-send-for-approval = Send for Approval
editor-ai-edit = AI Edit
editor-comments-title = Comments (Right-click on text to add inline comment)
editor-locked = Locked
editor-zoom-in = Zoom In
editor-zoom-out = Zoom Out
shared-comment-add = Add Comment
shared-comment-placeholder = Add a comment...
shared-comment-button = Comment
shared-comment-edit-placeholder = Edit comment...
shared-comment-reply-placeholder = Write a reply...
shared-comment-resolved = Resolved
shared-comment-reply = Reply
shared-comment-edit = Edit
shared-comment-resolve = Resolve
shared-comment-delete = Delete
shared-comment-confirm-delete = Are you sure you want to delete this comment?
shared-comment-send = Send
shared-comment-sending = Sending...
shared-comment-cancel = Cancel
shared-comment-send-hint = ⌘+Enter to send
shared-comment-panel-title = Comments
shared-comment-unresolved = unresolved
shared-comment-unresolved-tab = Unresolved
shared-comment-resolved-tab = Resolved
shared-comment-all-caught-up = All caught up!
shared-comment-all-resolved = All comments have been resolved
shared-comment-no-resolved = No resolved comments
shared-comment-resolved-here = Resolved comments will appear here
shared-comment-loading = Loading comments...

# Paged editor additions
editor-approval-approver-alt = Genehmiger
editor-approval-rejector-alt = Ablehner
editor-page-of = Seite { $current } von { $total }
editor-user-fallback = Benutzer

# Template fields panel
template-fields-insert = Feld einfügen
template-fields-search-placeholder = Entitäten suchen...
template-fields-no-match = Keine Felder für „{ $query }“ gefunden
template-fields-loading = Felder werden von GraphQL geladen...
template-fields-load-failed = Fehler beim Laden der Felder: { $message }
template-fields-no-fields = Keine Felder von GraphQL für diesen Typ.
template-fields-fields-label = Felder
template-fields-catalog-values = Katalogwerte (Vertragsart, Beschäftigungsart, Währung)
template-fields-entities-used = In dieser Vorlage verwendete Entitäten
template-fields-no-entity-types = Keine Entitätstypen verfügbar.

# Generate document dialog
generate-document-title = Dokument erstellen
generate-document-description = Wählen Sie eine Vorlage. Platzhalter werden mit den verknüpften Entitätsdaten ersetzt.
generate-document-default-title = Erstelltes Dokument
generate-document-placeholder-status = Platzhalterdaten-Status
generate-document-loading-placeholders = Platzhalter für ausgewählte Vorlage werden geladen…
generate-document-loading-data = Kandidat und zugehörige Daten (job_request, company) werden geladen…
generate-document-fields-available = { $count } { $count ->
  [one] Feld
 *[other] Felder
} verfügbar
generate-document-loading = Wird geladen…
generate-document-no-company-address = Dieses Unternehmen hat keine Adressen in der Datenbank.
generate-document-no-data = Keine Daten für diese Entität bereitgestellt.
generate-document-select-template = Bitte wählen Sie eine Vorlage
generate-document-no-content = Vorlage hat keinen Inhalt
generate-document-created = Dokument erstellt
generate-document-create-failed = Dokument konnte nicht erstellt werden
generate-document-failed = Dokument konnte nicht erstellt werden
generate-document-load-failed = Vorlagen konnten nicht geladen werden
generate-document-no-templates = Keine Vorlagen verfügbar.
generate-document-template-label = Vorlage
generate-document-select-placeholder = Vorlage auswählen
generate-document-generating = Wird erstellt...
generate-document-generate-button = Dokument erstellen

# Document preview card
preview-card-status-draft = Entwurf
preview-card-status-saved = Gespeichert
preview-card-status-pending = Genehmigung ausstehend
preview-card-status-approved = Genehmigt
preview-card-status-rejected = Abgelehnt
preview-card-status-archived = Archiviert
preview-card-just-now = Gerade eben
preview-card-minutes-ago = vor { $count } Min.
preview-card-hour-ago = vor 1 Std.
preview-card-hours-ago = vor { $count } Std.
preview-card-yesterday = Gestern
preview-card-days-ago = vor { $count } Tagen
preview-card-open = Öffnen
preview-card-edit = Bearbeiten
preview-card-duplicate = Duplizieren
preview-card-export = Exportieren
preview-card-share = Teilen
preview-card-manage-sharing = Freigabe verwalten
preview-card-send-approval = Zur Genehmigung senden
preview-card-delete = Löschen
preview-card-words = { $count } Wörter
preview-card-awaiting = Genehmigung durch { $count } { $count ->
  [one] Person
 *[other] Personen
} ausstehend
preview-card-owner-label = Besitzer
preview-card-shared-with-you = Mit Ihnen geteilt
preview-card-by = von { $name }
preview-card-owner = Besitzer: { $name }
preview-card-can-edit = Kann bearbeiten
preview-card-can-comment = Kann kommentieren
preview-card-view-only = Nur Ansicht
preview-card-can-view = Kann ansehen
preview-card-more-people = { $count } weitere Personen
preview-card-shared-with = Geteilt mit { $count }
preview-card-no-documents = Noch keine Dokumente
preview-card-create-first = Erstellen Sie Ihr erstes Dokument oder laden Sie eine vorhandene Word-Datei hoch.
preview-card-create-new = Neues Dokument erstellen

# Editor view toasts
editor-toast-template-saved = Vorlage gespeichert
editor-toast-templates-info = Vorlagen werden hier bearbeitet; verwenden Sie Dokumente für den Genehmigungsworkflow.
editor-toast-save-first = Bitte speichern Sie das Dokument zuerst, bevor Sie es zur Genehmigung senden.

# Word uploader (remaining)
upload-word-drop-here-alt = Datei hier ablegen
upload-word-browse-files = Dateien durchsuchen

# AiEditPreview
ai-preview-applied = Angewendet
ai-preview-preview = Vorschau
ai-preview-selection = Auswahl
ai-preview-full-document = Gesamtes Dokument

# ManageSharesDialog
manage-shares-user-unknown = Unbekannt

# Approval/Share notifications (sent to Flow Engine; used in dialogs)
approval-task-someone = Jemand
approval-task-requested-with-message = { $initiator } hat Ihre Genehmigung für das Dokument "{ $title }" angefordert.\n\nNachricht: { $message }\n\nKlicken Sie auf den Link unten, um zu prüfen und zu genehmigen oder abzulehnen.
approval-task-requested = { $initiator } hat Ihre Genehmigung für das Dokument "{ $title }" angefordert. Klicken Sie auf den Link unten, um zu prüfen und zu genehmigen oder abzulehnen.
approval-task-title = Dokumentgenehmigung: { $title }
approval-task-description = Genehmigungsanfrage für Dokument: { $title }
approval-task-error-send = Genehmigungsanfrage konnte nicht gesendet werden
approval-task-error-create = Genehmigungsaufgabe konnte nicht erstellt werden: { $status }
share-task-someone = Jemand
share-task-permission-edit = bearbeiten
share-task-permission-comment = ansehen und kommentieren
share-task-permission-view = ansehen
share-task-message = { $initiator } hat das Dokument "{ $title }" mit Ihnen geteilt. Sie können dieses Dokument { $permission }.
share-task-message-with-note = { $base }\n\nNachricht: { $message }
share-task-title = Dokument geteilt: { $title }
share-task-description = Benachrichtigung zur Dokumentfreigabe
share-task-error-send = Benachrichtigungen konnten nicht gesendet werden

# Word parser
upload-word-error-old-doc = Das ältere .doc-Format wird nicht unterstützt. Speichern Sie Ihr Dokument als .docx (Word 2007 oder neuer) und versuchen Sie es erneut.
upload-word-error-invalid-type = Ungültiger Dateityp. Bitte laden Sie eine .docx-Datei hoch (Word 2007 oder neuer).
upload-word-error-parse = Dokument konnte nicht geparst werden

# ODF parser
upload-odf-error-invalid-type = Ungültiger Dateityp. Bitte laden Sie eine .odt-Datei hoch (OpenDocument Text).
upload-odf-error-parse = ODF-Dokument konnte nicht geparst werden
odf-parse-message-unexpected-mimetype = Unerwarteter MIME-Typ: { $mimetype }
odf-parse-error-missing-content = Ungültige ODF-Datei: content.xml fehlt
odf-parse-error-content-xml = content.xml konnte nicht geparst werden: { $detail }
odf-parse-error-missing-body = Ungültige ODF-Datei: office:body fehlt
odf-parse-error-missing-text = Ungültige ODF-Datei: office:text fehlt
odf-parse-image-alt = Dokumentbild

# useDocumentTemplates
doc-templates-error-load-templates = Vorlagen konnten nicht geladen werden
doc-templates-toast-load-failed = Vorlage konnte nicht geladen werden
doc-templates-toast-sign-in-create = Bitte melden Sie sich an, um Vorlagen zu erstellen
doc-templates-toast-created = Vorlage erfolgreich erstellt
doc-templates-toast-create-failed = Vorlage konnte nicht erstellt werden
doc-templates-toast-update-failed = Vorlage konnte nicht aktualisiert werden
doc-templates-toast-deleted = Vorlage gelöscht
doc-templates-toast-delete-failed = Vorlage konnte nicht gelöscht werden
doc-templates-toast-document-created = Dokument aus Vorlage erstellt
doc-templates-toast-document-create-failed = Dokument konnte nicht erstellt werden
doc-templates-toast-sign-in-save = Bitte melden Sie sich an, um Vorlagen zu speichern
doc-templates-toast-document-not-found = Dokument nicht gefunden
doc-templates-toast-saved-as-template = Dokument als Vorlage gespeichert
doc-templates-toast-save-as-template-failed = Als Vorlage speichern fehlgeschlagen

# useDocumentApps
doc-apps-error-not-authenticated = Nicht authentifiziert
doc-apps-error-load-documents = Dokumente konnten nicht geladen werden
doc-apps-error-load-document = Dokument konnte nicht geladen werden
doc-apps-toast-document-created = Dokument erfolgreich erstellt
doc-apps-toast-create-failed = Dokument konnte nicht erstellt werden
doc-apps-toast-save-failed = Dokument konnte nicht gespeichert werden
doc-apps-toast-document-deleted = Dokument gelöscht
doc-apps-toast-delete-failed = Dokument konnte nicht gelöscht werden
doc-apps-toast-document-duplicated = Dokument dupliziert
doc-apps-toast-duplicate-failed = Dokument konnte nicht dupliziert werden
doc-apps-toast-share-success = Dokument erfolgreich geteilt
doc-apps-toast-share-failed = Dokument konnte nicht geteilt werden
doc-apps-toast-access-revoked = Zugriff widerrufen
doc-apps-toast-revoke-failed = Zugriff konnte nicht widerrufen werden
doc-apps-toast-sent-approval = Dokument zur Genehmigung gesendet
doc-apps-toast-send-approval-failed = Konnte nicht zur Genehmigung gesendet werden
doc-apps-toast-approval-cancelled = Genehmigung abgebrochen
doc-apps-toast-cancel-approval-failed = Genehmigung konnte nicht abgebrochen werden

# AI Edit
ai-edit-error-generate = KI-Bearbeitung konnte nicht generiert werden

# Template entity fields (fallbacks)
template-field-code = Code
template-field-description = Beschreibung
template-field-id = Id
template-field-value = Wert
template-field-display-name = Anzeigename
template-field-currency = Währung
template-field-currency-ref = Währungsreferenz
template-field-amount = Betrag
template-field-approved-by = Genehmigt von
template-field-approval-date = Genehmigungsdatum
template-field-supervisor-name = Vorgesetzter Name
template-field-unknown-entity = Unbekannte Entität: { $key }
template-field-unknown-error = Unbekannter Fehler
