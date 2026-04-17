# Common
common-add = Add
common-admin = Admin
common-back = Back
common-board = Board
common-boards = Boards
common-cancel = Cancel
common-close = Close
common-collapse-sidebar = Collapse sidebar
common-create = Create
common-create-with-ai = Create with AI
common-create-manually = Create manually
common-create-by-group = Create by group
common-delete = Delete
common-done = Done
common-editor = Editor
common-favorites = Favorites
common-hidden = Hidden:
common-home = Home
common-import = Import
common-loading = Loading...
common-modified = Modified
common-move = Move
common-name = Name
common-new = New
common-open = Open
common-people = People
common-properties = Properties
common-recent = Recent
common-remove = Remove
common-rename = Rename
common-row = row
common-rows = Rows
common-save = Save
common-search = Search
common-search-placeholder = Search...
common-settings = Settings
common-share = Share
common-shared-with-me = Shared with me
common-space = Space
common-spaces = Spaces
common-table = Table
common-unknown = Unknown
common-viewer = Viewer
common-prev = Prev
common-next = Next
common-page = Page
error-load-boards = Failed to load boards
error-load-board = Failed to load board
error-create-board = Failed to create board
error-update-board = Failed to update board
error-load-rows = Failed to load rows
error-update-row = Failed to update row
error-load-spaces = Failed to load spaces
error-import-failed = Import failed
error-export-failed = Export failed
error-import-no-valid-csv = No valid rows found in CSV

# Hub
hub-title = Boards
hub-section-all-boards = All Boards
create-board-title = New Board
create-board-description = Give your board a name to get started.
create-board-name-label = Board name
create-board-name-placeholder = My Board
create-board-submit = Create Board
hub-create-board-success = Board created
hub-create-board-in-space-success = Board created in space
hub-space-created-success = Space created
hub-space-deleted-success = Space deleted
hub-board-moved-to-space-success = Board moved to space
hub-boards-added-to-space-success = { $count } board{ $count ->
    [one]
   *[other]s
} added to space
hub-added-to-favorites = Added to favorites
hub-removed-from-favorites = Removed from favorites
hub-default-sheet-name = Main
hub-default-column-name = Name
hub-default-column-status = Status
hub-default-status-todo = To Do
hub-default-status-in-progress = In Progress
hub-default-status-done = Done
hub-default-view-table = Table
hub-board-column-header = Name
hub-collection-column-header = Collection
hub-modified-column-header = Modified
hub-rows-column-header = Rows
hub-create-board-option-title = Board
hub-create-board-option-description = Create a new board
hub-create-ai-board-option-title = Board with AI
hub-create-ai-board-option-description = Generate with AI assistance
hub-create-space-option-title = Space
hub-create-space-option-description = Organize boards together
hub-empty-title-default = No boards yet
hub-empty-description-default = Create your first board to get started.
hub-empty-title-shared = Nothing shared with you
hub-empty-description-shared = When someone shares a board with you, it will appear here.
hub-empty-title-favorites = No favorites
hub-empty-description-favorites = Star boards to see them here.
hub-empty-title-recent = No recent boards
hub-empty-description-recent = Boards you work on will appear here.

# Sidebar
sidebar-home = Home
sidebar-all-boards = All Boards
sidebar-favorites = Favorites
sidebar-shared = Shared with me
sidebar-recent = Recent
sidebar-no-spaces = No spaces yet
sidebar-no-boards = No boards
sidebar-add-board = Add board
sidebar-search-placeholder = Search...
sidebar-new-tooltip = New
sidebar-collapse-tooltip = Collapse sidebar

# Board header and viewer
board-breadcrumb-aria = Breadcrumb
board-search-label = Search
board-search-tooltip = Search in board
board-share-tooltip = Share
board-import-tooltip = Import data
board-import-system-data = System data
board-import-flow-data = Flow data
board-activity-tooltip = Board activity
board-settings-tooltip = Board settings
board-add-row = Add row
table-add-column = Add column
table-add-view = Add view
board-add-view-dialog-title = Add a new view
board-add-view-dialog-description = Choose how you want to visualize your data. Each view provides a different perspective.
board-add-view-submit = Create view
board-view-default-name = View
board-view-type-aria = View type
board-view-name-label = View name
board-view-configuration = Configuration
board-view-type-table = Table
board-view-type-kanban = Kanban
board-view-type-calendar = Calendar
board-view-type-timeline = Timeline
board-view-type-form = Form
board-view-type-dashboard = Dashboard
board-view-desc-table = Rows and columns, like a spreadsheet. Best for editing and bulk data entry.
board-view-desc-kanban = Drag-and-drop cards grouped by status. Great for tracking workflows.
board-view-desc-calendar = View items on a monthly calendar by date. Perfect for scheduling.
board-view-desc-timeline = Gantt-style bar chart across a date range. Ideal for project planning.
board-view-desc-form = A submission form that creates new rows. Use for intake and requests.
board-view-desc-dashboard = Charts, KPIs, and widgets built from your data. For reporting at a glance.
board-view-group-by-column = Group by column
board-view-card-title = Card title
board-view-date-column = Date column
board-view-start-date = Start date
board-view-end-date = End date
board-view-bar-label = Bar label
board-view-dependencies = Dependencies
board-view-select-column = Select column
board-view-none-optional = None (optional)
board-view-none = None
table-delete-view-title = Delete view
table-delete-view-description = Are you sure you want to delete "{ $viewName }"? All configuration and data associated with this view will be lost.
table-filter-summary-single = 1 filter
table-filter-summary-multiple = { $count } filters
table-sort-summary-multiple = { $count } sorts
table-filter-button = Filter
table-sort-button = Sort
table-filter-match = Match
table-filter-conditions = conditions
table-filter-where = Where
table-add-filter = Add filter
table-add-sort = Add sort
table-filtered-count = { $filtered } of { $total }
table-clear-button = Clear
table-filter-column-placeholder = Column
table-filter-value-placeholder = Value
table-filter-and = and
table-save-quick-filter = Save as quick filter
table-no-columns = No columns yet.
table-add-columns-hint = Add columns to start building your board.
table-no-rows = No rows yet.
table-no-rows-filtered = No rows match the current filters.
table-new-row = New row
board-viewer-loaded-summary = { $loaded } of { $total } { $total ->
    [one] row
   *[other] rows
}
board-viewer-page-summary = { $total } { $total ->
    [one] row
   *[other] rows
}{ $showPage ->
    [true]  | Page { $page } of { $totalPages }
   *[false]
}
board-activity-title = Board Activity
board-no-activity = No activity yet.
board-search-dialog-title = Search this board
board-loading-steps = Loading steps...
board-no-steps = No steps found
board-failed-save = Failed to save
board-failed-reorder-row = Failed to reorder row
board-create-page-empty-title = Create a page to start writing
board-properties = Properties
board-untitled = Untitled
board-add-icon = Add icon
board-add-cover = Add cover
board-gradient = Gradient
board-upload-image = Upload image
board-editor-placeholder = Type / for commands...
board-tab-page = Page
board-tab-activity = Activity
board-collaborative-editing = Collaborative editing
board-rich-text-bold = Bold
board-rich-text-italic = Italic
board-rich-text-underline = Underline
board-rich-text-strikethrough = Strikethrough
board-rich-text-code = Code
board-rich-text-highlight = Highlight
board-rich-text-link = Link
board-rich-text-align-left = Align left
board-rich-text-align-center = Align center
board-rich-text-align-right = Align right
board-rich-text-heading-1 = Heading 1
board-rich-text-heading-2 = Heading 2
board-rich-text-heading-3 = Heading 3
board-slash-heading-1-description = Large section heading
board-slash-heading-2-description = Medium section heading
board-slash-heading-3-description = Small section heading
board-slash-bullet-list = Bullet List
board-slash-bullet-list-description = Unordered list
board-slash-numbered-list = Numbered List
board-slash-numbered-list-description = Ordered list
board-slash-task-list = Task List
board-slash-task-list-description = Checkable todo items
board-slash-quote = Quote
board-slash-quote-description = Block quotation
board-slash-divider = Divider
board-slash-divider-description = Horizontal separator
board-slash-code-block = Code Block
board-slash-code-block-description = Fenced code block
board-slash-image = Image
board-slash-image-description = Upload or paste an image
board-sync-synced = Synced
board-sync-offline = Offline
board-sync-saving = Saving...
board-sync-unsaved = Unsaved changes
board-sync-saved = Saved

# Home and hero
home-quick-start-title = Quick start from template
home-template-create-failed = Failed to create board from template
home-template-create-unexpected = Something went wrong creating the board
home-template-created = { $templateName } board created
home-template-created-with-items = { $templateName } created with { $count } sample items
home-all-caught-up = All caught up
home-no-action-items = No tasks need your attention right now.
home-my-tasks = My Tasks
home-greeting-morning = Good morning
home-greeting-afternoon = Good afternoon
home-greeting-evening = Good evening
home-greeting-night = Good night
home-greeting-subtitle = Here's what's happening across your boards.
home-overdue = { $count } overdue
home-today = { $count } today
home-deadline-today = Today
home-deadline-tomorrow = Tomorrow
home-deadline-yesterday = Yesterday
home-deadline-overdue = { $count }d overdue
home-deadline-in-days = In { $count }d
home-section-overdue = Overdue
home-section-due-today = Due today
home-section-this-week = This week
home-section-upcoming = Upcoming
home-section-blocked = Blocked
home-show-less = Show less
home-show-more = Show { $count } more
home-completed = Completed
hero-overview-title = Board Overview
hero-hub-title = Boards Hub
hero-ai-board-button = AI Board
hero-activity-title = What's New / What Changed
hero-activity-empty = No board activity yet.
hero-activity-just-now = Just now
hero-activity-minutes-ago = { $count }m ago
hero-activity-hours-ago = { $count }h ago
hero-activity-yesterday = Yesterday
hero-activity-days-ago = { $count }d ago
hero-activity-rows = { $count } row{ $count ->
    [one]
   *[other]s
}
hero-activity-sheets = { $count } sheet{ $count ->
    [one]
   *[other]s
}
hero-activity-shared = Shared
hero-insights-title = Statistics & Forecast
hero-insights-next-30-days = Next 30 Days
hero-insights-board-breakdown = Board Breakdown
hero-forecast-est-new-boards = Est. New Boards
hero-forecast-expected-rows = Expected Rows
hero-forecast-active-boards = Active Boards
hero-forecast-collaboration = Collaboration
hero-breakdown-total-rows = Total Rows
hero-breakdown-avg-rows-per-board = Avg Rows/Board
hero-insight-strong-engagement = Board engagement is strong
hero-insight-growth-on-track = Growth trajectory on track
hero-total-boards = Total Boards
hero-all-time = All time
hero-total-rows = Total Rows
hero-active-this-week = Active This Week
hero-shared-boards = Shared Boards
hero-overdue-items = Overdue Items
hero-draft = Draft
hero-promoted = Promoted
hero-stable = Stable
hero-growth-new = +{ $count } new
hero-growth-wow = { $pct }% WoW
hero-on-track = All boards performing on track
hero-needs-attention = { $count } items need attention
template-project-tracker = Project Tracker
template-crm-pipeline = CRM Pipeline
template-sprint-board = Sprint Board
template-content-calendar = Content Calendar
template-bug-tracker = Bug Tracker
template-event-planning = Event Planning
template-recruitment-pipeline = Recruitment Pipeline
template-product-roadmap = Product Roadmap
template-inventory-tracker = Inventory Tracker
template-production-board = Production Board

# Collections
collection-create-title = Create space
collection-create-description = Create a shared space for boards and team collaboration.
collection-create-from-group-title = Create Space from Group
collection-space-shared-title = Space Shared!
collection-name-label = Name
collection-description-label = Description (optional)
collection-icon-label = Icon (optional)
collection-color-label = Color (optional)
collection-default-role = Default role
collection-add-people = Add people
collection-search-people-placeholder = Search by name or email...
collection-search-spaces-placeholder = Search spaces...
collection-search-boards-placeholder = Search boards...
collection-name-placeholder = e.g. Marketing, Engineering, Q1 Planning...
collection-description-placeholder = What is this space for?
collection-move-description = Move "{ $boardName }" to a space.
collection-add-boards-description = Select boards to add to "{ $collectionName }".
collection-manage-members-description = Manage who can access "{ $collectionName }".
collection-share-board-members-description = People who have access to "{ $boardTitle }"
collection-fallback-name = Space
collection-no-members = No members yet
collection-no-boards-title = No boards yet
collection-no-boards = No boards
collection-open-in-spaces = Open in Spaces
collection-delete-confirm = Delete this space? Boards will not be deleted.
collection-delete-board-confirm = Delete "{ $boardName }"? This cannot be undone.
collection-share-success = Space shared with { $count ->
    [one] { $count } person
   *[other] { $count } people
}
collection-role-updated = Role updated
collection-role-update-failed = Failed to update role
collection-role-update-missing = Cannot update role: missing user or team id
collection-member-removed = Member removed
collection-member-remove-failed = Failed to remove member
collection-member-remove-missing = Cannot remove member: missing user or team id
collection-space-role-updated = Space role updated
collection-member-removed-from-space = Member removed from space

# Share board
share-board-notified = { $userName } has been notified.
share-board-search-placeholder = Search by name or email...
share-board-message-placeholder = Add a message (optional)
share-board-done = Done
share-board-empty = This board hasn't been shared with anyone yet.
rename-board-title = Rename Board
rename-board-placeholder = Board name

# Audit
audit-filter-board = Board
audit-filter-sheet = Sheet
audit-filter-rows = Rows
audit-action-created = Created
audit-action-updated = Updated
audit-action-deleted = Deleted
audit-action-reordered = Reordered
audit-action-imported = Imported
audit-action-sheet-updated = Sheet updated
audit-action-board-created = Board created
audit-action-board-updated = Board updated
audit-action-board-deleted = Board deleted
audit-action-shared = Shared
audit-action-duplicated = Duplicated
audit-load-failed = Could not load activity.
audit-hide-changes = Hide changes
audit-field-changes = { $count } field{ $count ->
    [one]
   *[other]s
} changed

# Filters and column types
filter-op-is-empty = is empty
filter-op-is-not-empty = is not empty
filter-op-contains = contains
filter-op-does-not-contain = does not contain
filter-op-is = is
filter-op-is-not = is not
filter-op-starts-with = starts with
filter-op-ends-with = ends with
filter-op-between = between
filter-op-is-before = is before
filter-op-is-after = is after
filter-op-is-between = is between
filter-op-is-today = is today
filter-op-is-this-week = is this week
filter-op-is-this-month = is this month
filter-op-is-any-of = is any of
filter-op-is-none-of = is none of
filter-op-is-checked = is checked
filter-op-is-not-checked = is not checked
filter-op-has-any-of = has any of
filter-op-has-none-of = has none of
column-type-text = Text
column-type-number = Number
column-type-status = Status
column-type-priority = Priority
column-type-date = Date
column-type-datetime = Date & Time
column-type-select = Select
column-type-multiselect = Multi-Select
column-type-boolean = Checkbox
column-type-people = People
column-type-currency = Currency
column-type-percentage = Percentage
column-type-rating = Rating
column-type-progress = Progress
column-type-email = Email
column-type-phone = Phone
column-type-url = URL
column-type-tags = Tags
column-type-relation = Relation
column-type-mirror = Mirror
column-type-rollup = Rollup

# Flow engine and external data
flow-field-flow-id = Flow ID
flow-field-flow-name = Flow Name
flow-field-status = Status
flow-field-progress = Progress
flow-field-initiated-by = Initiated By
flow-field-initiated-by-id = Initiated By ID
flow-field-start-time = Start Time
flow-field-last-updated = Last Updated
flow-field-end-time = End Time
flow-field-priority = Priority
flow-field-overdue = Overdue
flow-field-template-id = Template ID
flow-field-task-id = Task ID
flow-field-title = Title
flow-field-step-name = Step Name
flow-field-custom-status = Custom Status
flow-field-due-date = Due Date
flow-field-scheduled-at = Scheduled At
flow-field-completed-at = Completed At
flow-field-assigned-to = Assigned To
flow-field-claimed-by = Claimed By
flow-field-assignment-status = Assignment Status
flow-field-step-index = Step Index
flow-field-template-name = Template Name
external-imported-rows = Imported { $count } rows from external source
external-preview-no-data = Preview returned no data
external-import-start-failed = Failed to start import

# Notifications
notification-permission-edit = edit
notification-permission-comment = view and comment on
notification-permission-view = view
notification-someone = Someone
notification-message-prefix = Message
notification-board-shared-name = Board Shared: { $boardTitle }
notification-board-shared-description = Board sharing notification
notification-board-shared-body = { $initiatorName } shared the board "{ $boardTitle }" with you. You can { $permissionLabel } this board.
notification-board-shared-body-with-message = { $initiatorName } shared the board "{ $boardTitle }" with you. You can { $permissionLabel } this board.

    Message: { $message }

# Entity data
entity-category-hr = HR & People
entity-category-recruiting = Recruiting
entity-category-organization = Organization
entity-category-crm = CRM & Sales
entity-category-finance = Finance
entity-category-other = Knowledge & Assets
entity-unknown = Unknown
