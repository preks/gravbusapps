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
ai-edit-fast-mode = Fast mode (Groq)
ai-edit-smart-mode = Smart mode (OpenAI)
ai-edit-smart = Smart
ai-edit-fast = Fast

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
editor-toolbar-font = Font
editor-font-default = Default
editor-font-arial = Arial
editor-font-times = Times New Roman
editor-font-georgia = Georgia
editor-font-verdana = Verdana
editor-font-courier = Courier New
editor-font-garamond = Garamond
editor-font-trebuchet = Trebuchet MS
editor-toolbar-link-prompt = URL
editor-toolbar-image-prompt = Image URL

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
editor-save-checkpoint = Save Checkpoint
editor-unlock-document = Unlock Document
editor-lock-document = Lock Document
editor-publish = Publish...
editor-save-as-template = Save as Template
editor-send-for-approval = Send for Approval
editor-export-word = Export as Word (.docx)
editor-export-pdf = Export as PDF
editor-print = Print
editor-ai-edit = AI Edit

# Page setup dialog
page-setup-title = Page setup
page-setup-tab-pages = Pages
page-setup-tab-pageless = Pageless
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
page-setup-use-pageless = Use pageless
page-setup-pageless-description = Show document as one continuous page without page breaks.
page-setup-cancel = Cancel
page-setup-ok = OK
page-size-a4 = A4
page-size-a3 = A3
page-size-a5 = A5
page-size-letter = Letter
page-size-legal = Legal
page-size-tabloid = Tabloid
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
preview-card-status-archived = Archived
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
preview-card-delete = Delete
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
doc-apps-toast-document-deleted = Document deleted
doc-apps-toast-delete-failed = Failed to delete document
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
