# Hero
nh-parent-label = Every Office
nh-title = Notes
nh-tabs-aria-label = Note sections
nh-tab-my-notes = My Notes
nh-tab-favorites = Favorites
nh-tab-shared = Shared
nh-tab-pinned = Pinned
nh-tab-recent = Recent
nh-tab-archived = Trash
nh-tab-trash = Trash
nh-refresh = Refresh

sidebar-back-to-desk = Back to Desk
sidebar-expand = Expand sidebar
sidebar-collapse = Collapse sidebar
sidebar-brand-title = Notes
sidebar-section-notes = Notes
sidebar-section-recent = Recent
sidebar-brand-subtitle = NEWWORK Apps
sidebar-new = New
sidebar-home = Home
sidebar-my-items = My Notes
sidebar-shared = Shared with me
sidebar-pinned = Pinned
sidebar-recent = Recent
sidebar-archived = Trash
sidebar-trash = Trash
sidebar-storage = Storage
sidebar-storage-cloud = Cloud storage
sidebar-storage-notes = { $count } notes

menu-new-text-title = Text Note
menu-new-text-description = Type with keyboard
menu-new-handwriting-title = Handwriting Note
menu-new-handwriting-description = Write with Apple Pencil
menu-new-folder-title = New Folder
menu-new-folder-description = Organize notes into groups
menu-new-template-title = From Template
menu-new-template-description = Choose a template

header-sort = Sort
notes-header-search-placeholder = Search notes...
sort-name = Name
sort-modified = Modified
sort-created = Created
table-owner = Owner

empty-pinned-title = No pinned notes
empty-pinned-description = Pin your important notes to access them quickly.
notes-empty-shared-title = Nothing shared with you
notes-empty-shared-description = When someone shares a note with you, it will appear here.
empty-archived-title = No trashed notes
empty-archived-description = Notes moved to trash will appear here.
notes-empty-trash-title = No trashed notes
notes-empty-trash-description = Notes moved to trash will appear here.
notes-empty-default-title = No notes yet
notes-empty-default-description = Create your first note to get started.
empty-create-note = Create Note
loading-message = Loading...

menu-open = Open
menu-share = Share
menu-manage-sharing = Manage sharing
menu-copy-link = Copy link
menu-duplicate = Duplicate
menu-pin = Pin
menu-unpin = Unpin
menu-remove-favorite = Remove from favorites
menu-add-favorite = Add to favorites
menu-archive = Delete
menu-delete = Delete
delete-confirm-title = Move to trash?
delete-confirm-single = "{$name}" will be moved to trash. You can restore it within 30 days.
delete-confirm-multi = {$count} items will be moved to trash. You can restore them within 30 days.
delete-confirm-cancel = Cancel
delete-confirm-action = Move to trash

bulk-selected = {$count} selected

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

confirm-delete = Are you sure you want to move this note to trash?
toast-note-duplicated = Note duplicated
toast-note-unpinned = Note unpinned
toast-note-pinned = Note pinned
toast-note-archived = Note moved to trash
toast-note-restored = Note restored
toast-note-restore-failed = Failed to restore note
toast-note-deleted-permanently = Note deleted permanently
toast-note-delete-permanently-failed = Failed to delete note permanently
toast-link-copied = Link copied to clipboard
toast-favorite-removed = Removed from favorites
toast-favorite-added = Added to favorites
toast-text-note-created = Text note created
toast-folder-created = Folder created
toast-note-moved = Note moved to folder
toast-move-failed = Failed to move note
folder-new-folder-name = New Folder

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
menu-rename = Rename
folder-move-to = Move to...
folder-folders = Folders
folder-new-note = New Note
folder-collapse-sidebar = Collapse Sidebar
folder-all-notes = All Notes
folder-favorites = Favorites
folder-archive = Move to trash
folder-no-folders = No folders yet
folder-create-to-start = Create a note to get started
folder-settings = Settings

# Note sharing (legacy keys — shared UI uses office/sharing/_i18n)
share-selected-count = Selected ({ $count })
share-permission-owner = Owner
share-permission-owner-desc = Full access including sharing
share-success-blink = Shared successfully! Blink notifications sent.
share-share-with = Share with { $count } { $count ->
  [one] person
 *[other] people
}
share-label-owner = Owner
share-error-failed = Failed to share note. Please try again.
share-toast-success = Shared "{ $title }" with { $count } { $count ->
  [one] person
 *[other] people
}!

# Manage share links (legacy — people tab uses office/sharing/_i18n)
manage-people-tab = People ({ $count })
manage-links-tab = Share Links ({ $count })
manage-create-link = Create Share Link
manage-permission = Permission
manage-expires-optional = Expires (optional)
manage-permission-view-label = View
manage-permission-comment-label = Comment
manage-permission-edit-label = Edit
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
search-go-archive = Go to Trash
search-go-archive-desc = View trashed notes
search-go-shared = Go to Shared
search-go-shared-desc = View shared notes
search-to-navigate = to navigate
search-to-select = to select
search-k-to-open = K to open

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
action-items-toast-error = Failed to send action items
action-items-blink-failed = Failed to send blink

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
kanban-column-todo = To Do
kanban-column-in-progress = In Progress
kanban-column-done = Done
kanban-filter-all = Show all cards

# TemplateGallery
template-title = Choose a Template
template-description = Start with a pre-built template to save time
template-search-placeholder = Search templates...
template-tab-all = All
template-no-templates = No templates found
template-try-different = Try a different search term
template-category-meetings = Meetings
template-category-projects = Projects
template-category-personal = Personal
template-category-work = Work
template-category-other = Other
template-built-in = Built-in
template-cancel = Cancel
template-blank-note = Blank Note
template-blank-desc = Start with a clean slate
template-start-blank = Start Blank

# NoteEditor
editor-back = Back
editor-saving = Saving...
editor-unsaved = Unsaved changes
editor-not-saved = Not saved
editor-saved-just-now = Saved just now
editor-saved-1-min = Saved 1 minute ago
editor-saved-mins = Saved { $count } minutes ago
editor-saved-at = Saved at { $time }
editor-word-count = { $count } words
editor-char-count = { $count } characters
editor-synced = Synced
editor-error-unknown = Unknown error
editor-color-default = Default
editor-color-red = Red
editor-color-orange = Orange
editor-color-yellow = Yellow
editor-color-green = Green
editor-color-teal = Teal
editor-color-blue = Blue
editor-color-purple = Purple
editor-color-pink = Pink
editor-color-gray = Gray
editor-format-undo = Undo (⌘Z)
editor-format-redo = Redo (⌘⇧Z)
editor-format-bold = Bold (⌘B)
editor-format-italic = Italic (⌘I)
editor-format-underline = Underline (⌘U)
editor-format-strikethrough = Strikethrough
editor-insert-image = Insert image
note-image-upload-failed = Could not upload the image. Please try again.
note-image-unsupported-type = Only PNG, JPEG, GIF, or WebP images are supported.
note-image-too-large = Images must be 10 MB or smaller.
note-image-upload-no-token = Sign in again to add images.
editor-format-heading-1 = Heading 1
editor-format-heading-2 = Heading 2
editor-format-heading-3 = Heading 3
editor-format-bullet-list = Bullet List
editor-format-numbered-list = Numbered List
editor-format-task-list = Task List
editor-format-quote = Quote
editor-format-code-block = Code Block
editor-format-mention = Mention Entity (@)
editor-format-insert-kanban = Insert Kanban Board
editor-format-insert-table = Insert Table
editor-table-tools-menu = Table actions
editor-table-row-before = Insert row above
editor-table-row-after = Insert row below
editor-table-column-before = Insert column left
editor-table-column-after = Insert column right
editor-table-delete-row = Delete row
editor-table-delete-column = Delete column
editor-table-delete-table = Delete table
editor-add-to-kanban = Add to Kanban
editor-create-kanban-board = Create Kanban Board
editor-items-count = { $count } items
editor-cards-count = { $count } cards
editor-kanban-fallback = Kanban
editor-active-collaborators = { $count } active
editor-comments-tooltip = Comments (Right-click on text to add inline comment)
editor-placeholder = Start writing... Type @ to mention entities
editor-title-placeholder = Untitled
editor-drag-open-tooltip = Drag to move • Click to open { $label }
editor-entity-unknown = Unknown
editor-entity-fallback = entity
editor-change-color = Change color
editor-share-tooltip = Share
editor-pin-tooltip = Pin
editor-unpin-tooltip = Unpin
editor-locked = Locked
editor-locked-readonly = This note is locked. Unlock it before editing.
editor-lock-owner-you = you
editor-lock-owner-unknown = another user
editor-lock-status-you = Locked by you
editor-lock-status-you-expiry = Locked by you until { $time }
editor-lock-status-other = Locked by { $name }
editor-lock-status-other-expiry = Locked by { $name } until { $time }
editor-note-menu = Note
editor-version-history = Version History
editor-save-checkpoint = Save Checkpoint
editor-unlock-note = Unlock Note
editor-owner-unlock-note = Unlock as Owner
editor-lock-note = Lock Note
editor-lock-failed = Could not lock note
editor-unlock-failed = Could not unlock note
editor-publish = Publish...
editor-duplicate = Duplicate
editor-export = Export
editor-archive = Move to trash
editor-toast-not-authenticated = Not authenticated
editor-toast-no-text = No text to transform
editor-toast-transform-failed = Transform failed
editor-toast-copied = Copied to clipboard
editor-toast-plain-text-copied = Plain text copied
editor-toast-copied-create-manually = Copied (create note manually)
editor-toast-summary-generated = Summary generated
editor-toast-translation-created = Translation created
editor-toast-translation-deleted = Translation deleted
editor-toast-action-items-found = Found { $count } action item{ $count ->
  [one]
 *[other] s
}
editor-toast-no-action-items = No action items found

# EntityMention (mention dropdown)
entity-searching = Searching...
entity-no-results = No results for "{ $query }"
entity-type-to-search = Type to search entities
entity-results-hint = { $count } result{ $count ->
  [one]
 *[other] s
} • Use ↑↓ to navigate, Enter to select

# useNotes
notes-load-failed = Failed to load notes
notes-load-note-failed = Failed to load note

# Transform errors (TransformService, TextTransformService)
transform-error-no-handwriting = No handwriting to transform
transform-error-no-text = No text to transform
transform-error-ocr-not-configured = OCR service not configured. Please contact administrator to set up OpenAI API key.
transform-error-no-text-found = No text found in drawing
transform-error-ocr-failed = OCR failed: { $message }
transform-error-no-action-items = No action items found in the note.
transform-error-no-action-items-short = No action items found.
transform-error-ai-failed-hint = AI transformation failed: { $message }. Please try again or use "{ $copyTextAction }" to get the raw OCR result.
transform-error-transform-failed = Transform failed
transform-error-transform-failed-message = Transform failed: { $message }
transform-error-ai-failed = AI transform failed

# ShareNoteDialog Blink
share-someone = Someone
share-blink-note-shared = Note Shared
share-blink-message = { $initiator } shared the note "{ $title }" with you. Click the link below to open it.

# KanbanBoard
kanban-user-fallback = User { $id }

# Export (noteExportUtils)
export-untitled = Untitled
export-untitled-filename = untitled

# Template names/descriptions (noteTemplates)
template-name-meeting-notes = Meeting Notes
template-desc-meeting-notes = Capture meeting agenda, attendees, and action items
template-name-daily-journal = Daily Journal
template-desc-daily-journal = Reflect on your day with prompts for gratitude and goals
template-name-project-plan = Project Plan
template-desc-project-plan = Structure your project with goals, milestones, and tasks
template-name-weekly-review = Weekly Review
template-desc-weekly-review = Review your week and plan for the next one
template-name-brainstorm = Brainstorm
template-desc-brainstorm = Capture ideas freely with mind mapping structure
template-name-1on1 = 1:1 Meeting
template-desc-1on1 = Template for one-on-one meetings with team members
template-name-bug-report = Bug Report
template-desc-bug-report = Document bugs with steps to reproduce and expected behavior

# Translation language names (for UI display)
translation-language-en = English
translation-language-de = German
translation-language-es = Spanish
translation-language-fr = French
translation-language-it = Italian
translation-language-pt = Portuguese
translation-language-nl = Dutch
translation-language-pl = Polish
translation-language-ru = Russian
translation-language-zh = Chinese
translation-language-ja = Japanese
translation-language-ko = Korean
translation-language-ar = Arabic

# Quick Access
qa-all-notes = My Notes
qa-favorites = Favorites
qa-pinned = Pinned
qa-shared = Shared with Me
qa-recent = Recent
qa-archived = Trash
qa-trash = Trash

# Trash
trash-list-refresh = Refresh
trash-list-sort-name = Name
trash-list-sort-trashed-on = Trashed on
trash-list-trashed-on-column = Trashed on
trash-list-owner-badge = My note
trash-list-restore = Restore
trash-list-restoring = Restoring...
trash-list-delete = Delete permanently
trash-list-load-failed = Failed to load trash items
trash-list-item-restored = Note restored
trash-list-item-restore-failed = Failed to restore note
trash-list-item-deleted = Note deleted permanently
trash-list-item-delete-failed = Failed to delete note permanently
trash-bulk-selected = { $count } selected
trash-bulk-restored = { $count } { $count ->
    [one] note
   *[other] notes
  } restored
trash-bulk-deleted = { $count } { $count ->
    [one] note
   *[other] notes
  } deleted permanently
trash-delete-dialog-title-single = Delete permanently?
trash-delete-dialog-title-multiple = Delete { $count } items permanently?
trash-delete-dialog-description-single = "{ $name }" will be permanently deleted and cannot be restored. This action cannot be undone.
trash-delete-dialog-description-multiple = { $count } items will be permanently deleted and cannot be restored. This action cannot be undone.
trash-delete-dialog-cancel = Cancel
trash-delete-dialog-confirm = Delete permanently
trash-delete-dialog-deleting = Deleting...
trashed-readonly-title = This note is in trash
trashed-readonly-description = "{ $title }" is in trash and opens in view-only mode until it is restored.
trashed-readonly-owner-note = To edit this note again, take it out of trash.
trashed-readonly-shared-note = To edit this note again, ask the owner to take it out of trash.
trashed-readonly-go-home = Go to Notes home screen
trashed-readonly-restore = Take out of trash
trashed-readonly-restoring = Restoring...
trashed-readonly-delete = Delete permanently
trashed-readonly-deleting = Deleting...

# Tree sidebar
tree-label = Notes
tree-empty = No notes yet
tree-drag-hint = Drag to reorder or nest notes
tree-drop-inside = Drop inside
tree-drop-after = Drop after

# Keyboard shortcuts
shortcut-toggle-sidebar = Toggle sidebar (⌘B)
shortcut-new-note = New note (⌘N)
shortcut-search = Search (⌘K)

# useNoteTree
note-tree-load-failed = Failed to load note tree

# HandwritingNote
handwriting-preview-disabled-toast = Handwriting notes can be created only when preview is enabled in catalog (preview.enabled).

handwriting-untitled = Untitled
handwriting-save-failed = Failed to save
handwriting-not-authenticated = Not authenticated
handwriting-no-content = No handwriting to transform
handwriting-transform-failed = Transform failed
handwriting-copied = ✓ Copied to clipboard!
handwriting-converted = ✓ Converted to text!
handwriting-text-extracted = ✓ Text extracted!
handwriting-note-created = ✓ Text note created!
handwriting-copied-not-available = ✓ Copied (note creation not available)
handwriting-summary-generated = ✓ Summary generated!
handwriting-action-items-found = ✓ Found { $count } action item{ $count ->
  [one]
 *[other] s
}!
handwriting-no-action-items = No action items found in the note.
handwriting-translation-created = ✓ Translation created!
handwriting-translation-deleted = ✓ Translation deleted
handwriting-loaded-existing = Loaded { $count } existing action item{ $count ->
  [one]
 *[other] s
}
handwriting-save-title = Save
handwriting-saving = Saving...
handwriting-dismiss-aria = Dismiss
handwriting-tasks = Tasks ({ $count })
handwriting-action-items = Action Items
handwriting-action-items-desc = Status of blinks created from this note.
handwriting-clear-confirm = Clear all handwriting?

# HandwritingToolbar
toolbar-color = Color:
toolbar-size = Size:
toolbar-paper = Paper:
toolbar-undo = Undo last stroke
toolbar-redo = Redo stroke
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
kanban-add = Add
kanban-assign-customize = Assign and customize
kanban-assign-to = Assign to
kanban-card-delete = Delete card
kanban-card-delete-cancel = Cancel
kanban-card-delete-confirm = Delete card
kanban-card-delete-description = Delete "{ $content }" from this column? This cannot be undone.
kanban-card-delete-description-empty = Delete this empty card from the column? This cannot be undone.
kanban-card-delete-title = Delete card?
kanban-card-color = Card color
kanban-color-blue = Blue
kanban-color-default = Default
kanban-color-green = Green
kanban-color-orange = Orange
kanban-color-pink = Pink
kanban-color-purple = Purple
kanban-color-red = Red
kanban-color-yellow = Yellow
kanban-column = Column
kanban-column-delete = Delete column
kanban-column-delete-cancel = Cancel
kanban-column-delete-confirm = Delete column
kanban-column-delete-description = Delete the empty column "{ $title }"? This cannot be undone.
kanban-column-delete-description-empty = Delete this empty column? This cannot be undone.
kanban-column-delete-non-empty = Empty this column before deleting it
kanban-column-delete-protected = Built-in columns cannot be deleted
kanban-column-delete-title = Delete column?
kanban-empty = Empty
kanban-linked-to-task = Linked to task
kanban-new-column = New column
kanban-no-participants = No participants
kanban-placeholder-enter-content = Enter card content...
kanban-unassign = Unassign
search-key-esc = Esc
