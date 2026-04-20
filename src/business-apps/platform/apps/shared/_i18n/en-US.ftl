# InlineCommentPopover
inline-comment-add = Add Comment
inline-comment-placeholder = Add a comment...
inline-comment-button = Comment

# CommentEditor
comment-editor-cancel = Cancel
comment-editor-send = Send
comment-editor-sending = Sending...
comment-editor-send-hint = ⌘+Enter to send
comment-editor-placeholder-default = Write a comment...

# CommentThread
comment-thread-reply = Reply
comment-thread-edit = Edit
comment-thread-resolve = Resolve
comment-thread-delete = Delete
comment-thread-resolved = Resolved
comment-thread-confirm-delete = Are you sure you want to delete this comment?
comment-thread-edit-placeholder = Edit comment...
comment-thread-reply-placeholder = Write a reply...
comment-thread-user-fallback = User

# CommentPanel
comment-panel-title = Comments
comment-panel-unresolved = unresolved
comment-panel-unresolved-tab = Unresolved
comment-panel-resolved-tab = Resolved
comment-panel-all-caught-up = All caught up!
comment-panel-all-resolved = All comments have been resolved
comment-panel-no-resolved = No resolved comments
comment-panel-resolved-here = Resolved comments will appear here
comment-panel-loading = Loading comments...
comment-panel-add-placeholder = Add a comment...
comment-panel-no-comments = No comments yet
comment-panel-no-comments-hint = Add one below to start a thread

# LockControls
lock-file-locked = File is locked
lock-locked-by = Locked by
lock-force-unlock = Force Unlock
lock-locked-by-you = Locked by you
lock-unlock-file = Unlock file
lock-lock-file = Lock
lock-file-title = Lock file to prevent others from editing
lock-dialog-title = Lock File
lock-reason-optional = Reason (Optional)
lock-reason-placeholder = e.g., Working on major changes
lock-duration-label = Lock Duration (minutes)
lock-duration-hint = Lock will automatically expire after this duration (default: 240 minutes / 4 hours)
lock-info = While locked, other users will only be able to view the file. Collaboration features will be disabled.
lock-cancel = Cancel
lock-confirm-button = Lock File
lock-locking = Locking...
lock-confirm-unlock = Are you sure you want to unlock this file?
lock-confirm-force-unlock = Are you sure you want to force unlock this file? This will remove the lock acquired by another user.

# VersionHistory
version-history-title = Version History
version-history-compare = Compare Versions
version-history-cancel-compare = Cancel Compare
version-history-compare-selected = Compare Selected
version-history-loading = Loading versions...
version-history-no-history = No version history yet
version-history-version = Version
version-history-current = Current
version-history-checkpoint = Checkpoint
version-history-autosave = Auto-save
version-history-restore-title = Restore this version
version-history-select-to-compare = Select two versions to compare. Click on a version to select it.
version-history-confirm-restore = Are you sure you want to restore to version { $number }? This will create a new version with the restored content.
version-history-user-unknown = Unknown

# AutoSaveIndicator
autosave-saving = Saving...
autosave-unsaved = Unsaved changes
autosave-not-saved = Not saved yet
autosave-saved-ago = Saved { $time }
autosave-version-history = Version history
autosave-save-checkpoint = Save checkpoint
autosave-version-placeholder = v—

# MoveToSpace
move-to-space-menu-label = Move to Space
move-to-space-title = Move to Space
move-to-space-description-with-name = Move "{ $name }" to a space
move-to-space-description-generic = Select a space to move this { $type }
move-to-space-type-document = document
move-to-space-type-note = note
move-to-space-type-spreadsheet = spreadsheet
move-to-space-search-placeholder = Search spaces...
move-to-space-no-matching = No matching spaces found
move-to-space-no-spaces = No spaces available
move-to-space-create-first = Create a space first to organize your content
move-to-space-footer-hint = Content will be moved exclusively to the selected space
move-to-space-cancel = Cancel
move-to-space-move = Move
move-to-space-error-not-authenticated = Not authenticated
move-to-space-error-fetch-failed = Failed to load spaces
move-to-space-error-move-failed = Failed to move content
move-to-space-success = Moved to space successfully

# CheckpointDialog
checkpoint-dialog-title = Save Version Checkpoint
checkpoint-dialog-description-label = Description (Optional)
checkpoint-dialog-placeholder = e.g., Added new section, Fixed typos, Major revision
checkpoint-dialog-hint = Add a description to help you remember what changed in this version.
checkpoint-dialog-cancel = Cancel
checkpoint-dialog-saving = Saving...
checkpoint-dialog-save = Save Checkpoint

# PublishDialog
publish-dialog-title = Publish { $entityType }
publish-dialog-info = Publishing will make this { $entityType } publicly available and mark it as final.
publish-dialog-notes-label = Publishing Notes (Optional)
publish-dialog-notes-placeholder = e.g., Final version ready for distribution, Approved by team
publish-dialog-notes-hint = Add notes about this publication for future reference.
publish-dialog-create-checkpoint = Create version checkpoint when publishing
publish-dialog-cancel = Cancel
publish-dialog-publishing = Publishing...
publish-dialog-publish = Publish
publish-dialog-entity-document = document
publish-dialog-entity-note = note
publish-dialog-entity-spreadsheet = spreadsheet app

# DimensionPicker
dimension-select-type-prompt = Select a group type to create your space from
dimension-select-from = Select from
dimension-search-placeholder = Search...
dimension-no-results = No results found
dimension-no-available = No dimensions available
dimension-members-to-add = Members to add
dimension-no-members-found = No members found
dimension-cannot-create-empty = Cannot create with no members
dimension-step-type = 1. Type
dimension-step-group = 2. Group
dimension-step-confirm = 3. Confirm
dimension-cancel = Cancel
dimension-back = Back
dimension-continue = Continue
dimension-available = available
dimension-organization-unit = Organization Unit
dimension-matrix-team = Matrix Team
dimension-location = Location
dimension-legal-entity = Legal Entity
dimension-capability = Capability

# StatusBadge
status-badge-archived = Archived
status-badge-draft = Draft
status-badge-in-review = In review
status-badge-published = Published

# Pagination labels
pagination-prev = Previous
pagination-next = Next
pagination-range = Showing { $start }–{ $end } of { $total }

# Shared hook fallback errors (versioning, publishing, lock, comments, dimensions)
shared-error-load-versions = Failed to load versions
shared-error-create-checkpoint = Failed to create checkpoint
shared-error-auto-save = Failed to auto-save
shared-error-restore-version = Failed to restore version
shared-error-restore-version-owner-only = You can only restore versions for files you own. Ask the owner to restore this version.
shared-error-delete-version = Failed to delete version
shared-error-compare-versions = Failed to compare versions
shared-error-publish = Failed to publish
shared-error-unpublish = Failed to unpublish
shared-error-update-status = Failed to update status
shared-error-load-dimensions = Failed to load organizational dimensions
shared-error-load-members = Failed to load members for { $type }
shared-error-check-lock = Failed to check lock status
shared-error-acquire-lock = Failed to acquire lock
shared-error-release-lock = Failed to release lock
shared-error-force-unlock = Failed to force unlock
shared-error-load-comments = Failed to load comments
shared-error-create-comment = Failed to create comment
shared-error-update-comment = Failed to update comment
shared-error-resolve-comment = Failed to resolve comment
shared-error-unresolve-comment = Failed to unresolve comment
shared-error-delete-comment = Failed to delete comment
shared-error-reply-comment = Failed to reply to comment
