skill-management-title = Skill Management
skill-management-description = Manage skills across the organization

tab-skills-directory = Skills Directory
tab-pending-skills = Pending Skills
tab-skill-categories = Skill Categories

kpi-total-skills = Total Skills
kpi-active-skills = Active Skills
kpi-total-employees-with-skills = Employees with Skills
kpi-pending-requests = Pending Requests

add-new-skill = Add New Skill
edit-skill = Edit Skill
search-skills = Search skills...
search-categories = Search categories...
filter-by-category = Category
filter-by-status = Status
filter-status-all = All
filter-status-active = Active
filter-status-inactive = Inactive

skill-name = Skill Name
skill-description = Description
skill-category = Category
skill-employees = Employees
skill-status = Status
skill-actions = Actions
skill-level-scale = Level Scale
skill-mandatory = Mandatory
skill-created = Created
skill-updated = Last Updated

skill-actions-view = View
skill-actions-edit = Edit
skill-actions-delete = Delete
skill-actions-retry = Retry

skill-details-title = Skill Details
skill-details-employees-title = Employees with this Skill
skill-details-no-employees = No employees have this skill yet
skill-details-view-all = View all employees

employee-name = Employee
employee-level = Level
employee-status = Status
employee-verified = Verified
employee-pending = Pending

skill-form-name-label = Skill Name
skill-form-name-placeholder = Enter skill name
skill-form-description-label = Description
skill-form-description-placeholder = Enter skill description
skill-form-level-scale-label = Level Scale
skill-form-level-scale-placeholder = Maximum level (e.g. 10)
skill-form-mandatory-label = Mandatory Skill
skill-form-save = Save
skill-form-cancel = Cancel
skill-form-name-required = Skill name is required
skill-form-name-duplicate = A skill with this name already exists

confirm-deactivate-title = Deactivate Skill
confirm-deactivate-description = Are you sure you want to deactivate "{$skillName}"? This skill is currently assigned to {$employeeCount} employees.
confirm-deactivate-confirm = Deactivate
confirm-deactivate-cancel = Cancel

confirm-delete-title = Delete Skill
confirm-delete-description = Are you sure you want to delete "{$skillName}"? This action cannot be undone.
confirm-delete-confirm = Delete
confirm-delete-cancel = Cancel

pending-skill-name = Skill Name
pending-requested-by = Requested By
pending-category = Category
pending-date = Date Requested
pending-status = Status
pending-actions = Actions
pending-approve = Approve
pending-reject = Reject
pending-no-requests = No pending skill requests
pending-status-pending = Pending
pending-status-approved = Approved
pending-status-rejected = Rejected
pending-description = Review and action pending skill assignment requests
pending-level-value = Level {$level}
pending-no-process-instance = No process instance found
pending-no-approval-task-tooltip = No approval task found. Please contact the administrator.
pending-approval-task-not-authorized-tooltip = Approval task lookup failed. This could be caused by a lack of authorization. Please try again or contact the administrator.
pending-approval-task-not-open-tooltip = The approval task is no longer open. Please refresh or contact the administrator.
pending-approval-task-lookup-failed-tooltip = Approval task lookup failed. This could be caused by a lack of authorization. Please try again or contact the administrator.
pending-confirm-approve = Approve the skill "{$skillName}" for {$employeeName}?
pending-confirm-reject = Reject the skill "{$skillName}" for {$employeeName}?

category-name = Category Name
category-description = Description
category-skills-count = Skills
category-actions = Actions
category-add = Add Category
category-edit = Edit Category
category-no-categories = No skill categories found

category-form-name-label = Category Name
category-form-name-placeholder = Enter category name
category-form-description-label = Description
category-form-description-placeholder = Enter category description
category-form-save = Save
category-form-cancel = Cancel
category-form-name-required = Category name is required

confirm-delete-category-title = Delete Category
confirm-delete-category-description = Are you sure you want to delete "{$categoryName}"? This category has {$skillCount} skills assigned.
confirm-delete-category-blocked = Cannot delete a category that has skills assigned to it. Please reassign or remove the skills first.

toast-skill-created = Skill "{$name}" has been created
toast-skill-updated = Skill "{$name}" has been updated
toast-skill-deactivated = Skill "{$name}" has been deactivated
toast-skill-deleted = Skill "{$name}" has been deleted
toast-skill-error = An error occurred while processing the skill
toast-skill-approved = Skill request has been approved
toast-skill-rejected = Skill request has been rejected
toast-category-created = Category "{$name}" has been created
toast-category-updated = Category "{$name}" has been updated
toast-category-deleted = Category "{$name}" has been deleted
toast-category-error = An error occurred while processing the category

empty-no-skills = No skills found
empty-no-skills-description = Get started by adding skills to your organization's catalogue.
empty-no-matching-skills = No skills match your search
empty-no-matching-skills-description = Try adjusting your filters or search term.

error-loading-skills = Failed to load skills
error-loading-categories = Failed to load categories
error-loading-pending = Failed to load pending requests
error-permission-denied = You do not have permission to access this page

status-active = Active
status-inactive = Inactive
status-pending = Pending
status-approved = Approved
status-rejected = Rejected

value-yes = Yes
value-no = No

showing-count = Showing {$shown} of {$total}
load-more = Load More

dedup-find-duplicates = Find Duplicates
dedup-panel-title = Skill Deduplication
dedup-analyzing = Analyzing skills for duplicates...
dedup-no-duplicates = No duplicate skills found. Your skills directory is clean!
dedup-analysis-error = Failed to analyze skills for duplicates
dedup-error-need-min-skills = Add at least 2 skills to run duplicate analysis
dedup-error-agent-not-found = Duplicate analysis agent is not configured. Please contact support.
dedup-error-empty-response = Duplicate analysis returned an empty response
dedup-error-parse-failed = Could not process duplicate analysis response
dedup-error-analyze-failed = Duplicate analysis failed. Please try again.
dedup-proposals-found = {$count} duplicate groups found
dedup-approve-all-high = Approve All High Confidence ({$count})
dedup-approve = Approve Merge
dedup-reject = Reject
dedup-execute-merges = Execute {$count} Merges
dedup-execute-approved = Execute {$count} Approved Merges
dedup-confidence-high = High Confidence
dedup-confidence-medium = Medium Confidence
dedup-target-label = Target
dedup-employees-count = {$count} employees
dedup-status-merged = Merged
dedup-status-error = Error
dedup-status-approved = Approved
dedup-status-rejected = Rejected
dedup-executing-progress = Merging {$current} of {$total}...
dedup-executing-skill = Processing: {$name}
dedup-done-title = Deduplication Complete
dedup-done-merged = {$count} merged successfully
dedup-done-errors = {$count} failed
dedup-done-close = Close
