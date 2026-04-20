# Common
common-back = Back
common-share = Share
common-add-content = Add Content
common-create-space = Create Space
common-cancel = Cancel
common-save = Save
common-change = Change
common-clear = Clear
common-create = Create
common-delete = Delete
common-deleting = Deleting...
common-rename = Rename
common-move = Move
common-move-here = Move here
common-move-to-folder = Move to folder
common-move-to-space = Move to Space
common-try-again = Try Again
common-open = Open
common-join = Join
common-open-chat = Open Chat
common-view-all = View All
common-schedule-meeting = Schedule Meeting
common-live = Live
common-audio-call = Audio Call
common-video-call = Video Call
common-public = Public
common-private = Private
common-online = Online
common-offline = Offline
common-discoverable-by-organization = Discoverable by organization
common-only-invited-members = Only invited members
common-owner = Owner
common-admin = Admin
common-editor = Editor
common-viewer = Viewer
common-you = You
common-invite = Invite
common-optional = (optional)
common-this-item = this item
common-untitled = Untitled
common-unknown = Unknown
common-loading = Loading...
common-breadcrumb = Breadcrumb
common-team-member = Team member
common-root = Root
common-root-directory = Root directory
common-no-folder-top-level = No folder (top level)
common-folder = Folder
common-files = Files
common-members = Members
common-search-spaces-placeholder = Search spaces...
common-search-files-placeholder = Search files...
common-search-members-placeholder = Search members...
common-search-employees-placeholder = Search by name...
common-search-folders-placeholder = Search folders...
common-member-count = { $count ->
    [one] { $count } member
   *[other] { $count } members
}
common-item-count = { $count ->
    [one] { $count } item
   *[other] { $count } items
}
common-folder-count = { $count ->
    [one] { $count } folder
   *[other] { $count } folders
}
common-activities-count = { $count ->
    [one] { $count } activity
   *[other] { $count } activities
}
common-selected-items = { $count ->
    [one] { $count } item selected
   *[other] { $count } items selected
}
common-updated-relative = Updated { $time }

# Content types
content-type-document = Document
content-type-documents = Documents
content-type-note = Note
content-type-notes = Notes
content-type-spreadsheet = Spreadsheet
content-type-spreadsheets = Spreadsheets
content-type-slide = Presentation
content-type-slides = Slides
content-type-whiteboard = Whiteboard
content-type-whiteboards = Whiteboards
content-type-file = File
content-type-folder = Folder

# Hub
hub-title = Spaces
hub-description = Collaborative workspaces for your team. Documents, notes, and spreadsheets in one place.
hub-every-office = Every Office
hub-filter-all = All
hub-filter-owned = Owned
hub-filter-shared = Shared
hub-total-spaces = { $count ->
    [one] { $count } space
   *[other] { $count } spaces
}
hub-owned-summary = { $count } yours
hub-owned-shared-summary = { $owned } yours · { $shared } shared with you
hub-no-spaces-found = No spaces found
hub-no-spaces-yet = No spaces yet
hub-search-empty-description = Try adjusting your search to find what you are looking for
hub-empty-description = Create a space to start organizing your team content
hub-delete-title = Delete this space?
hub-delete-with-name = "{ $name }" will be removed for everyone. Your documents, notes, boards, and slides stay in Every Office; they are only unlinked from this space.
hub-delete-without-name = This space will be removed for everyone. Your content stays in Every Office; it is only unlinked from this space.
hub-delete-confirm = Delete space
hub-toast-space-deleted = Space deleted
hub-toast-space-delete-failed = Could not delete space. Only the owner can delete a space.

# Detail
detail-loading-space = Loading space...
detail-not-found-title = Space not found
detail-not-found-description = This space may have been deleted or you do not have access.
detail-tab-overview = Overview
detail-tab-drive = Drive
detail-tab-members = Members ({ $count })
detail-team-collaboration = Team Collaboration
detail-pinned = Pinned
detail-recent-activity = Recent Activity
detail-toast-space-deleted = Space deleted
detail-toast-space-delete-failed = Could not delete space. Only the owner can delete a space.

# Hero and cards
hero-owner-label = Owner
hero-delete-space = Delete space
card-owner-badge = Owner

# Stats
stats-documents = Documents
stats-spreadsheets = Spreadsheets
stats-notes = Notes
stats-presentations = Presentations
stats-recent-activity = Recent Activity

# Create dialog
create-title = Create Space
create-description = Create a workspace to organize your team's content
create-tab-manual = Create Manually
create-tab-dimension = Create by Group
create-name-label = Name
create-name-placeholder = e.g., Marketing Team
create-description-label = Description
create-description-placeholder = What is this space for?
create-members-label = Members ({ $count })
create-select-group-title = Create Space from Group
create-select-group-description = Select an organizational group and all its members will be automatically added to your space.
create-select-group = Select Group
create-members-will-be-added = { $count } members will be added
create-from-group = Create Space from Group
create-action-with-members = Create Space ({ $count } members)

# Settings dialog
settings-title = Space settings
settings-description = Change the name, description, and visibility of this space
settings-danger-zone = Danger zone
settings-danger-description = Delete this space permanently. Documents, notes, boards, and slides stay in your library but are no longer linked to this space. Only the space owner can delete.
settings-delete-button = Delete space
settings-delete-title = Delete this space?
settings-delete-with-name = "{ $name }" will be removed for everyone. Content you added stays in Every Office; it is only unlinked from this space.
settings-delete-without-name = This space will be removed for everyone. Your content stays in Every Office; it is only unlinked from this space.

# Pinned and activity
pinned-empty-title = No pinned content
pinned-empty-description = Pin important items to feature them here
activity-empty-title = No activity yet
activity-empty-description = Activity will appear as content is modified
activity-action-created = created
activity-action-edited = edited
activity-action-deleted = deleted
activity-action-shared = shared
activity-action-moved = moved
activity-action-commented = commented on
activity-action-uploaded = uploaded

# Content browser
content-tab-all = All
content-empty-search-title = No files match your search
content-empty-title = No files in this location
content-empty-search-description = Try a different search term
content-empty-description = Add content to this space to get started
content-column-name = Name
content-column-type = Type
content-column-modified = Modified
content-column-created = Created
content-remove-from-space = Remove from space

# Members
members-title = Team Members
members-subtitle = { $count } members in this space
members-invite-members = Invite Members
members-sort-by = Sort by:
members-sort-name = Name
members-sort-role = Role
members-sort-join-date = Join Date
members-sort-activity = Activity
members-no-members = No members yet
members-no-search-results = No members match your search
members-change-role = Change Role
members-remove-from-space = Remove from space
members-role-owner-description = Full control over space
members-role-admin-description = Can manage members and content
members-role-editor-description = Can create and edit content
members-role-viewer-description = Can only view content

# Invite dialog
invite-title = Invite Member
invite-description = Search for employees to add to this space
invite-search-label = Search Employee
invite-no-results = No employees found
invite-role-label = Role

# Add content dialog
add-content-title = Add Content
add-content-description = Select your content to add to this space
add-content-empty-search-title = No matching content found
add-content-empty-documents = No documents available to add
add-content-empty-notes = No notes available to add
add-content-empty-spreadsheets = No spreadsheets available to add
add-content-owned-only = Only content you own can be added to a space
add-content-select-items = Select items to add
add-content-button = Add to Space

# Move dialogs
move-content-title = Move Content
move-content-description = Add existing content to this space
move-content-type-label = Content Type
move-content-document-id = Document ID
move-content-note-id = Note ID
move-content-spreadsheet-id = Spreadsheet ID
move-content-document-placeholder = Enter document ID
move-content-note-placeholder = Enter note ID
move-content-spreadsheet-placeholder = Enter spreadsheet ID
move-content-note-title = Moving content
move-content-note-description = When you move content to this space, it will be exclusively owned by the space and removed from your personal area.
move-to-space-title = Move to Space
move-to-space-description-with-name = Move "{ $name }" to a space
move-to-space-description-without-name = Select a space to move this { $contentType }
move-to-space-empty-search = No matching spaces found
move-to-space-empty = No spaces available
move-to-space-create-first = Create a space first to organize your content
move-to-space-footer = Content will be moved exclusively to the selected space
move-to-folder-title = Move to folder
move-to-folder-description = Select a destination for { $item }
move-to-folder-empty-search = No folders match your search
move-to-folder-moving = Moving...

# Folder UI
folder-navigation = Navigation
folder-quick-access = Quick access
folder-section-title = Folders
folder-empty-title = No folders yet
folder-empty-description = Create one to organize your space
folder-new-folder = New folder
folder-new-subfolder = New subfolder
folder-delete-confirm = Delete folder "{ $name }"? Items will move to the parent folder or root.
folder-empty-here = No folders here yet
folder-empty-here-description = Create a folder to organize your content
folder-name-placeholder = Enter folder name
folder-saving = Saving...
folder-create-title = New folder
folder-create-description-root = Create a folder in the drive root
folder-create-description-subfolder = Create a subfolder
folder-rename-title = Rename folder

# Drive
drive-not-supported = Folders are not available on the backend instance you're connected to yet. Once the updated document-service is running, folders will work here.
drive-also-save-to-my-drive = Also save to my Drive

# Calendar
calendar-title = Team Calendar
calendar-meeting-title = { $spaceName } Meeting
calendar-no-upcoming = No upcoming meetings
calendar-no-linked-title = No shared calendar linked to this space yet
calendar-no-linked-description = Connect a shared calendar to this space's group to see and schedule meetings here.
calendar-video = Video
calendar-time-today = Today, { $time }
calendar-time-tomorrow = Tomorrow, { $time }
calendar-time-date = { $date }, { $time }

# Chat and messages
chat-title = Team Chat
chat-no-linked-title = No group chat linked to this space yet
chat-no-linked-description = Create a group chat for this team to enable collaboration
chat-recent-messages = Recent Messages
chat-no-messages = No messages yet
chat-start-conversation = Start the conversation!
chat-shared-file = Shared a file
chat-no-recent-activity = No recent activity
chat-active-just-now = Active just now
chat-active-hours-ago = Active { $count }h ago
chat-active-yesterday = Active yesterday
chat-active-days-ago = Active { $count } days ago

# Presence and huddles
presence-online-summary = { $online } of { $total } online
presence-members-summary = { $total } members
presence-more-members = { $count } more team members
quick-huddle = Quick Huddle

# Live activity
live-activity-title = Live Activity
live-activity-empty-title = No active editing right now
live-activity-empty-description = Activity will appear when team members work on documents
live-activity-editing = is editing
live-activity-viewing = is viewing
live-activity-more = +{ $count } more active
live-activity-duration-just-now = just now
live-activity-duration-minutes-short = { $count }m
live-activity-duration-hours-short = { $count }h

# Time
time-just-now = Just now
time-minutes-ago-short = { $count }m ago
time-hours-ago-short = { $count }h ago
time-yesterday = Yesterday
time-days-ago-short = { $count }d ago

# Errors
error-not-authenticated = Not authenticated
error-load-spaces = Failed to load spaces
error-create-space = Failed to create space
error-create-space-duplicate = A space for this group already exists
error-update-space = Failed to update space
error-delete-space = Failed to delete space
error-load-space = Failed to load space
error-add-member = Failed to add member
error-update-member = Failed to update member
error-remove-member = Failed to remove member
error-fetch-content = Failed to fetch content
error-move-content = Failed to move content
error-remove-content = Failed to remove content
error-load-available-content = Failed to load content
error-load-messages = Failed to fetch messages
error-load-linked-chat = Failed to find linked conversation
error-load-linked-calendar = Failed to find linked shared calendar
error-load-meetings = Failed to load meetings
error-load-folders = Failed to load folders
error-create-folder = Failed to create folder
error-update-folder = Failed to update folder
error-delete-folder = Failed to delete folder
error-load-space-activity = Failed to load space activity
