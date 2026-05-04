# Hero
dh-parent-label = Every Office
dh-title = Documents
dh-tabs-aria-label = Document sections
dh-tab-my-documents = My Documents
dh-tab-shared = Shared
dh-tab-templates = Templates
dh-tab-favorites = Favorites
dh-tab-recent = Recent
dh-tab-trash = Trash

# Sidebar (legacy keys kept for compatibility)
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
sidebar-trash = Trash
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
documents-header-search-placeholder = Search documents...
header-refresh = Refresh
header-selected-count = { $count } { $count ->
  [one] selected
 *[other] selected
}
sort-name = Name
sort-trashed = Trashed on
sort-modified = Modified
sort-created = Created
table-owner = Owner
table-trashed = Trashed on
menu-open = Open
menu-share = Share
menu-manage-sharing = Manage sharing
menu-copy-link = Copy link
menu-duplicate = Duplicate
menu-send-for-approval = Send for Approval
menu-remove-favorite = Remove from favorites
menu-add-favorite = Add to favorites
menu-delete = Delete
delete-confirm-title = Move to trash?
delete-confirm-single = "{$name}" will be moved to trash. You can restore it within 30 days.
delete-confirm-multi = {$count} items will be moved to trash. You can restore them within 30 days.
delete-confirm-action = Move to trash
delete-confirm-cancel = Cancel

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
documents-empty-favorites-title = No favorites yet
documents-empty-favorites-description = Star your frequently used documents to see them here.
documents-empty-shared-title = Nothing shared with you
documents-empty-shared-description = When someone shares a document with you, it will appear here.
documents-empty-trash-title = No trashed documents
documents-empty-trash-description = Documents moved to trash will appear here.
trash-bulk-restore = Restore
trash-bulk-restoring = Restoring...
trash-bulk-delete-permanently = Delete permanently
trash-delete-dialog-title-single = Delete permanently?
trash-delete-dialog-title-multiple = Delete { $count } items permanently?
trash-delete-dialog-description-single = "{ $name }" will be permanently deleted and cannot be restored. This action cannot be undone.
trash-delete-dialog-description-multiple = { $count } items will be permanently deleted and cannot be restored. This action cannot be undone.
trash-delete-dialog-cancel = Cancel
trash-delete-dialog-confirm = Delete permanently
trash-delete-dialog-deleting = Deleting...
documents-empty-default-title = No documents yet
documents-empty-default-description = Create your first document to get started.
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
confirm-delete = Are you sure you want to move this document to trash?
toast-duplicated = Document duplicated
toast-removed-favorites = Removed from favorites
toast-added-favorites = Added to favorites
toast-link-copied = Link copied to clipboard
toast-pdf-uploaded = PDF uploaded successfully
toast-restored = Document restored
toast-restore-failed = Failed to restore document

# Shared tooltip
shared-with-count = Shared with { $count } { $count ->
  [one] person
 *[other] people
}
shared-click-manage = Click to manage

# Editor
editor-back = Back to documents
editor-opening-collaboration = Connecting to document…
editor-opening-layout = Preparing layout…
editor-title-placeholder = Document Title
editor-word-count = { $count } words
editor-character-count = { $count } characters
editor-saving = Saving...
editor-unsaved = Unsaved changes
editor-export = Export
editor-export-word = Export as Word (.docx)
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
trashed-readonly-title = This document is in trash
trashed-readonly-description = "{ $title }" is in trash and opens in view-only mode until it is restored.
trashed-readonly-owner-note = To edit this document again, take it out of trash.
trashed-readonly-shared-note = To edit this document again, ask the owner to take it out of trash.
trashed-readonly-go-home = Go to Docs home screen
trashed-readonly-restore = Take out of trash
trashed-readonly-restoring = Restoring...

# PDF viewer
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

# Relative time (for lists, dates)
time-just-now = Just now
time-minutes-ago = { $count }m ago
time-hours-ago = { $count }h ago
time-days-ago = { $count }d ago
time-yesterday = Yesterday
time-days-ago-count = { $count } days ago
time-shared-just-now = Just now
time-shared-hours-ago = { $count }h ago
time-shared-days-ago = { $count }d ago

# Table column headers (used in list view)
table-name = Name
table-modified = Modified
table-created = Created

# Template creation
template-new-prefix = New { $name }

# Word uploader
upload-word-processing = Processing your document...
upload-word-progress = { $progress }% complete
upload-word-file-size-exceeds = File size exceeds { $max }MB limit
upload-word-preview = Preview
upload-word-images-found = { $count } images found
upload-word-parsed-ready = Document parsed successfully. Ready to edit!
upload-word-saving-draft = Saving your document...
upload-word-saved-ready = Document saved. Ready to open.
upload-word-open-document = Open document
upload-word-parse-failed = Failed to parse document
upload-word-try-again = Try Again
upload-word-drop-here = Drop your file here
upload-word-title-dropzone = Upload your Word document
upload-word-drag-drop = Drag and drop your Word document here, or click to browse. We support .docx files (Word 2007+) up to { $max }MB.
upload-word-browse = Browse Files
upload-word-format-docx = .docx (Word 2007+)
upload-word-formatting-preserved = Formatting Preserved
upload-word-formatting-description = We'll keep your headers, lists, tables, and images intact

# PDF uploader
upload-pdf-select-pdf = Please select a PDF file
upload-pdf-upload-failed = Failed to upload PDF
upload-pdf-uploading = Uploading your PDF...
upload-pdf-progress = { $progress }% complete
upload-pdf-uploaded-indexed = PDF uploaded and indexed
upload-pdf-success-message = PDF uploaded successfully. The document will be available for search and Q&A once indexing completes.
upload-pdf-try-again = Try Again
upload-pdf-drop-here = Drop your PDF here
upload-pdf-title-dropzone = Upload a PDF document
upload-pdf-drag-drop = Drag and drop your PDF here, or click to browse. We support PDF files up to { $max }MB. The content will be extracted for search and Q&A.
upload-pdf-browse = Browse Files
upload-pdf-format = .pdf (PDF documents)
upload-pdf-searchable = Searchable & Indexed
upload-pdf-searchable-description = Text is extracted for search and Q&A. PDF remains read-only for viewing.

# ODF uploader (reuses many from Word)
upload-odf-processing = Processing your document...
upload-odf-progress = { $progress }% complete
upload-odf-title-dropzone = Upload your ODF document
upload-odf-drag-drop = Drag and drop your OpenDocument text file here, or click to browse. We support .odt files up to { $max }MB.
upload-odf-format = .odt (OpenDocument Text)

# Template gallery
templates-gallery-title = Template Gallery
templates-gallery-subtitle = Start with a template to save time
templates-search-placeholder = Search templates...
templates-all = All Templates
templates-built-in = Built-in
templates-public = Public
templates-used-times = Used { $count } times
templates-empty-title = No templates found
templates-empty-search = Try a different search term
templates-empty-category = No templates available in this category
templates-category-contracts = Contracts
templates-category-contracts-desc = Legal agreements and contracts
templates-category-agreements = Agreements
templates-category-agreements-desc = Business agreements
templates-category-letters = Letters
templates-category-letters-desc = Business correspondence
templates-category-reports = Reports
templates-category-reports-desc = Reports and summaries
templates-category-proposals = Proposals
templates-category-proposals-desc = Business proposals
templates-category-policies = Policies
templates-category-policies-desc = Company policies
templates-category-procedures = Procedures
templates-category-procedures-desc = Standard procedures
templates-category-forms = Forms
templates-category-forms-desc = Form templates
templates-category-other = Other
templates-category-other-desc = Other templates

# Share document dialog
share-dialog-title = Share Document
share-dialog-description = Share "{ $title }" with others and set their access level.
share-dialog-success-title = Document Shared!
share-dialog-success-single = { $name } has been notified and can now access this document.
share-dialog-success-multi = { $count } people have been notified and can now access this document.
share-dialog-default-permission = Default permission for new users
share-dialog-can-view = Can view
share-dialog-can-comment = Can comment
share-dialog-can-edit = Can edit
share-dialog-add-people = Add people
share-dialog-search-placeholder = Search for people...
share-dialog-no-people = No people found matching "{ $query }"
share-dialog-people-access = People with access ({ $count })
share-dialog-message-label = Message (optional)
share-dialog-message-placeholder = Add a message for the recipients...
share-dialog-info = People you share with will receive a notification and can access the document based on their permission level.
share-dialog-sharing = Sharing...
share-dialog-share-button = Share
share-dialog-toast = Document shared with { $count } { $count ->
  [one] person
 *[other] people
}!
share-dialog-error-select = Please select at least one person to share with
share-dialog-error-failed = Failed to share with some users
share-dialog-error-general = Failed to share document. Please try again.
share-permission-view = View
share-permission-comment = Comment
share-permission-edit = Edit

# Manage shares dialog
manage-shares-title = Manage Sharing
manage-shares-description = People who have access to "{ $title }"
manage-shares-empty = This document hasn't been shared with anyone yet.
manage-shares-share-someone = Share with someone
manage-shares-person-has = { $count } { $count ->
  [one] person has
 *[other] people have
} access
manage-shares-add-more = Add more
manage-shares-done = Done
manage-shares-loading = Loading...
manage-shares-error = Failed to load shared users
manage-shares-toast-updated = Permission updated
manage-shares-toast-update-failed = Failed to update permission
manage-shares-toast-removed = Removed access for { $name }
manage-shares-toast-remove-failed = Failed to remove access
manage-shares-confirm-remove = Remove access for { $name }?
manage-shares-shared-at = Shared { $time }
manage-shares-user-fallback = this user

# Send for approval dialog
approval-dialog-title = Send for Approval
approval-dialog-description = Select approvers for "{ $title }" and send it for review.
approval-dialog-success-title = Approval Request Sent!
approval-dialog-success-message = The selected approvers will be notified and can review your document.
approval-dialog-approvers = Approvers *
approval-dialog-search-placeholder = Search for approvers...
approval-dialog-no-users = No users found matching "{ $query }"
approval-dialog-message-label = Message (optional)
approval-dialog-message-placeholder = Add a message for the approvers...
approval-dialog-due-date = Due Date (optional)
approval-dialog-info-1 = Approvers will receive a task in their inbox to review and approve or reject the document.
approval-dialog-info-2 = You'll be notified when a decision is made.
approval-dialog-sending = Sending...
approval-dialog-send-button = Send for Approval
approval-dialog-toast = Approval request sent to { $count } { $count ->
  [one] person
 *[other] people
}!
approval-dialog-error-select = Please select at least one approver
approval-dialog-error-valid = No valid users selected
approval-dialog-error-send = Failed to send approval request

# Review banner
review-banner-status-pending = Pending approval
review-banner-status-approved = Approved
review-banner-status-rejected = Rejected
review-banner-status-cancelled = Cancelled
review-banner-requested-by = Requested by
review-banner-requested-at = Requested at
review-banner-requested-by-unknown = Unknown requester
review-banner-requested-at-unknown = Unknown time
review-banner-approved-version = Current approved version
review-banner-approved-version-empty = None yet
review-banner-version-under-review = Current in review
review-banner-last-live-version = Last live version
review-banner-live-changes = Live document changed
review-banner-summary-snapshot = This review shows the exact snapshot that was submitted for approval.
review-banner-summary-live = The live document can continue changing without changing this review copy.
review-banner-summary-live-changes = The live document now has newer edits than the version currently under review.
review-banner-approve = Approve
review-banner-reject = Reject
review-toast-approved = Document approved
review-toast-rejected = Document rejected
review-error-missing-version = Missing review version in URL
review-error-load-context = Failed to load review context
review-error-update-approval = Failed to update approval
review-error-context-unavailable = Review context could not be loaded
review-error-forbidden-title = You cannot open this review
review-error-forbidden-description = This review link is only available to users who are assigned to approve this document version.
review-error-invalid-link-title = This review link is incomplete
review-error-invalid-link-description = The review version is missing from the URL. Open the review again from the approval task.
review-error-load-title = Review could not be loaded
review-error-load-description = We could not load this review right now. Please try again, or go back and reopen it.
review-error-back = Go back
review-error-retry = Try again
review-dialog-title-fallback = Document review
review-dialog-description = Read-only preview of the version submitted for approval.
review-dialog-readonly-badge = Read-only
review-dialog-close = Close

# Create template dialog
create-template-title = Create template
create-template-description = Enter a name, optional description, and choose a category. You can edit content after creating.
create-template-name-label = Name
create-template-name-placeholder = e.g. Offer Letter
create-template-description-label = Description (optional)
create-template-description-placeholder = Brief description of the template
create-template-category-label = Category
create-template-context-label = Context
create-template-creating = Creating…
create-template-create-button = Create

# AI Edit panel
ai-edit-title = AI Editor
ai-edit-mode-selection = Editing selection
ai-edit-mode-document = Editing entire document
ai-edit-placeholder = Describe what you want to change (e.g. make it more formal, shorten, translate)...
ai-edit-apply = Apply
ai-edit-fast-mode = Fast mode
ai-edit-smart-mode = Smart mode (OpenAI)
ai-edit-smart = Smart
ai-edit-fast = Fast
ai-edit-instruction-label = Instruction
ai-edit-ctrl-enter-hint = Press Ctrl+Enter to generate
ai-edit-generate-preview = Generate preview
ai-edit-selected-text = Selected text
ai-edit-clear-selection-title = Clear selection
ai-edit-generating = Generating…
ai-edit-discard = Discard
ai-edit-undo = Undo
ai-edit-new = New edit
ai-edit-active = (active)

# Quill/Editor heading labels (for picker)
editor-heading-normal = Normal
editor-heading-1 = Heading 1
editor-heading-2 = Heading 2
editor-heading-3 = Heading 3
editor-heading-4 = Heading 4
editor-heading-5 = Heading 5
editor-heading-6 = Heading 6

# Editor toolbar
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
editor-dictate-tooltip = Dictate text with your voice
editor-dictate-label = Dictate
editor-dictate-listening = Listening…
editor-dictate-unavailable = Voice input unavailable
editor-dictate-hint = Click to start voice input
editor-dictate-tooltip-secondary = Speak clearly into your microphone
editor-dictate-unsupported-browser = Voice input is not supported in this browser. Try Chrome or Edge.
editor-dictate-retry = Click to try again
editor-dictate-error-not-allowed = Microphone access denied. Please allow microphone access.
editor-dictate-error-network = Network error occurred. Please check your connection.
editor-dictate-error-audio-capture = No microphone found. Please connect a microphone.
editor-dictate-error-aborted = Voice input was canceled.
editor-dictate-error-native-unavailable = Voice input is currently unavailable on this device.
editor-dictate-error-generic = Voice input error: { $error }
editor-toolbar-line-paragraph-spacing = Line and paragraph spacing
editor-line-spacing-single = Single
editor-line-spacing-1-15 = 1.15
editor-line-spacing-1-5 = 1.5
editor-line-spacing-double = Double
editor-paragraph-spacing-before = Add space before paragraph
editor-paragraph-spacing-after = Add space after paragraph
editor-paragraph-spacing-remove-before = Remove space before paragraph
editor-paragraph-spacing-remove-after = Remove space after paragraph
editor-toolbar-bullet-list = Bullet List
editor-toolbar-numbered-list = Numbered List
editor-toolbar-task-list = Task List
editor-toolbar-decrease-indent = Decrease Indent
editor-toolbar-increase-indent = Increase Indent
editor-toolbar-quote = Quote
editor-toolbar-code-block = Code Block
editor-toolbar-horizontal-rule = Horizontal Rule
editor-toolbar-insert-link = Insert Link
editor-toolbar-insert-image = Insert Image
editor-toolbar-insert-signature = Insert Signature
editor-toolbar-insert-table = Insert Table
editor-toolbar-insert-table-of-contents = Table of Contents

document-toc-block-title = Table of contents
document-toc-empty = No headings below this table of contents yet.
document-toc-page-unknown = —
document-toc-context-update = Update Table of Contents
document-toc-context-update-page-numbers = Update page numbers only
document-toc-context-update-entire = Update entire table
document-toc-context-format = Format Table of Contents
document-toc-context-remove = Remove Table of Contents
document-toc-stale-page-numbers = The stored page numbers are out of date.
document-toc-stale-entire = This table of contents is out of date.
document-toc-settings-title = Table of Contents
document-toc-settings-close = Close
document-toc-settings-page-numbers = Page numbers
document-toc-settings-heading-links = Heading links
document-toc-settings-page-number-align = Page number alignment
document-toc-settings-page-number-align-right = Right align
document-toc-settings-page-number-align-inline = Inline
document-toc-settings-tab-leader = Tab leaders
document-toc-settings-tab-leader-dot = Dot leader
document-toc-settings-tab-leader-none = None
document-toc-settings-max-heading-level = Show headings up to
document-toc-settings-text-style = Table text
document-toc-settings-title-style = Title style
document-toc-settings-entries-style = Entry style
document-toc-settings-font-family = Font family
document-toc-settings-font-size = Font size
document-toc-settings-bold = Bold
document-toc-settings-italic = Italic
document-toc-settings-text-color = Text color
document-toc-settings-heading-1 = Heading 1
document-toc-settings-heading-2 = Heading 2
document-toc-settings-heading-3 = Heading 3
document-toc-settings-heading-4 = Heading 4
document-toc-settings-heading-5 = Heading 5
document-toc-settings-heading-6 = Heading 6
editor-toolbar-table-row-before = Insert Row Above
editor-toolbar-table-row-after = Insert Row Below
editor-toolbar-table-duplicate-row = Duplicate Row
editor-toolbar-table-column-before = Insert Column Left
editor-toolbar-table-column-after = Insert Column Right
editor-toolbar-table-duplicate-column = Duplicate Column
editor-toolbar-table-delete-row = Delete Row
editor-toolbar-table-delete-column = Delete Column
editor-toolbar-table-delete-table = Delete Table
editor-toolbar-table-merge-cells = Merge Cells
editor-toolbar-table-split-cell = Split Cell
editor-toolbar-table-toggle-header-row = Toggle Header Row
editor-toolbar-table-toggle-header-column = Toggle Header Column
editor-toolbar-table-toggle-header-cell = Toggle Header Cell
editor-toolbar-table-width-autofit-window = AutoFit to Window
editor-toolbar-table-width-autofit-content = AutoFit to Contents
editor-toolbar-table-width-full = Table Width: 100%
editor-toolbar-table-width-half = Table Width: 50%
editor-toolbar-table-width-fixed = Table Width: 14 cm
editor-toolbar-table-width-custom = Custom Table Width...
editor-toolbar-table-width-prompt = Table width (examples: 14cm, 320pt, 100%)
editor-toolbar-table-align-left = Align Table Left
editor-toolbar-table-align-center = Center Table
editor-toolbar-table-align-right = Align Table Right
editor-toolbar-table-text-align-left = Align Cell Text Left
editor-toolbar-table-text-align-center = Center Cell Text
editor-toolbar-table-text-align-right = Align Cell Text Right
editor-toolbar-table-vertical-align-top = Align Cell Top
editor-toolbar-table-vertical-align-middle = Align Cell Middle
editor-toolbar-table-vertical-align-bottom = Align Cell Bottom
editor-toolbar-table-fill-yellow = Fill Cell: Light Yellow
editor-toolbar-table-fill-clear = Clear Cell Fill
editor-toolbar-table-fill-custom = Custom Cell Fill...
editor-toolbar-table-fill-prompt = Cell fill color (example: #FFF2CC)
editor-toolbar-table-border-blue = Border Color: Blue
editor-toolbar-table-border-clear = Clear Border Color
editor-toolbar-table-border-custom = Custom Border Color...
editor-toolbar-table-border-prompt = Cell border color (example: #2563EB)
table-sidebar-open = Open Table Sidebar
table-sidebar-title = Table
table-sidebar-section-style = Table Style
table-sidebar-section-style-options = Style options
table-sidebar-section-structure = Table Structure
table-sidebar-section-layout = Layout
table-sidebar-section-cell = Cell
table-sidebar-section-borders = Borders
table-sidebar-selection-summary = { $rowCount } row(s), { $columnCount } column(s) selected
table-sidebar-style-header-row = Header row
table-sidebar-style-first-column = First column
table-sidebar-style-last-column = Last column
table-sidebar-style-banded-rows = Banded rows
table-sidebar-style-banded-columns = Banded columns
table-sidebar-width-mode = Width mode
table-sidebar-width-mode-manual = Manual width
table-sidebar-table-width = Table width
table-sidebar-layout-align-left = Left
table-sidebar-layout-align-center = Center
table-sidebar-layout-align-right = Right
table-sidebar-row-height = Row height
table-sidebar-column-width = Column width
table-sidebar-apply = Apply
table-sidebar-reset-default = Reset to default
table-sidebar-distribute-rows = Distribute rows
table-sidebar-distribute-columns = Distribute columns
table-sidebar-fill-blue = Blue tint
table-sidebar-fill-green = Green tint
table-sidebar-fill-yellow = Yellow tint
table-sidebar-fill-purple = Purple tint
table-sidebar-surface-background = Table background
table-sidebar-surface-radius = Corner radius
table-sidebar-surface-border-style = Outer border style
table-sidebar-surface-border-width = Outer border width
table-sidebar-surface-border-color = Outer border color
table-sidebar-border-hint = Choose a line style, then apply it to all borders, only the outside, or a specific side.
table-sidebar-border-style = Border style
table-sidebar-border-width = Border width
table-sidebar-border-color = Border color
table-sidebar-border-none = No borders
table-sidebar-border-all = All borders
table-sidebar-border-outside = Outside
table-sidebar-border-inside = Inside
table-sidebar-border-inside-horizontal = Inside horizontal
table-sidebar-border-inside-vertical = Inside vertical
table-sidebar-border-top = Top
table-sidebar-border-right = Right
table-sidebar-border-bottom = Bottom
table-sidebar-border-left = Left
table-sidebar-border-style-solid = Solid
table-sidebar-border-style-dashed = Dashed
table-sidebar-border-style-dotted = Dotted
table-sidebar-border-style-double = Double
table-theme-blue = Blue
table-theme-teal = Teal
table-theme-green = Green
table-theme-orange = Orange
table-theme-purple = Purple
table-theme-gray = Gray
editor-toolbar-page-break = Insert Page Break (Ctrl+Enter)
editor-toolbar-clear-formatting = Clear Formatting
editor-toolbar-font = Font
editor-toolbar-select-all = Select all
editor-toolbar-paste = Paste
editor-toolbar-paste-text-only = Paste Text Only
editor-toolbar-paste-merge-formatting = Paste With Merge Formatting
editor-font-default = Default
editor-font-arial = Arial
editor-font-times = Times New Roman
editor-font-georgia = Georgia
editor-font-verdana = Verdana
editor-font-courier = Courier New
editor-font-garamond = Garamond
editor-font-trebuchet = Trebuchet MS
editor-font-calibri = Calibri
editor-font-cambria = Cambria
editor-font-tahoma = Tahoma
editor-font-comic-sans = Comic Sans MS
editor-font-consolas = Consolas
editor-font-palatino = Palatino Linotype
editor-font-century-gothic = Century Gothic
editor-font-constantia = Constantia
editor-font-candara = Candara
editor-font-corbel = Corbel
editor-toolbar-link-prompt = URL
editor-toolbar-image-prompt = Image URL

# Ribbon tabs and groups
editor-ribbon-tab-home = Start
editor-ribbon-tab-insert = Insert
editor-ribbon-group-clipboard = Clipboard
editor-ribbon-group-font = Font
editor-ribbon-group-paragraph = Paragraph
editor-ribbon-group-styles = Styles
editor-ribbon-group-voice = Voice
editor-ribbon-group-insert = Insert

# Insert image dialog
insert-image-dialog-title = Insert image
insert-image-dialog-title-replace = Change picture
insert-image-tab-upload = Upload
insert-image-tab-from-url = From URL
insert-image-choose-file = Choose file
insert-image-drop-here = Drop image here or click to browse
insert-image-url-placeholder = https://example.com/image.png
insert-image-insert = Insert
insert-image-cancel = Cancel
insert-image-uploading = Uploading…
insert-image-upload-failed = Upload failed. Try again or use a URL.
insert-image-invalid-url = Please enter a valid image URL.

# Signature dialog
signature-dialog-title = Insert Signature
signature-dialog-tab-library = Your Signatures
signature-dialog-tab-typed = Type
signature-dialog-tab-drawn = Handwritten
signature-picker-loading = Loading signatures…
signature-picker-empty = No signatures yet. Create one in the Type, Handwritten, or Upload tab.
signature-picker-insert-signature = Insert signature
signature-picker-insert-initials = Insert initials
signature-picker-selected-hint = Selected: { $name }
signature-picker-select-hint = Choose a signature above, then insert it into the document.
signature-picker-edit-aria = Edit saved signature { $name }
signature-picker-delete-aria = Delete saved signature { $name }
signature-delete-confirm-title = Delete this signature?
signature-delete-confirm-description = { $name } will be removed from your library. This cannot be undone.
signature-delete-confirm-action = Delete
signature-delete-confirm-cancel = Cancel
signature-deleting = Deleting…
signature-delete-failed = Could not delete the signature. Try again.
signature-canvas-undo = Undo
signature-canvas-redo = Redo
signature-canvas-clear = Clear
signature-typed-label = Type your name
signature-typed-placeholder = e.g. John Smith
signature-typed-style = Style
signature-ink-color-label = Ink color
signature-ink-family-black = Black
signature-ink-family-blue = Blue
signature-ink-family-green = Green
signature-ink-family-red = Red
signature-ink-tone-dark = Dark
signature-ink-tone-medium = Medium
signature-ink-tone-light = Light
signature-style-normal = Normal
signature-style-cursive = Cursive
signature-style-formal = Formal
signature-style-script = Script
signature-style-elegant = Elegant
signature-style-modern = Modern
signature-style-classic = Classic
signature-style-bold = Bold
signature-save-name-label = Save as (name)
signature-save-name-placeholder = My Signature
signature-save-to-library = Save to library
signature-save-update = Update in library
signature-saving = Saving…
signature-edit-banner = Editing saved signature: { $name }
signature-edit-cancel = Cancel edit
signature-save-failed = Failed to save signature. Try again.
signature-typed-default-name = Typed Signature
signature-drawn-default-name = Handwritten Signature
signature-drawn-name-placeholder = My Handwritten Signature
signature-stroke-thickness-label = Stroke thickness
signature-stroke-extra-thin = Extra thin
signature-stroke-thin = Thin
signature-stroke-medium = Medium
signature-stroke-thick = Thick
signature-dialog-tab-upload = Upload
signature-upload-drop-here = Drop an image here or click to choose
signature-upload-formats-hint = Accepted formats: GIF, JPG, PNG, BMP. Maximum file size 500 KB.
signature-upload-processing = Processing image…
signature-upload-choose-file = Choose image file
signature-upload-name-placeholder = My uploaded signature
signature-upload-default-name = Uploaded Signature
signature-upload-error-type = Please choose a GIF, JPG, PNG, or BMP file.
signature-upload-error-size = File is too large. Maximum size is 500 KB.
signature-upload-error-load = Failed to load the image. Try another file.
signature-full-name-label = Full name
signature-full-name-placeholder = e.g. John Smith
signature-initials-label = Initials
signature-initials-placeholder = e.g. JS
signature-error-initials-required = Enter full name and initials before saving.
signature-error-draw-both-required = Provide your full handwritten signature and your initials.
signature-error-edit-typed-source = This signature cannot be edited (data missing). Create a new one instead.
signature-error-edit-drawn-source = Strokes could not be loaded. Create a new handwritten signature instead.
signature-typed-preview-full = Full signature preview
signature-typed-preview-empty = Enter your full name above to preview.
signature-typed-preview-initials = Initials preview
signature-typed-preview-initials-empty = Enter your initials above to preview.
signature-draw-full-canvas-label = Full signature
signature-draw-initials-canvas-label = Initials
signature-upload-zone-full = Full signature image
signature-upload-zone-initials = Initials image
signature-upload-drop-here-initials = Drop initials image or click to choose
signature-upload-choose-file-full = Choose full signature image
signature-upload-choose-file-initials = Choose initials image
signature-picker-item-aria = Saved signature: { $name }
signature-picker-item-aria-with-initials = Saved signature: { $name }, with initials

# Link dialog
link-dialog-title-insert = Insert Link
link-dialog-title-edit = Edit Link
link-dialog-url-label = URL
link-dialog-url-placeholder = https://example.com
link-dialog-text-label = Text to display
link-dialog-text-placeholder = Link text
link-dialog-open-new-tab = Open in new tab
link-dialog-apply = Apply
link-dialog-remove-link = Remove link
link-dialog-cancel = Cancel
link-dialog-invalid-url = Please enter a valid URL.

# Insert table dialog
insert-table-dialog-title = Insert Table
insert-table-dialog-rows = Rows
insert-table-dialog-cols = Columns
insert-table-dialog-insert = Insert
insert-table-dialog-cancel = Cancel
insert-table-dialog-rows-range = Rows must be between { $min } and { $max }.
insert-table-dialog-cols-range = Columns must be between { $min } and { $max }.

# Link bubble menu
link-bubble-edit = Edit
link-bubble-remove-link = Remove link
link-bubble-open-link = Open link
link-bubble-open-new-tab = Open in new tab

# Document context menu
document-context-clipboard = Clipboard
document-context-copy = Copy
document-context-cut = Cut
document-context-link = Link
document-context-format = Format
document-context-review = Review
document-context-add-comment = Add comment
document-context-image-settings = Picture settings
document-context-insert = Insert
document-context-delete = Delete
document-context-cell = Cell
document-context-layout = Layout
document-context-translate = Translate
document-context-proofing-language = Set Proofing Language
document-context-paragraph-options = Paragraph Options
document-context-change-picture = Change Picture
document-context-draw = Draw
document-context-format-picture = Format Picture
document-context-split = Split
document-context-distribute = Distribute
document-context-format-table = Format Table

# Image context menu (right-click on image)
image-context-cut = Cut
image-context-copy = Copy
image-context-paste = Paste
image-context-delete = Delete
image-context-replace = Change picture
image-context-alt-text = Alt text
image-context-align = Align
image-context-position = Layout & position
image-sidebar-accessibility = Caption & alt text
image-context-anchor = Anchor
image-context-caption = Caption
image-context-crop = Crop
image-context-finish-crop = Finish crop
image-context-reset-crop = Reset crop
image-context-crop-active = Crop active
image-context-spacing = Distance from text

# Wrap text (Word-style)
image-context-wrap-text = Wrap text
image-wrap-inline = In line with text
image-wrap-square-left = Square left
image-wrap-square-right = Square right
image-wrap-square = Square
image-wrap-tight = Tight
image-wrap-through = Through
image-wrap-center = Top and bottom
image-wrap-behind = Behind text
image-wrap-in-front = In front of text
image-wrap-text-side = Wrap text on
image-wrap-text-both-sides = Both sides
image-wrap-text-left-only = Left only
image-wrap-text-right-only = Right only
image-anchor-inline = Inline
image-anchor-move-with-text = Move with text
image-anchor-fixed = Fix position on page

image-alt-text-dialog-title = Alt text
image-alt-text-label = Description (for accessibility)
image-alt-text-save = Save
image-caption-prompt = Caption
image-distance-prompt = Distance from text (pixels)
image-position-menu = Position
image-position-move-left = Move left
image-position-move-right = Move right
image-position-move-up = Move up
image-position-move-down = Move down
image-position-bring-forward = Bring forward
image-position-send-backward = Send backward
image-position-z-index = Layer order
image-sidebar-title = Picture
table-sidebar-in-header-context = Table in header
table-sidebar-in-footer-context = Table in footer
image-sidebar-distance-top = Top
image-sidebar-distance-right = Right
image-sidebar-distance-bottom = Bottom
image-sidebar-distance-left = Left
image-sidebar-offset-x = Horizontal offset
image-sidebar-offset-y = Vertical offset
image-sidebar-overlap = Allow overlap
image-sidebar-size = Size
image-sidebar-size-unit = Unit
image-sidebar-size-unit-mixed = Width and height use different units. Choose px or % to apply the same unit to both.
image-sidebar-width = Width
image-sidebar-height = Height
image-sidebar-relative-to-page = Relative to page
image-sidebar-lock-aspect-ratio = Lock aspect ratio
image-sidebar-reset-size = Reset original size
image-sidebar-scale-width = Scale width (%)
image-sidebar-scale-height = Scale height (%)
image-sidebar-scale-hint = Percent of the width and height above, not of the page.
image-sidebar-rotation = Rotation (deg)
image-sidebar-border = Picture border
image-sidebar-border-no-outline = No outline
image-sidebar-border-apply-outline = Apply outline
image-sidebar-border-hidden = The picture outline is currently disabled.
image-sidebar-border-current-outline = Current outline
image-sidebar-border-color = Color
image-sidebar-border-custom-color = Custom color
image-sidebar-border-theme-colors = Theme colors
image-sidebar-border-standard-colors = Standard colors
image-sidebar-border-more-colors = More outline colors...
image-sidebar-border-more-options = More options
image-sidebar-border-less-options = Fewer options
image-sidebar-border-hex-placeholder = Hex color, e.g. #1F4E79
image-sidebar-border-apply-color = Apply color
image-sidebar-border-weight = Weight
image-sidebar-border-dashes = Dashes
image-sidebar-border-dash-solid = Solid
image-sidebar-border-dash-dash = Dash
image-sidebar-border-dash-dot = Dot
image-sidebar-border-dash-dash-dot = Dash dot
image-sidebar-border-dash-dash-dot-dot = Dash dot dot
image-crop-top = Crop top
image-crop-right = Crop right
image-crop-bottom = Crop bottom
image-crop-left = Crop left

# Paged document editor
editor-back-title = Back to documents
editor-save-document = Save Document
editor-approval-pending = Pending Approval
editor-approval-approved = Approved
editor-approval-rejected = Rejected
editor-approval-more = +{ $count } more { $count ->
  [one] approver
 *[other] approvers
}
editor-document-menu = Document
editor-version-history = Version History
editor-version-history-loading = Loading version history...
editor-version-history-empty = No checkpoints yet
editor-version-history-current = Current
editor-version-history-checkpoint = Checkpoint
editor-version-history-autosave = Auto-save
editor-version-history-restore = Restore this version
editor-version-history-restore-confirm = Are you sure you want to restore version { $versionNumber }? This creates a new version from that checkpoint.
editor-version-history-compare = Compare Versions
editor-version-history-cancel-compare = Cancel Compare
editor-version-history-compare-selected = Compare Selected
editor-version-history-compare-hint = Select two versions to compare.
editor-version-history-skipped = Skipped
editor-version-history-in-review = In review
editor-version-history-requested-by = Requested by
editor-version-history-requested-at = Requested
editor-version-history-reviewers = Reviewers
editor-version-history-rejected-by = Rejected By
editor-version-history-approval-filter-label = Approval
editor-version-history-approval-filter-all = All Statuses
editor-version-history-approval-filter-in-review = In Review
editor-version-history-approval-filter-approved = Approved
editor-version-history-approval-filter-rejected = Rejected
editor-version-history-approval-filter-empty = No checkpoints match this approval filter.
editor-version-history-reviewer-pending-badge = Pending approval
editor-version-history-approved-by = Approved by
editor-version-history-open-review = Review Now
editor-version-history-view-approved-version = Open
editor-version-history-no-approved-reviewers = No approved reviewers recorded
editor-version-history-unknown-time = Unknown time
editor-version-history-comment-show-more = Show more
editor-version-history-comment-show-less = Show less
editor-version-history-review-comment = Review comment
editor-save-checkpoint = Save Checkpoint
checkpoint-dialog-title = Save Version Checkpoint
checkpoint-dialog-description-label = Description (Optional)
checkpoint-dialog-placeholder = e.g., Added new section, Fixed typos, Major revision
checkpoint-dialog-hint = Add a description to help you remember what changed in this version.
checkpoint-dialog-cancel = Cancel
checkpoint-dialog-save = Save Checkpoint
checkpoint-dialog-saving = Saving...
editor-checkpoint-from-save = Saved from editor
editor-unlock-document = Unlock Document
editor-lock-document = Lock Document
editor-publish = Publish...
editor-save-as-template = Save as Template
editor-send-for-approval = Send for Approval
editor-export-word = Export as Word (.docx)
editor-export-pdf = Export as PDF
editor-print = Print
editor-ai-edit = AI Edit

# Navigation panel (Headings, Find, Replace)
navigation-panel-title = Headings
navigation-panel-headings-tab = Headings
navigation-panel-find-tab = Find
navigation-panel-replace-tab = Replace
navigation-panel-search-placeholder = Search in document
navigation-panel-replace-with-placeholder = Replace with
navigation-panel-replace = Replace
navigation-panel-replace-all = Replace All
navigation-panel-find-next = Find next
navigation-panel-find-prev = Find previous
navigation-panel-no-headings = This document doesn't have any headings.
navigation-panel-no-headings-hint = To add headings for an outline, use Home > Styles.
navigation-panel-match-count = { $count } { $count ->
  [one] match
 *[other] matches
}
navigation-panel-result-of = Result { $current } of { $total }
navigation-panel-case-sensitive = Match case
navigation-panel-whole-words = Whole words only
navigation-panel-replace-hint = Search for a term in your document and enter the term that you would like to replace with.
navigation-panel-close = Close navigation panel
navigation-panel-show = Show Navigation Pane

# Page setup dialog
page-setup-title = Page setup
page-setup-apply-to = Apply to
page-setup-entire-document = Entire document
page-setup-orientation = Orientation
page-setup-portrait = Portrait
page-setup-landscape = Landscape
page-setup-paper-size = Paper size
page-setup-page-colour = Page colour
page-setup-margins-cm = Margins (cm)
page-setup-margin-top = Top
page-setup-margin-bottom = Bottom
page-setup-margin-left = Left
page-setup-margin-right = Right
page-setup-cancel = Cancel
page-setup-ok = OK
page-size-a4 = A4
page-size-a3 = A3
page-size-a5 = A5
page-size-letter = Letter
page-size-legal = Legal
page-size-tabloid = Tabloid
page-size-custom = Custom
page-setup-custom-width-cm = Width (cm)
page-setup-custom-height-cm = Height (cm)
editor-comments-title = Comments (Right-click on text to add inline comment)
editor-locked = Locked
editor-zoom-in = Zoom In
editor-zoom-out = Zoom Out

# Shared comment UI (used by InlineCommentPopover, CommentPanel, etc.)
shared-comment-add = Add Comment
shared-comment-placeholder = Add a comment...
shared-comment-button = Comment
shared-comment-edit-placeholder = Edit comment...
shared-comment-reply-placeholder = Write a reply...
shared-comment-resolved = Resolved
shared-comment-reply = Reply
shared-comment-edit = Edit
shared-comment-resolve = Resolve
shared-comment-reopen = Reopen
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
editor-approval-approver-alt = Approver
editor-approval-rejector-alt = Rejector
editor-page-of = Page { $current } of { $total }
editor-user-fallback = User
presence-status-active = Active { $time }
presence-time-just-now = just now
presence-time-minute-ago = 1 minute ago
presence-time-minutes-ago = { $count } minutes ago
presence-time-hour-ago = 1 hour ago
presence-time-hours-ago = { $count } hours ago
editor-header-footer-editing-header = Editing header on page { $page }
editor-header-footer-editing-footer = Editing footer on page { $page }
editor-header-footer-mode-description = Toolbar actions apply to the active header or footer.
editor-header-footer-close = Done
editor-header-footer-label-header = Header
editor-header-footer-label-footer = Footer
editor-header-footer-double-click = Double-click to edit
editor-header-footer-double-click-exit = Double-click outside to exit

header-footer-sidebar-description = Edit in the page area. Use the toolbar for text, images, and tables.
header-footer-sidebar-editing-label = Editing
header-footer-sidebar-close-editing = Close header & footer
header-footer-sidebar-page-number = Page number
header-footer-sidebar-insert-page-field = Page number field
header-footer-sidebar-insert-total-field = Page count field
header-footer-sidebar-date-time = Date & time
header-footer-sidebar-field-title = Document title
header-footer-sidebar-diff-first = Different first page
header-footer-sidebar-diff-oddeven = Different odd & even
header-footer-sidebar-show-body = Show document text
header-footer-sidebar-header-from-top = Header from Top:
header-footer-sidebar-footer-from-bottom = Footer from Bottom:
header-footer-sidebar-unit-cm = cm
header-footer-sidebar-unit-in = in
header-footer-sidebar-preset-blank = Empty
header-footer-sidebar-preset-header-title-left = Blank (left)
header-footer-sidebar-preset-header-title-center = Blank (center)
header-footer-sidebar-preset-header-page-right = Page # (right)
header-footer-sidebar-preset-footer-page-center = Page # (center)
header-footer-sidebar-preset-footer-page-total = Page X of Y
header-footer-sidebar-preset-footer-page-right = Page # (right)
header-footer-sidebar-date-dialog-title = Date and time
header-footer-sidebar-date-insert = Insert
header-footer-sidebar-date-locale-short = Short date
header-footer-sidebar-date-locale-long = Long date
header-footer-sidebar-date-iso = ISO date (YYYY-MM-DD)
header-footer-sidebar-date-option-datetime = Date and time
header-footer-sidebar-section-layout = Layout & presets
header-footer-sidebar-section-insert = Insert
header-footer-menu-page-numbers = Page numbers
header-footer-menu-inserts = Inserts
header-footer-pn-add-to-header-footer = Add page numbers to header or footer
header-footer-pn-manage = Manage page numbers
header-footer-sidebar-section-options = Options
header-footer-sidebar-section-position = Position
header-footer-sidebar-zone-uniform-header = Same header on all pages
header-footer-sidebar-zone-uniform-footer = Same footer on all pages
header-footer-sidebar-zone-first = First page only
header-footer-sidebar-zone-from-page-two = From page 2 onward (shared)
header-footer-sidebar-zone-odd = Odd-numbered pages
header-footer-sidebar-zone-even = Even-numbered pages

image-sidebar-in-header-context = Image in header
image-sidebar-in-footer-context = Image in footer

signature-sidebar-in-header-context = Signature in header
signature-sidebar-in-footer-context = Signature in footer
signature-sidebar-title = Signature
signature-sidebar-name = Name
signature-sidebar-lock-aspect = Lock aspect ratio
signature-sidebar-width = Width
signature-sidebar-height = Height
signature-sidebar-floating-position = Position on page
signature-sidebar-page = Page
signature-sidebar-x = X
signature-sidebar-y = Y
signature-sidebar-replace = Replace signature…
signature-sidebar-remove = Remove signature
signature-sidebar-crop-section = Crop
signature-sidebar-crop-intro = Trim empty space around the signature: start cropping to show handles on the document, or type values below.
signature-sidebar-crop-start = Start cropping
signature-sidebar-cropping = Cropping…
signature-sidebar-crop-done = Done
signature-sidebar-crop-active-banner = Cropping is on — drag the square handles on the signature to choose what stays visible, then choose Done.
signature-sidebar-crop-values-hint = Each number is how much to trim from that side, as a fraction of the box width or height (0 to 0.95).
signature-crop-overlay-hint = Drag handles to trim
signature-rotate-handle-aria = Rotate signature

# Template fields panel
template-fields-insert = Insert field
template-fields-search-placeholder = Search entities...
template-fields-no-match = No fields matching "{ $query }"
template-fields-loading = Loading fields from GraphQL...
template-fields-load-failed = Failed to load fields: { $message }
template-fields-no-fields = No fields from GraphQL for this type.
template-fields-fields-label = Fields
template-fields-catalog-values = Catalog values (contract type, employment type, currency)
template-fields-entities-used = Entities used in this template
template-fields-no-entity-types = No entity types available.

# Generate document dialog
generate-document-title = Generate document
generate-document-description = Choose a template. Placeholders will be replaced with the linked entity data.
generate-document-default-title = Generated Document
generate-document-placeholder-status = Placeholder data status
generate-document-loading-placeholders = Loading placeholders for selected template…
generate-document-loading-data = Loading candidate and related data (job_request, company)…
generate-document-fields-available = { $count } { $count ->
  [one] field
 *[other] fields
} available
generate-document-loading = Loading…
generate-document-no-company-address = This company has no addresses in the database.
generate-document-no-data = No data provided for this entity.
generate-document-select-template = Please select a template
generate-document-no-content = Template has no content
generate-document-created = Document created
generate-document-create-failed = Failed to create document
generate-document-failed = Failed to generate document
generate-document-load-failed = Failed to load templates
generate-document-no-templates = No templates available.
generate-document-template-label = Template
generate-document-select-placeholder = Select a template
generate-document-generating = Generating...
generate-document-generate-button = Generate document

# Document preview card
preview-card-status-draft = Draft
preview-card-status-saved = Saved
preview-card-status-pending = Pending Approval
preview-card-status-approved = Approved
preview-card-status-rejected = Rejected
preview-card-status-archived = Trash
preview-card-just-now = Just now
preview-card-minutes-ago = { $count } minutes ago
preview-card-hour-ago = 1 hour ago
preview-card-hours-ago = { $count } hours ago
preview-card-yesterday = Yesterday
preview-card-days-ago = { $count } days ago
preview-card-open = Open
preview-card-edit = Edit
preview-card-duplicate = Duplicate
preview-card-export = Export
preview-card-share = Share
preview-card-manage-sharing = Manage Sharing
preview-card-send-approval = Send for Approval
preview-card-delete = Move to trash
preview-card-words = { $count } words
preview-card-awaiting = Awaiting approval from { $count } { $count ->
  [one] person
 *[other] people
}
preview-card-owner-label = Owner
preview-card-shared-with-you = Shared with you
preview-card-by = by { $name }
preview-card-owner = Owner: { $name }
preview-card-can-edit = Can edit
preview-card-can-comment = Can comment
preview-card-view-only = View only
preview-card-can-view = Can view
preview-card-more-people = { $count } more people
preview-card-shared-with = Shared with { $count }
preview-card-no-documents = No documents yet
preview-card-create-first = Create your first document or upload an existing Word file to get started.
preview-card-create-new = Create New Document

# Editor view toasts
editor-toast-template-saved = Template saved
editor-toast-templates-info = Templates are edited here; use documents for approval workflow.
editor-toast-save-first = Please save the document first before sending for approval

# Word uploader (remaining)
upload-word-drop-here-alt = Drop your file here
upload-word-browse-files = Browse Files

# AiEditPreview
ai-preview-applied = Applied
ai-preview-preview = Preview
ai-preview-selection = Selection
ai-preview-full-document = Full Document

# ManageSharesDialog
manage-shares-user-unknown = Unknown

# Approval/Share notifications (sent to Flow Engine; used in dialogs)
approval-task-someone = Someone
approval-task-requested-with-message = { $initiator } requested your approval for the document "{ $title }".\n\nMessage: { $message }\n\nClick the link below to review and approve or reject.
approval-task-requested = { $initiator } requested your approval for the document "{ $title }". Click the link below to review and approve or reject.
approval-task-title = Document Approval: { $title }
approval-task-description = Document Approval Request: { $title }
approval-task-error-send = Failed to send approval request
approval-task-error-create = Failed to create approval task: { $status }
share-task-someone = Someone
share-task-permission-edit = edit
share-task-permission-comment = view and comment on
share-task-permission-view = view
share-task-message = { $initiator } shared the document "{ $title }" with you. You can { $permission } this document.
share-task-message-with-note = { $base }\n\nMessage: { $message }
share-task-title = Document Shared: { $title }
share-task-description = Document sharing notification
share-task-error-send = Failed to send notifications

# Word parser
upload-word-error-old-doc = The older .doc format is not supported. Please save your document as .docx (Word 2007 or later) and try again.
upload-word-error-invalid-type = Invalid file type. Please upload a .docx file (Word 2007 or later).
upload-word-error-parse = Failed to parse document

# ODF parser
upload-odf-error-invalid-type = Invalid file type. Please upload an .odt file (OpenDocument Text).
upload-odf-error-parse = Failed to parse ODF document
odf-parse-message-unexpected-mimetype = Unexpected mimetype: { $mimetype }
odf-parse-error-missing-content = Invalid ODF file: missing content.xml
odf-parse-error-content-xml = Failed to parse content.xml: { $detail }
odf-parse-error-missing-body = Invalid ODF file: missing office:body
odf-parse-error-missing-text = Invalid ODF file: missing office:text
odf-parse-image-alt = Document image

# useDocumentTemplates
doc-templates-error-load-templates = Failed to load templates
doc-templates-toast-load-failed = Failed to load template
doc-templates-toast-sign-in-create = Please sign in to create templates
doc-templates-toast-created = Template created successfully
doc-templates-toast-create-failed = Failed to create template
doc-templates-toast-update-failed = Failed to update template
doc-templates-toast-deleted = Template deleted
doc-templates-toast-delete-failed = Failed to delete template
doc-templates-toast-document-created = Document created from template
doc-templates-toast-document-create-failed = Failed to create document
doc-templates-toast-sign-in-save = Please sign in to save templates
doc-templates-toast-document-not-found = Document not found
doc-templates-toast-saved-as-template = Document saved as template
doc-templates-toast-save-as-template-failed = Failed to save as template

# useDocumentApps
doc-apps-error-not-authenticated = Not authenticated
doc-apps-error-load-documents = Failed to load documents
doc-apps-error-load-document = Failed to load document
doc-apps-toast-document-created = Document created successfully
doc-apps-toast-create-failed = Failed to create document
doc-apps-toast-save-failed = Failed to save document
doc-apps-toast-document-deleted = Document moved to trash
doc-apps-toast-delete-failed = Failed to move document to trash
doc-apps-toast-document-duplicated = Document duplicated
doc-apps-toast-duplicate-failed = Failed to duplicate document
doc-apps-toast-share-success = Document shared successfully
doc-apps-toast-share-failed = Failed to share document
doc-apps-toast-access-revoked = Access revoked
doc-apps-toast-revoke-failed = Failed to revoke access
doc-apps-toast-sent-approval = Document sent for approval
doc-apps-toast-send-approval-failed = Failed to send for approval
doc-apps-toast-approval-cancelled = Approval cancelled
doc-apps-toast-cancel-approval-failed = Failed to cancel approval

# AI Edit
ai-edit-error-generate = Failed to generate AI edit

# Template entity fields (fallbacks)
template-field-code = Code
template-field-description = Description
template-field-id = Id
template-field-value = Value
template-field-display-name = Display name
template-field-currency = Currency
template-field-currency-ref = Currency ref
template-field-amount = Amount
template-field-approved-by = Approved by
template-field-approval-date = Approval date
template-field-supervisor-name = Supervisor name
template-field-unknown-entity = Unknown entity: { $key }
template-field-unknown-error = Unknown error

# Page numbers (Word-like)
page-numbers-dialog-title = Page numbers
page-numbers-settings-dialog-title = Page Number Settings
page-numbers-number-format-label = Number format:
page-numbers-page-numbering-heading = Page numbering
page-numbers-continue-from-previous = Continue from previous section
page-numbers-sections-hint = Section breaks are not supported. Numbering applies to the whole document.
page-numbers-start-at-label = Start at:
page-numbers-position = Position
page-numbers-position-header = Top of page (header)
page-numbers-position-footer = Bottom of page (footer)
page-numbers-alignment = Alignment
header-footer-sidebar-pn-bottom-page = Bottom of page (footer)
header-footer-sidebar-pn-top-page = Top of page (header)
header-footer-sidebar-pn-header-band-hint = The page number uses a dedicated slot in the header row. Outside/Inside switch between the outer and gutter sides on odd/even pages.
page-numbers-align-left = Left
page-numbers-align-center = Center
page-numbers-align-right = Right
page-numbers-align-inside = Inside
page-numbers-align-outside = Outside
page-numbers-align-facing-hint = Facing pages: Inside and Outside switch between the reserved left and right slots on odd/even pages.
page-numbers-show-on-first = Show number on first page
page-numbers-preview = Preview
page-numbers-format-button = Format…
page-numbers-ok = OK
page-numbers-format-title = Page number format
page-numbers-format-numeral-style = Number format
page-numbers-format-style-decimal = 1, 2, 3, …
page-numbers-format-style-lower-roman = i, ii, iii, …
page-numbers-format-style-upper-roman = I, II, III, …
page-numbers-format-style-lower-alpha = a, b, c, …
page-numbers-format-style-upper-alpha = A, B, C, …
page-numbers-format-start-at = Start at
page-numbers-format-ok = OK
editor-toolbar-page-numbers = Page numbers…
header-footer-sidebar-page-numbers-dialog = Page numbers…
header-footer-sidebar-page-number-remove = Remove page number

# External import
external-import-documents-title = Import external documents
external-import-error-load-connectors = Failed to load connectors
external-import-error-load-shared-connections = Failed to load shared connections
external-import-error-preview = Preview failed
external-import-error-start = Failed to start import
external-import-success-imported-documents = Imported {$count} documents from external source
external-import-selector-loading = Loading connectors...
external-import-selector-empty = No document sources connected yet. Go to NEWWORK CONNECT to set up a connection (Google Drive, SharePoint, Confluence, S3, etc.) and enable "Document Import".
external-import-selector-choose = Choose a source to import files from.
external-import-selector-shared-connection = Shared connection
external-import-selector-loading-shared = Loading shared connections...
external-import-selector-use-defaults = Use connector defaults
external-import-selector-preview = Preview
external-import-preview-loading = Loading preview...
external-import-preview-failed = Preview failed
external-import-back = Back
external-import-preview-intro = Preview of items from {$connectorName}
external-import-preview-total = (~{$count} total)
external-import-preview-empty = No items found.
external-import-open = Open
external-import-configure-import = Configure import
external-import-config-intro = Import documents from {$connectorName}
external-import-config-available = (~{$count} items available)
external-import-config-readonly = Imported documents will be read-only while connected to the external source. You can create an editable copy at any time, which will break the connection.
external-import-config-max-items = Max items to import
external-import-config-keep-connected = Keep connected
external-import-config-keep-connected-desc = Stay connected so updates from the source propagate automatically.
external-import-config-refresh-mode = Refresh mode
external-import-config-refresh-manual = Manual - sync on demand
external-import-config-refresh-on-open = On open - sync when documents are opened
external-import-config-refresh-periodic = Periodic - auto-sync on schedule
external-import-config-importing = Importing...
external-import-config-start-import = Start import
external-import-progress-status-queued = Queued
external-import-progress-status-running = Importing...
external-import-progress-status-completed = Completed
external-import-progress-status-failed = Failed
external-import-progress-status-cancelled = Cancelled
external-import-progress-label-with-target = {$imported} / {$target} documents ({$percent}%)
external-import-progress-label-complete = {$count} documents imported
external-import-progress-items-discovered = Items discovered
external-import-progress-documents-imported = Documents imported
external-import-progress-skipped = Skipped (unchanged)
external-import-progress-started = Started
external-import-progress-finished = Finished
external-import-progress-cancel = Cancel
external-import-progress-retry = Retry
external-import-progress-done = Done
trash-action-restore = Restore
trash-action-restoring = Restoring...
trash-action-delete = Delete permanently
trash-action-deleting = Deleting...
trash-toast-restored = Document restored
trash-toast-restore-failed = Failed to restore document
trash-toast-deleted = Document deleted permanently
trash-toast-delete-failed = Failed to delete document permanently
