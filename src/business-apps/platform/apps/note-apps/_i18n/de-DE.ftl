sidebar-back-to-desk = Back to Desk
sidebar-expand = Expand sidebar
sidebar-collapse = Collapse sidebar
sidebar-brand-title = Notes
sidebar-brand-subtitle = NEWWORK Apps
sidebar-new = New
sidebar-home = Home
sidebar-my-items = My Notes
sidebar-shared = Shared with me
sidebar-pinned = Pinned
sidebar-recent = Recent
sidebar-archived = Archived
sidebar-storage = Storage
sidebar-storage-cloud = Cloud storage
sidebar-storage-notes = { $count } notes

menu-new-text-title = Text Note
menu-new-text-description = Type with keyboard
menu-new-handwriting-title = Handwriting Note
menu-new-handwriting-description = Write with Apple Pencil
menu-new-template-title = From Template
menu-new-template-description = Choose a template

header-sort = Sort
header-search-placeholder = Search...
sort-name = Name
sort-modified = Modified
sort-created = Created
table-owner = Owner

empty-pinned-title = No pinned notes
empty-pinned-description = Pin your important notes to access them quickly.
empty-shared-title = Nothing shared with you
empty-shared-description = When someone shares a note with you, it will appear here.
empty-archived-title = No archived notes
empty-archived-description = Archived notes will appear here.
empty-default-title = No notes yet
empty-default-description = Create your first note to get started.
empty-create-note = Create Note

menu-open = Open
menu-share = Share
menu-copy-link = Copy link
menu-duplicate = Duplicate
menu-pin = Pin
menu-unpin = Unpin
menu-remove-favorite = Remove from favorites
menu-add-favorite = Add to favorites
menu-archive = Archive
menu-delete = Delete

owner-you = You
owner-unknown = Unknown
title-untitled-note = Untitled Note
title-untitled = Untitled
label-shared = Shared
shared-with-count = Shared with { $count } { $count ->
  [one] person
 *[other] people
}
shared-click-manage = Click to manage

confirm-delete = Are you sure you want to delete this note?
toast-note-duplicated = Note duplicated
toast-note-unpinned = Note unpinned
toast-note-pinned = Note pinned
toast-note-archived = Note archived
toast-link-copied = Link copied to clipboard
toast-favorite-removed = Removed from favorites
toast-favorite-added = Added to favorites
toast-text-note-created = Text note created

# Relative time
time-just-now = Just now
time-yesterday = Yesterday
time-minutes-ago = { $count }m ago
time-hours-ago = { $count }h ago
time-days-ago = { $count }d ago
time-days-ago-plural = { $count } days ago

# FolderTreeSidebar
folder-add-note-inside = Add Note Inside
folder-rename = Rename
folder-move-to = Move to...
folder-folders = Folders
folder-new-note = New Note
folder-collapse-sidebar = Collapse Sidebar
folder-all-notes = All Notes
folder-favorites = Favorites
folder-archive = Archive
folder-no-folders = No folders yet
folder-create-to-start = Create a note to get started
folder-settings = Settings

# ShareNoteDialog
share-title = Share "{ $title }"
share-description = Share this note with team members. They'll be able to collaborate in real-time.
share-add-people = Add People
share-search-placeholder = Search by name or email...
share-searching = Searching...
share-sharing = Sharing...
share-no-users = No users found
share-selected-count = Selected ({ $count })
share-permission-label = Permission:
share-permission-view = Can View
share-permission-view-desc = Can view but not make changes
share-permission-comment = Can Comment
share-permission-comment-desc = Can view and add comments
share-permission-edit = Can Edit
share-permission-edit-desc = Can view and edit content
share-permission-owner = Owner
share-permission-owner-desc = Full access including sharing
share-success-blink = Shared successfully! Blink notifications sent.
share-share-with = Share with { $count } { $count ->
  [one] person
 *[other] people
}
share-people-with-access = People with access
share-label-owner = Owner
share-not-shared = Not shared with anyone yet
share-add-above = Add people above to share this note
share-done = Done
share-error-select = Please select at least one user to share with
share-error-failed = Failed to share note. Please try again.
share-toast-success = Shared "{ $title }" with { $count } { $count ->
  [one] person
 *[other] people
}!

# ManageSharesDialog
manage-title = Manage Sharing
manage-description = Manage who has access to "{ $title }"
manage-retry = Retry
manage-load-failed = Failed to load sharing information
manage-people-tab = People ({ $count })
manage-links-tab = Share Links ({ $count })
manage-not-shared = This note hasn't been shared with anyone yet.
manage-shared-at = Shared { $date }
manage-create-link = Create Share Link
manage-permission = Permission
manage-expires-optional = Expires (optional)
manage-permission-view-label = View
manage-permission-comment-label = Comment
manage-permission-edit-label = Edit
manage-can-view = Can view
manage-can-comment = Can comment
manage-can-edit = Can edit
manage-creating = Creating...
manage-create-link-btn = Create Link
manage-no-links = No share links created yet.
manage-active = Active
manage-inactive = Inactive
manage-created-at = Created { $date }
manage-expires-at = Expires { $date }
manage-uses-count = { $count } uses
manage-toast-permission = Permission updated
manage-toast-revoked = Access revoked
manage-toast-link-created = Link created and copied to clipboard!
manage-toast-link-copied = Link copied to clipboard!
manage-toast-link-deactivated = Link deactivated
manage-toast-link-deleted = Link deleted

# SearchCommand
search-placeholder = Search notes or type a command...
search-to-close = to close
search-searching = Searching...
search-no-results = No results found for "{ $query }"
search-try-different = Try a different search term
search-start-typing = Start typing to search notes
search-category-recent = Recent
search-category-notes = Notes
search-category-actions = Quick Actions
search-category-create = Create
search-new-note = New Note
search-new-note-desc = Create a blank note
search-new-folder = New Folder
search-new-folder-desc = Create a new folder
search-go-pinned = Go to Pinned
search-go-pinned-desc = View pinned notes
search-go-archive = Go to Archive
search-go-archive-desc = View archived notes
search-go-shared = Go to Shared
search-go-shared-desc = View shared notes
search-to-navigate = to navigate
search-to-select = zum Auswählen
search-k-to-open = K zum Öffnen
search-key-esc = Esc

# NotePreviewCard
preview-shared-by = Shared by { $name }
preview-notes-count = { $count } { $count ->
  [one] note
 *[other] notes
}
preview-menu-edit = Edit
preview-menu-move-to = Move to...
preview-menu-manage-shares = Manage Shares

# ActionItemsModal
action-items-title = Action Items
action-items-desc = Assign action items to team members. Selected items will be sent as blinks.
action-items-tip = Tip: edit wording, remove items you don't want, then assign.
action-items-add = Add
action-items-assign-all = Assign all
action-items-assign-all-desc = Apply one assignee to all action items (you can still change per item).
action-items-assign-all-to = Assign all to…
action-items-search = Search employees...
action-items-no-employees = No employees found
action-items-load-more = Load more
action-items-loading = Loading...
action-items-cancel = Cancel
action-items-no-items = No action items found
action-items-empty = Empty action item
action-items-placeholder = Write an action item...
action-items-save = Save
action-items-assign-to = Assign to...
action-items-sending = Sending...
action-items-send-blinks = Send { $count } Blink{ $count ->
  [one]
 *[other] s
}
action-items-clear-all = Clear all assignees
action-items-toast-select = Select at least one action item with text + assignee
action-items-toast-sent = Sent { $count } action item{ $count ->
  [one]
 *[other] s
} as blinks
action-items-toast-failed-single = Failed to send { $count } action item
action-items-toast-failed-plural = Failed to send { $count } action items
action-items-toast-error = Fehler beim Senden der Aktionspunkte
action-items-blink-failed = Blink konnte nicht gesendet werden

# TransformMenu
transform-label = Transform
transform-copy-text = Copy as Text
transform-copy-text-desc = Extract and copy text
transform-to-text = Convert to Text
transform-to-text-desc = Replace with typed text
transform-create-text-note = Create Text Note
transform-create-text-note-desc = New note with text
transform-summarize = Summarize
transform-summarize-desc = AI summary of content
transform-action-items = Extract Action Items
transform-action-items-desc = Find tasks and to-dos
transform-translate = Translate
transform-translate-desc = Choose target language

# SummaryPanel
summary-title = AI Summary
summary-copy-aria = Copy summary
summary-delete-aria = Delete summary
summary-collapse-aria = Collapse summary
summary-expand-aria = Expand summary

# TranslationPanel
translation-title = Translation
translation-to = to { $language }
translation-copy-aria = Copy translation
translation-delete-aria = Delete translation
translation-collapse-aria = Collapse translation
translation-expand-aria = Expand translation

# Kanban
kanban-placeholder-enter-content = Karteninhalt eingeben...
kanban-empty = Leer
kanban-assign-customize = Zuweisen und anpassen
kanban-assign-to = Zuweisen an
kanban-unassign = Zuweisung aufheben
kanban-no-participants = Keine Teilnehmer
kanban-card-color = Kartenfarbe
kanban-linked-to-task = Mit Aufgabeneintrag verknüpft
kanban-add = Hinzufügen
kanban-column = Spalte
kanban-new-column = Neue Spalte
kanban-color-default = Standard
kanban-color-red = Rot
kanban-color-orange = Orange
kanban-color-yellow = Gelb
kanban-color-green = Grün
kanban-color-blue = Blau
kanban-color-purple = Lila
kanban-color-pink = Pink
kanban-column-todo = Zu erledigen
kanban-column-in-progress = In Arbeit
kanban-column-done = Erledigt
kanban-filter-all = Show all cards

# TemplateGallery
template-title = Choose a Template
template-description = Start with a pre-built template to save time
template-search-placeholder = Search templates...
template-tab-all = All
template-no-templates = No templates found
template-try-different = Try a different search term
template-category-meetings = Meetings
template-category-projects = Projekte
template-category-personal = Persönlich
template-category-work = Arbeit
template-category-other = Sonstiges
template-built-in = Integriert
template-cancel = Abbrechen
template-blank-note = Leere Notiz
template-blank-desc = Mit einer leeren Seite beginnen
template-start-blank = Leer starten

# NoteEditor
editor-back = Zurück
editor-saving = Wird gespeichert…
editor-unsaved = Ungespeicherte Änderungen
editor-not-saved = Noch nicht gespeichert
editor-saved-just-now = Gerade gespeichert
editor-saved-1-min = Vor 1 Minute gespeichert
editor-saved-mins = Vor { $count } Minuten gespeichert
editor-saved-at = Gespeichert um { $time }
editor-word-count = { $count } Wörter
editor-char-count = { $count } Zeichen
editor-synced = Synchronisiert
editor-error-unknown = Unbekannter Fehler
editor-color-default = Standard
editor-color-red = Rot
editor-color-orange = Orange
editor-color-yellow = Gelb
editor-color-green = Grün
editor-color-teal = Türkis
editor-color-blue = Blau
editor-color-purple = Lila
editor-color-pink = Pink
editor-color-gray = Grau
editor-format-bold = Fett (⌘B)
editor-format-italic = Kursiv (⌘I)
editor-format-underline = Unterstrichen (⌘U)
editor-format-strikethrough = Durchgestrichen
editor-format-heading-1 = Überschrift 1
editor-format-heading-2 = Überschrift 2
editor-format-heading-3 = Überschrift 3
editor-format-bullet-list = Aufzählung
editor-format-numbered-list = Nummerierte Liste
editor-format-task-list = Aufgabenliste
editor-format-quote = Zitat
editor-format-code-block = Codeblock
editor-format-mention = Entität erwähnen (@)
editor-format-insert-kanban = Kanban-Board einfügen
editor-add-to-kanban = Zu Kanban hinzufügen
editor-create-kanban-board = Kanban-Board erstellen
editor-items-count = { $count } Elemente
editor-cards-count = { $count } Karten
editor-kanban-fallback = Kanban
editor-active-collaborators = { $count } aktiv
editor-comments-tooltip = Kommentare (Rechtsklick auf Text für Inline-Kommentar)
editor-placeholder = Schreiben Sie… Tippen Sie @ zum Erwähnen von Entitäten
editor-title-placeholder = Unbenannt
editor-drag-open-tooltip = Ziehen zum Verschieben • Klicken zum Öffnen: { $label }
editor-entity-unknown = Unbekannt
editor-entity-fallback = Entität
editor-change-color = Farbe ändern
editor-share-tooltip = Teilen
editor-pin-tooltip = Anheften
editor-unpin-tooltip = Loslösen
editor-locked = Gesperrt
editor-note-menu = Notiz
editor-version-history = Versionsverlauf
editor-save-checkpoint = Checkpoint speichern
editor-unlock-note = Notiz entsperren
editor-lock-note = Notiz sperren
editor-publish = Veröffentlichen…
editor-duplicate = Duplikat
editor-export = Exportieren
editor-archive = Archivieren
editor-delete = Löschen
editor-toast-not-authenticated = Nicht authentifiziert
editor-toast-no-text = Kein Text zum Umwandeln
editor-toast-transform-failed = Umwandlung fehlgeschlagen
editor-toast-copied = In Zwischenablage kopiert
editor-toast-plain-text-copied = Nur-Text kopiert
editor-toast-copied-create-manually = Kopiert (Notiz manuell erstellen)
editor-toast-summary-generated = Zusammenfassung erstellt
editor-toast-translation-created = Übersetzung erstellt
editor-toast-translation-deleted = Übersetzung gelöscht
editor-toast-action-items-found = { $count } Aktionspunkt{ $count ->
  [one]
 *[other] e
} gefunden
editor-toast-no-action-items = Keine Aktionspunkte gefunden

# EntityMention (mention dropdown)
entity-searching = Suche…
entity-no-results = Keine Ergebnisse für „{ $query }"
entity-type-to-search = Tippen zum Suchen von Entitäten
entity-results-hint = { $count } Ergebnis{ $count ->
  [one]
 *[other] se
} • ↑↓ zum Navigieren, Enter zum Auswählen

# useNotes
notes-load-failed = Notizen konnten nicht geladen werden
notes-load-note-failed = Notiz konnte nicht geladen werden

# Transform errors
transform-error-no-handwriting = Keine Handschrift zum Umwandeln
transform-error-no-text = Kein Text zum Umwandeln
transform-error-ocr-not-configured = OCR-Dienst nicht konfiguriert. Bitte kontaktieren Sie den Administrator zur Einrichtung des OpenAI-API-Schlüssels.
transform-error-no-text-found = Kein Text in der Zeichnung gefunden
transform-error-ocr-failed = OCR fehlgeschlagen: { $message }
transform-error-no-action-items = Keine Aktionspunkte in der Notiz gefunden.
transform-error-no-action-items-short = Keine Aktionspunkte gefunden.
transform-error-ai-failed-hint = KI-Umwandlung fehlgeschlagen: { $message }. Bitte erneut versuchen oder „{ $copyTextAction }“ verwenden, um das OCR-Ergebnis zu erhalten.
transform-error-transform-failed = Umwandlung fehlgeschlagen
transform-error-transform-failed-message = Umwandlung fehlgeschlagen: { $message }
transform-error-ai-failed = KI-Umwandlung fehlgeschlagen

# ShareNoteDialog Blink
share-someone = Jemand
share-blink-note-shared = Notiz geteilt
share-blink-message = { $initiator } hat die Notiz „{ $title }“ mit Ihnen geteilt. Klicken Sie auf den Link unten, um sie zu öffnen.

# KanbanBoard
kanban-user-fallback = Benutzer { $id }

# Export
export-untitled = Unbenannt
export-untitled-filename = unbenannt

# Template names/descriptions
template-name-meeting-notes = Meeting-Notizen
template-desc-meeting-notes = Agenden, Teilnehmer und Aktionspunkte erfassen
template-name-daily-journal = Tägliches Tagebuch
template-desc-daily-journal = Reflektieren Sie Ihren Tag mit Fragen zu Dankbarkeit und Zielen
template-name-project-plan = Projektplan
template-desc-project-plan = Strukturieren Sie Ihr Projekt mit Zielen, Meilensteinen und Aufgaben
template-name-weekly-review = Wochenrückblick
template-desc-weekly-review = Überprüfen Sie Ihre Woche und planen Sie die nächste
template-name-brainstorm = Brainstorming
template-desc-brainstorm = Ideen frei mit Mind-Map-Struktur erfassen
template-name-1on1 = 1:1-Meeting
template-desc-1on1 = Vorlage für Einzelgespräche mit Teammitgliedern
template-name-bug-report = Fehlerbericht
template-desc-bug-report = Fehler mit Reproduktionsschritten und erwartetem Verhalten dokumentieren

# Translation language names
translation-language-en = Englisch
translation-language-de = Deutsch
translation-language-es = Spanisch
translation-language-fr = Französisch
translation-language-it = Italienisch
translation-language-pt = Portugiesisch
translation-language-nl = Niederländisch
translation-language-pl = Polnisch
translation-language-ru = Russisch
translation-language-zh = Chinesisch
translation-language-ja = Japanisch
translation-language-ko = Koreanisch
translation-language-ar = Arabisch

# useNoteTree
note-tree-load-failed = Notizbaum konnte nicht geladen werden

# HandwritingNote
handwriting-untitled = Unbenannt
handwriting-save-failed = Speichern fehlgeschlagen
handwriting-not-authenticated = Nicht authentifiziert
handwriting-no-content = Keine Handschrift zum Umwandeln
handwriting-transform-failed = Umwandlung fehlgeschlagen
handwriting-copied = ✓ In Zwischenablage kopiert!
handwriting-converted = ✓ In Text umgewandelt!
handwriting-text-extracted = ✓ Text extrahiert!
handwriting-note-created = ✓ Textnotiz erstellt!
handwriting-copied-not-available = ✓ Kopiert (Notizerstellung nicht verfügbar)
handwriting-summary-generated = ✓ Zusammenfassung erstellt!
handwriting-action-items-found = ✓ { $count } Aktionspunkt{ $count ->
  [one]
 *[other] e
} gefunden!
handwriting-no-action-items = Keine Aktionspunkte in der Notiz gefunden.
handwriting-translation-created = ✓ Übersetzung erstellt!
handwriting-translation-deleted = ✓ Übersetzung gelöscht
handwriting-loaded-existing = { $count } vorhandene{ $count ->
  [one] r Aktionspunkt
 *[other] Aktionspunkte
} geladen
handwriting-save-title = Speichern
handwriting-saving = Wird gespeichert…
handwriting-dismiss-aria = Schließen
handwriting-tasks = Aufgaben ({ $count })
handwriting-action-items = Aktionspunkte
handwriting-action-items-desc = Status der aus dieser Notiz erstellten Blinks.
handwriting-clear-confirm = Gesamte Handschrift löschen?

# HandwritingToolbar
toolbar-color = Color:
toolbar-size = Size:
toolbar-paper = Paper:
toolbar-undo = Undo last stroke
toolbar-clear = Clear all
toolbar-pen-black = Black
toolbar-pen-blue = Blue
toolbar-pen-red = Red
toolbar-pen-green = Green
toolbar-pen-purple = Purple
toolbar-pen-fine = Fine
toolbar-pen-medium = Medium
toolbar-pen-bold = Bold
toolbar-paper-lined = Lined
toolbar-paper-grid = Grid
toolbar-paper-dotted = Dotted
toolbar-paper-plain = Plain

# ActionItemsList
action-items-list-empty = No action items yet. Use "Transform → Extract Action Items" to create blinks.
action-items-status-completed = Completed
action-items-status-in-progress = In progress
action-items-status-failed = Failed
action-items-status-canceled = Canceled
action-items-status-unknown = Unknown
action-items-sent = Sent: { $date }
action-items-completed = Completed: { $date }
