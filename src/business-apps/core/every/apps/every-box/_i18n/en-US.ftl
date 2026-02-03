# EveryBox Translations - English

# Main Component
every-box-title = EveryBox
every-box-blink-button = Blink
every-box-tab-inflows = InFlows
every-box-tab-outflows = OutFlows
every-box-blink-description = Create and assign a quick task instantly
every-box-hero-tagline = Your unified inbox for tasks and workflows
every-box-search-placeholder = Search...

# Filters Dropdown
filters-dropdown-label = Filters
filters-all = All
filters-blinks = Blinks
filters-approvals = Approvals
filters-completed = Completed
filters-active-count = { $count } active

# Detail Panel
detail-panel-empty = Select a task to view details
detail-panel-empty-flow = Select a workflow to view details

# Inbox View
inbox-search-placeholder = Search tasks...
inbox-clear-search = Clear search
inbox-filter-all = All
inbox-filter-blinks = Blinks
inbox-filter-approvals = Approvals
inbox-filter-completed = Completed
inbox-new-tasks-title = New tasks available
inbox-new-tasks-button = Load new tasks
inbox-new-tasks-description = New tasks have arrived. Click to refresh and see them.
inbox-new-completed-tasks-description = New completed tasks have arrived. Click to refresh and see them.
inbox-error-title = Error Loading Tasks
inbox-showing-tasks = Showing {$current} of {$total}{$hasMore} tasks
inbox-load-more = Load More
inbox-no-task-selected = No task selected
inbox-select-task-prompt = Select a task from the list to view details
inbox-task-no-title = Untitled Task

# Inbox Empty States
inbox-empty-no-results = No tasks found matching "{$query}"
inbox-empty-no-blinks = No Blink tasks at the moment
inbox-empty-no-approvals = No approval tasks at the moment
inbox-empty-no-completed = No completed tasks yet
inbox-empty-no-tasks = No tasks assigned to you at the moment

# Outbox View
outbox-search-placeholder = Search workflows...
outbox-clear-search = Clear search
outbox-filter-all = All
outbox-filter-blinks = Blinks
outbox-filter-requests = Requests
outbox-error-title = Error Loading Flows
outbox-error-unable = Unable to load outflows
outbox-error-server = The server is experiencing performance issues. This is a known backend problem.
outbox-try-again = Try Again
outbox-no-flow-selected = No workflow selected
outbox-select-flow-prompt = Select a workflow from the list to view details

# Outbox Empty States
outbox-empty-no-results = No workflows found matching "{$query}"
outbox-empty-no-blinks = No blinks sent yet
outbox-empty-no-requests = No requests initiated yet
outbox-empty-no-workflows = You have not initiated any workflows yet

# Empty State Titles
empty-state-inbox-title = InFlows Empty
empty-state-outbox-title = No Workflows Started
empty-state-completed-title = No Completed Tasks

# Quick Task Modal
blink-created-success = Blink "{$title}" created successfully!
blink-created-error = Failed to create Blink: {$error}
blink-upload-error = Failed to upload attachments: {$error}

# TaskCard Component
task-card-overdue = Overdue
task-card-due-soon = Due soon
task-card-due = Due {$date}
task-card-blink = Blink
task-card-unknown-creator = Unknown
task-card-untitled = Untitled Task

# FlowCard Component
flow-card-blink = Blink
flow-card-service-request = Service Request
flow-card-expenses = Expenses
flow-card-absences = Absences
flow-card-assignee-progress = {$completed} of {$total} completed
flow-card-progress = Progress
flow-card-steps = {$current} of {$total} steps
flow-card-started = Started {$date}
flow-card-completed = Completed {$date}

# TaskDetailHeader Component
task-detail-header-employee-avatar = Employee avatar
task-detail-header-employee = Employee

# TaskDetailFooter Component
task-footer-claim = Claim Task
task-footer-complete = Complete Task
task-footer-approve = Approve
task-footer-acknowledge = Acknowledge

# Task Completion Details
task-completion-details-title = Completion Details
task-approval-details-title = Approval Details
task-acknowledge-details-title = Acknowledge Details
task-completion-completed-by = Completed by
task-completion-completed-at = Completed at
task-completion-outcome = Outcome
task-completion-comment = Comment
task-completion-outcome-completed = Completed
task-completion-outcome-approved = Approved
task-completion-outcome-rejected = Rejected
task-completion-outcome-acknowledged = Acknowledged
task-footer-reject = Reject
task-footer-reassign = Reassign
task-footer-unclaim = Unclaim
task-details-task-claimed = Task claimed successfully!
task-details-task-unclaimed = Task unclaimed successfully!

# FlowDetailDialog Component
flow-detail-loading = Loading...
flow-detail-in-progress = In Progress • Started {$date}
flow-detail-completed-at = Completed {$date}
flow-detail-assignee-progress = Assignee Progress
flow-detail-overall-progress = Overall Progress
flow-detail-steps-count = {$current} of {$total} steps
flow-detail-completed-count = {$completed} of {$total} completed
flow-detail-started = Started
flow-detail-completed = Completed
flow-detail-initiated-by = Initiated By
flow-detail-template = Template
flow-detail-assignee-status = Assignee Status
flow-detail-assignee = Assignee
flow-detail-flow-steps = Flow Steps
flow-detail-step = Step {$number}: {$title}
flow-detail-assigned-to = Assigned to: {$name}
flow-detail-completed-by = Completed by: {$name}
flow-detail-id = ID: {$id}

# TaskDetailDialog Component
task-dialog-completed-success = ✓ Task completed successfully!
task-dialog-blink-completed-success = ✓ Blink completed successfully!
task-dialog-complete-error = Failed to complete task: {$error}
task-dialog-loading = Loading task details...
task-dialog-close = Close
task-dialog-completing = Completing...
task-dialog-complete-task = Complete Task
task-dialog-missing-user-info = Unable to complete task: missing user information.
task-dialog-lowcoder-screen = Lowcoder Screen

# CompletedView Component
completed-search-placeholder = Search completed tasks...
completed-error-title = Error Loading Completed Tasks
completed-empty-search = No completed tasks found matching "{$query}"
completed-empty-default = No completed tasks yet
completed-showing = Showing {$current} of {$total} completed tasks
completed-load-more = Load More

# UniversalCflowTaskDetails Component
task-details-related-to = Related To
task-details-attachments = Attachments ({$count})
task-details-form = Form
task-details-read-only = Read-only
task-details-form-loading = Loading...
task-details-add-comment = Add Comment
task-details-optional = (Optional)
task-details-comment-placeholder = Enter your comment...
task-details-blink-info = This is a quick Blink task. You can complete it directly from here.
task-details-unknown = Unknown
task-details-untitled = Untitled Task
task-details-claim-coming = Claim functionality coming soon
task-details-reassign-coming = Reassign functionality coming soon
task-details-unclaim-coming = Unclaim functionality coming soon
task-details-unknown-action = Unknown action: {$action}
task-details-action-error = Cannot perform action: missing task ID or user ID
task-details-task-rejected = ✓ Task rejected successfully!
task-details-action-failed = Failed to {$action} task

# ErrorBoundary Component
error-boundary-title = Something went wrong
error-boundary-message = An unexpected error occurred
error-boundary-try-again = Try Again

# RemoteScreenLoader Component
remote-screen-failed = Failed to load screen
remote-screen-retry = Retry

# LowcoderScreenLoader Component
lowcoder-screen-failed = Failed to load Lowcoder screen
lowcoder-screen-error-title = Unable to Load Screen
close = Close

# TeamAbsenceCalendar Component
absence-status-approved = Approved
absence-status-pending = Pending
absence-status-rejected = Rejected
absence-calendar-title = Team Absence Calendar
absence-calendar-description = View team absences during this period
absence-calendar-pending-mobile = Highlighted card is pending approval
absence-calendar-pending-desktop = The highlighted row is pending your approval
absence-calendar-error-title = Error Loading Team Absences
absence-calendar-no-members = No team members found
absence-calendar-no-absences = No team absences during this period
absence-calendar-team-member = Team Member
absence-calendar-daily-breakdown = Daily Breakdown
absence-calendar-more = +{$count} more
absence-calendar-pending-approval = Pending Approval
absence-calendar-pending-tooltip = This absence is pending approval

# Validation Messages
validation-field-required = {$field} is required
validation-field-number-invalid = {$field} must be a valid number
task-details-validation-error-title = Please fill in all required fields

# Task Formatters
formatter-today = Today
formatter-yesterday = Yesterday
formatter-status-scheduled = Scheduled
formatter-status-in-progress = In Progress
formatter-status-completed = Completed
formatter-status-failed = Failed
formatter-flow-running = Running
formatter-flow-completed = Completed
formatter-flow-failed = Failed
formatter-flow-terminated = Terminated
formatter-priority-normal = Normal
formatter-priority-high = High
formatter-priority-medium = Medium
formatter-priority-low = Low
