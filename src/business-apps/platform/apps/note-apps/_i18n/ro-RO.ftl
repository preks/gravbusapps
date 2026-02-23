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
search-to-select = pentru selectare
search-k-to-open = K pentru deschidere
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
action-items-toast-error = Nu s-au putut trimite elementele de acțiune
action-items-blink-failed = Nu s-a putut trimite blink-ul

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
kanban-placeholder-enter-content = Introduceți conținutul cardului...
kanban-empty = Gol
kanban-assign-customize = Atribuiți și personalizați
kanban-assign-to = Atribuiți la
kanban-unassign = Revocați atribuirea
kanban-no-participants = Fără participanți
kanban-card-color = Culoare card
kanban-linked-to-task = Legat de element sarcină
kanban-add = Adaugă
kanban-column = Coloană
kanban-new-column = Coloană nouă
kanban-color-default = Implicit
kanban-color-red = Roșu
kanban-color-orange = Portocaliu
kanban-color-yellow = Galben
kanban-color-green = Verde
kanban-color-blue = Albastru
kanban-color-purple = Mov
kanban-color-pink = Roz
kanban-column-todo = De făcut
kanban-column-in-progress = În desfășurare
kanban-column-done = Finalizat
kanban-filter-all = Show all cards

# TemplateGallery
template-title = Choose a Template
template-description = Start with a pre-built template to save time
template-search-placeholder = Search templates...
template-tab-all = All
template-no-templates = No templates found
template-try-different = Try a different search term
template-category-meetings = Întâlniri
template-category-projects = Proiecte
template-category-personal = Personal
template-category-work = Munca
template-category-other = Altele
template-built-in = Integrat
template-cancel = Anulare
template-blank-note = Notă goală
template-blank-desc = Începeți cu o pagină goală
template-start-blank = Începe goală

# NoteEditor
editor-back = Înapoi
editor-saving = Se salvează…
editor-unsaved = Modificări nesalvate
editor-not-saved = Nesalvat
editor-saved-just-now = Salvat acum
editor-saved-1-min = Salvat acum 1 minut
editor-saved-mins = Salvat acum { $count } minute
editor-saved-at = Salvat la { $time }
editor-word-count = { $count } cuvinte
editor-char-count = { $count } caractere
editor-synced = Sincronizat
editor-error-unknown = Eroare necunoscută
editor-color-default = Implicit
editor-color-red = Roșu
editor-color-orange = Portocaliu
editor-color-yellow = Galben
editor-color-green = Verde
editor-color-teal = Turcoaz
editor-color-blue = Albastru
editor-color-purple = Mov
editor-color-pink = Roz
editor-color-gray = Gri
editor-format-bold = Bold (⌘B)
editor-format-italic = Italic (⌘I)
editor-format-underline = Subliniat (⌘U)
editor-format-strikethrough = Tăiat
editor-format-heading-1 = Titlu 1
editor-format-heading-2 = Titlu 2
editor-format-heading-3 = Titlu 3
editor-format-bullet-list = Listă cu marcatori
editor-format-numbered-list = Listă numerotată
editor-format-task-list = Listă sarcini
editor-format-quote = Citat
editor-format-code-block = Bloc cod
editor-format-mention = Menționează entitate (@)
editor-format-insert-kanban = Inserează tablou Kanban
editor-add-to-kanban = Adaugă la Kanban
editor-create-kanban-board = Creează tablou Kanban
editor-items-count = { $count } elemente
editor-cards-count = { $count } carduri
editor-kanban-fallback = Kanban
editor-active-collaborators = { $count } activi
editor-comments-tooltip = Comentarii (clic dreapta pe text pentru comentariu inline)
editor-placeholder = Începeți să scrieți… Tastați @ pentru a menționa entități
editor-title-placeholder = Fără titlu
editor-drag-open-tooltip = Trageți pentru mutare • Clic pentru deschidere: { $label }
editor-entity-unknown = Necunoscut
editor-entity-fallback = entitate
editor-change-color = Schimbați culoarea
editor-share-tooltip = Partajare
editor-pin-tooltip = Fixare
editor-unpin-tooltip = Deblocare
editor-locked = Blocat
editor-note-menu = Notă
editor-version-history = Istoric versiuni
editor-save-checkpoint = Salvare punct de verificare
editor-unlock-note = Deblocare notă
editor-lock-note = Blocare notă
editor-publish = Publicare…
editor-duplicate = Duplicare
editor-export = Export
editor-archive = Arhivare
editor-delete = Ștergere
editor-toast-not-authenticated = Neautentificat
editor-toast-no-text = Niciun text de transformat
editor-toast-transform-failed = Transformare eșuată
editor-toast-copied = Copiat în clipboard
editor-toast-plain-text-copied = Text simplu copiat
editor-toast-copied-create-manually = Copiat (creați nota manual)
editor-toast-summary-generated = Rezumat generat
editor-toast-translation-created = Traducere creată
editor-toast-translation-deleted = Traducere ștearsă
editor-toast-action-items-found = Găsite { $count } element{ $count ->
  [one]
 *[other] e
} de acțiune
editor-toast-no-action-items = Niciun element de acțiune găsit

# EntityMention (mention dropdown)
entity-searching = Căutare…
entity-no-results = Niciun rezultat pentru „{ $query }"
entity-type-to-search = Tastați pentru a căuta entități
entity-results-hint = { $count } rezultat{ $count ->
  [one]
 *[other] e
} • ↑↓ pentru navigare, Enter pentru selectare

# useNotes
notes-load-failed = Încărcarea notelor a eșuat
notes-load-note-failed = Încărcarea notei a eșuat

# Transform errors
transform-error-no-handwriting = Nicio manuscris de transformat
transform-error-no-text = Niciun text de transformat
transform-error-ocr-not-configured = Serviciul OCR nu este configurat. Contactați administratorul pentru configurarea cheii API OpenAI.
transform-error-no-text-found = Niciun text găsit în desen
transform-error-ocr-failed = OCR eșuat: { $message }
transform-error-no-action-items = Niciun element de acțiune găsit în notă.
transform-error-no-action-items-short = Niciun element de acțiune găsit.
transform-error-ai-failed-hint = Transformarea AI a eșuat: { $message }. Încercați din nou sau folosiți „{ $copyTextAction }“ pentru rezultatul OCR.
transform-error-transform-failed = Transformare eșuată
transform-error-transform-failed-message = Transformare eșuată: { $message }
transform-error-ai-failed = Transformare AI eșuată

# ShareNoteDialog Blink
share-someone = Cineva
share-blink-note-shared = Notă partajată
share-blink-message = { $initiator } a partajat nota „{ $title }” cu dvs. Faceți clic pe link mai jos pentru a o deschide.

# KanbanBoard
kanban-user-fallback = Utilizator { $id }

# Export
export-untitled = Fără titlu
export-untitled-filename = fară_titlu

# Template names/descriptions
template-name-meeting-notes = Note de întâlnire
template-desc-meeting-notes = Capturați agenda, participanții și elementele de acțiune
template-name-daily-journal = Jurnal zilnic
template-desc-daily-journal = Reflectați asupra zilei cu prompturi pentru gratitudine și obiective
template-name-project-plan = Plan de proiect
template-desc-project-plan = Structurați proiectul cu obiective, etape și sarcini
template-name-weekly-review = Revizuire săptămânală
template-desc-weekly-review = Revizuiți săptămâna și planificați următoarea
template-name-brainstorm = Brainstorming
template-desc-brainstorm = Capturați idei liber cu structură de mapare mintală
template-name-1on1 = Întâlnire 1:1
template-desc-1on1 = Șablon pentru întâlniri one-on-one cu membrii echipei
template-name-bug-report = Raport defecțiune
template-desc-bug-report = Documentați defecțiunile cu pași de reproducere și comportament așteptat

# Translation language names
translation-language-en = Engleză
translation-language-de = Germana
translation-language-es = Spaniolă
translation-language-fr = Franceză
translation-language-it = Italiană
translation-language-pt = Portugheză
translation-language-nl = Olandeză
translation-language-pl = Poloneză
translation-language-ru = Rusă
translation-language-zh = Chineză
translation-language-ja = Japoneză
translation-language-ko = Coreeană
translation-language-ar = Arabă

# useNoteTree
note-tree-load-failed = Încărcarea arborelui de note a eșuat

# HandwritingNote
handwriting-untitled = Fără titlu
handwriting-save-failed = Salvare eșuată
handwriting-save-title = Salvare
handwriting-saving = Se salvează…
handwriting-dismiss-aria = Închide
handwriting-tasks = Sarcini ({ $count })
handwriting-action-items = Elemente de acțiune
handwriting-action-items-desc = Starea blink-urilor create din această notă.
handwriting-clear-confirm = Șterge toată manuscrisul?

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

# Synced missing keys
handwriting-not-authenticated = Not authenticated
handwriting-no-content = No handwriting to transform
handwriting-transform-failed = Transform failed
handwriting-copied = ✓ Copied to clipboard!
handwriting-converted = ✓ Converted to text!
handwriting-text-extracted = ✓ Text extracted!
handwriting-note-created = ✓ Text note created!
handwriting-copied-not-available = ✓ Copied (note creation not available)
handwriting-summary-generated = ✓ Summary generated!
handwriting-action-items-found = ✓ Găsite { $count } element{ $count ->
  [one]
 *[other] e
} de acțiune!
handwriting-no-action-items = Niciun element de acțiune găsit în notă.
handwriting-translation-created = ✓ Traducere creată!
handwriting-translation-deleted = ✓ Traducere ștearsă
handwriting-loaded-existing = Încărcat { $count } element{ $count ->
  [one]
 *[other] e
} de acțiune existent
