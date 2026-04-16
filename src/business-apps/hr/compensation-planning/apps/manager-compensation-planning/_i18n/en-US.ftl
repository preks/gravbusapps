title = Team compensation
subtitle = View and compare team pay, bonuses, and benefits.
loading = Loading team data...

select-company-placeholder = Select company…
empty-select-company-hint = Select a company to load your team’s compensation data.
error-companies-load = Could not load the company list. {$message}
error-performance-cycles-query-title = Performance cycle directory unavailable
error-performance-cycles-query = Could not load the performance cycle list from the directory. {$message}
error-performance-scores-title = Performance scores unavailable
error-performance-scores = Could not load performance scores for team members. {$message}
error-salary-budget-title = Could not load team salary budget
error-title = Something went wrong
table-section-title = Team members
manager-team-context-card-title = Team compensation
manager-team-budget-allocation-card-title = Remaining budget
budget-summary-total-available = Total budget available
budget-summary-placeholder-value = -
budget-summary-placeholder-footer = Sums salary budgets for your team members’ org units on the latest company budget plan when rows exist (or your position’s unit if members have no OU).
table-empty = No team members match the current filters.
team-summary = { $count ->
  [one] 1 team member
  *[other] {$count} team members
}

search-placeholder = Search...
filter-sheet-title = Filters
filter-sheet-description = Narrow the list by team member, annual salary, or last raise date.

save-drafts = Save Drafts
submit-proposals = Submit Proposals
submitted-count = {$count} submitted
draft-count = {$count} drafts

submit-confirm-title = Submit Proposals
submit-confirm-description = You are about to submit {$count} draft proposals for review. This action cannot be undone.
submit-confirm-ok = Yes, Submit
submit-confirm-cancel = Cancel

over-budget-warning = Your salary increase proposals exceed the allocated budget. Please review before submitting.

col-employee = Employee
col-level = Level
col-tenure = Tenure
col-current-salary = Current Salary
col-band-position = Band Position
col-performance = Performance
performance-score-out-of = {$score} / {$max}
table-cell-empty = {" - "}
col-last-raise = Last Raise
col-proposed-increase = Proposed Increase
col-proposed-bonus = Proposed Bonus
col-justification = Justification
col-bonuses-ytd = Bonuses YTD

tenure-never-raise = Never
tenure-this-month = This month
profile-header-year = year
profile-header-years = years
profile-header-month = month
profile-header-months = months
salary-monthly-suffix = /mo
hire-unknown = Unknown
hire-tooltip = Hired: {$date}

compa-no-band = No pay band data
compa-ratio-label = CR: {$ratio}

filters-toggle-aria = Show or hide filters
search-toggle-aria = Search team members
filter-employee-group = Employee
filter-salary-group = Annual salary
filter-salary-min-label = Minimum (annual)
filter-salary-max-label = Maximum (annual)
filter-salary-min-placeholder = Min
filter-salary-max-placeholder = Max
filter-last-raise-group = Last raise
filter-last-raise-from-placeholder = From
filter-last-raise-to-placeholder = To
filter-range-open = Any
filter-pill-salary-range = Salary: {$min} – {$max}
filter-pill-last-raise-range = Last raise: {$from} – {$to}
filter-pill-last-raise-from = Last raise from {$from}
filter-pill-last-raise-to = Last raise until {$to}
filter-pill-search = Search: "{$q}"
filter-remove-search-aria = Remove search filter
filter-remove-pill-aria = Remove filter
filter-clear-all = Clear all

pagination-range = {$from}–{$to} of {$total} members
pagination-item-suffix = members
pagination-rows-per-page = Rows per page
pagination-page = Page {$current} of {$total}
pagination-prev-aria = Previous page
pagination-next-aria = Next page

manager-team-distribution-method-section = How should the increase pool be split?

manager-team-save-allocations = Distribute
manager-team-save-dialog-title = Save allocations to budget plan
manager-team-save-dialog-description = Choose which team members to include. Each selected person is saved with their preview increase and the correct plan org-unit budget row; unselected members are left unchanged.
manager-team-save-dialog-select-all = Select all
manager-team-save-dialog-select-none = Clear selection
manager-team-save-dialog-none-selected = Select at least one team member.
manager-team-save-dialog-no-pool = There is no salary increase pool for your team budget, so allocations cannot be saved.
manager-team-save-dialog-custom-exceeds-pool-selected = The sum of selected custom allocations exceeds the salary increase pool. Adjust amounts or deselect some members.
manager-team-save-dialog-checkbox-aria = Include { $name } in save
manager-team-save-dialog-cancel = Cancel
manager-team-save-dialog-confirm = Save
manager-team-save-dialog-saving = Saving…
manager-team-save-saving = Saving…
manager-team-save-no-token = You must be signed in to save.
manager-team-save-no-employee = Your employee profile is required to save.
manager-team-save-missing-plan-ou = No salary budget row for this plan on {$name}’s org unit. Complete company budget setup first.
manager-team-save-missing-budget-context = Team budget context is not loaded yet. Wait for the budget to finish loading or refresh the page, then try again.
manager-team-save-custom-exceeds-pool = Total custom allocations exceed the increase pool. Adjust amounts before saving.
manager-team-save-error = Could not save allocations. {$message}
manager-team-save-error-generic = Something went wrong while saving.
manager-team-review-submitted-proposals = Review submitted proposals ({$count})
manager-team-review-submitted-proposals-aria = Open supervisor review for {$count} submitted proposal(s)
manager-team-submit-proposals = Submit proposals
manager-team-submitting = Submitting…
manager-team-submit-no-drafts = Save at least one allocation to the budget plan before submitting. Use Distribute, then save in the dialog.
manager-team-submit-error = Could not submit proposals. {$message}
manager-team-submit-missing-row-version = Could not load budget row version for submission. Refresh the page and try again.
manager-team-proposals-readonly-hint = Proposals have been submitted for review. Editing is disabled.

supervisor-review-no-auth = You must be signed in to approve or send back proposals.
supervisor-review-no-submitted = There are no submitted proposals to act on.
supervisor-review-error-generic = Something went wrong. Try again.
supervisor-review-card-title = Supervisor review
supervisor-review-loading = Loading proposals…
supervisor-review-submitted-count = { $count ->
  [zero] No submitted proposals to review.
  [one] 1 submitted proposal to review.
  *[other] {$count} submitted proposals to review.
}
supervisor-review-busy = Working…
supervisor-review-approve-selected = Approve selected
supervisor-review-none-selected = Select at least one proposal.
supervisor-review-selection-hint = Approve or send back only submitted rows. Draft rows are visible for context and cannot be selected here.
supervisor-review-draft-in-table = { $count ->
  [one] 1 allocation is still in draft (read-only in this list).
  *[other] {$count} allocations are still in draft (read-only in this list).
}
supervisor-review-select-all-aria = Select all submitted proposals
supervisor-review-row-select-aria = Select proposal for { $name }
supervisor-review-row-draft-checkbox-aria = { $name } — draft (not selectable for approve or send back)
supervisor-review-col-employee = Employee
supervisor-review-col-increase-pct = Increase %
supervisor-review-col-increase-amount = Increase amount
supervisor-review-col-new-salary = Proposed salary
supervisor-review-col-status = Status
supervisor-review-col-justification = Justification
budget-plan-status-unknown = Unknown
budget-plan-status-draft = Draft
budget-plan-status-submitted = Submitted
budget-plan-status-approved = Approved
budget-plan-status-rejected = Rejected
budget-plan-status-sent-back = Sent back
budget-plan-status-executed = Executed
supervisor-review-employee-unknown = Employee (not in team list)
supervisor-review-table-section-title = Proposals
supervisor-review-table-search-placeholder = Search by name, amounts, or justification…
supervisor-review-table-empty-filtered = No proposals match your search.
supervisor-review-table-empty-none = No proposals to show.
supervisor-review-send-back = Send back
supervisor-review-send-back-notes-required = Add notes for the team before sending back.
supervisor-review-send-back-title = Send back to team
supervisor-review-send-back-placeholder = Explain what the team should change…
supervisor-review-send-back-cancel = Cancel
supervisor-review-send-back-confirm = Send back
supervisor-review-back-to-team = Go to team compensation
