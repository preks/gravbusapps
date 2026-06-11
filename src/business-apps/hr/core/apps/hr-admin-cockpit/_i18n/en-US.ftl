hr-admin-cockpit-page-title = HR Admin Cockpit
hr-admin-cockpit-page-description = Data Quality & Completion

tab-overview = Overview
tab-issues = Issues

issues-title = Employee Data Issues
issues-subtitle = Review and resolve missing or incomplete employee records filtered by severity and category.

company-filter-all = All companies
company-filter-label = Company filter

section-key-metrics = Key Metrics

kpi-overall-completion = Overall Completion Rate
kpi-overall-footer = Across { $employees } employees and { $areas } required data areas
kpi-employees-missing = Employees with Missing Data
kpi-employees-missing-footer = At least one required field incomplete
kpi-payroll-blockers = Critical Payroll Blockers
kpi-payroll-blockers-trend = Needs attention
kpi-payroll-blockers-footer = Unique employees missing tax info and/or bank account

section-data-completion = Data Completion Overview
data-completion-subtitle = Required employee fields across selected company scope
data-completion-header-required = Required Employee Data
data-completion-header-completion = Completion
data-completion-header-missing = Missing
data-completion-row-aria = { $category }: { $rate }% complete, { $missing } employees missing
data-completion-row-tooltip = { $category }: { $missing } employees missing required data

category-legal-entity = Legal entity
category-location = Location
category-cost-center = Cost center
category-job-position = Job position
category-working-conditions = Working conditions
category-working-hours = Working hours
category-tax = Tax information
category-payroll-bank = Payroll bank account

section-breakdown = Where Data Is Missing (by Legal Entity & Location)
breakdown-subtitle = % of employees with missing data
breakdown-legend-low = 0–25%
breakdown-legend-medium = 26–50%
breakdown-legend-high = 51–75%
breakdown-legend-critical = 76–100%
breakdown-legend-none = No data
breakdown-col-legal-entity = Legal Entity
breakdown-col-all-locations = All Locations

section-job-architecture = Job Architecture Completeness
ja-stat-positions = Job Positions
ja-stat-with-profiles = With Job Profiles
ja-stat-with-descriptions = With Descriptions
ja-stat-with-skills = With Skills
ja-stat-sub-total = Total
ja-stat-sub-of-positions = of positions
ja-stat-sub-of-profiles = of profiles
ja-missing-profiles = Missing Profiles
ja-missing-descriptions = Missing Job Descriptions
ja-missing-skills = Missing Skills

ja-drawer-positions-title = Job Positions Missing Profiles
ja-drawer-descriptions-title = Job Profiles Missing Job Description
ja-drawer-skills-title = Job Profiles Missing Skills

section-recommended-actions = Recommended Actions
recommended-actions-subtitle = Highest-impact cleanup tasks
recommended-affected = { $count } employees affected

action-bank-title = Complete Payroll Bank Details
action-bank-desc = Employees cannot be paid without a valid bank account on file.
action-tax-title = Complete Tax Identifiers
action-tax-desc = Tax numbers are required for statutory payroll reporting.
action-location-title = Assign Locations
action-location-desc = Site location is missing on active assignments.
action-cost-center-title = Assign Cost Centers
action-cost-center-desc = Cost center is missing on active assignments.
action-jp-profile-title = Link Job Profiles to Positions
action-jp-profile-desc = Job positions without profiles break job architecture governance.
action-jprof-desc-title = Add Job Profile Descriptions
action-jprof-desc-desc = Profiles in scope are missing narrative descriptions.
action-jprof-skills-title = Attach Skills to Job Profiles
action-jprof-skills-desc = Skills frameworks require linked skills per profile.

section-top-urgent = Top Urgent Records
top-urgent-subtitle = Most urgent items to resolve next
top-urgent-col-record = Record
top-urgent-col-legal-entity = Legal Entity
top-urgent-col-missing = Missing Fields
top-urgent-col-severity = Severity
top-urgent-col-action = Action
top-urgent-btn-review = Review
top-urgent-view-all-issues = View all { $count } issues

section-records-attention = Records Needing Attention
records-search-placeholder = Search employees...
records-filter-title = Filter Records
records-filter-description = Narrow down records by severity, missing fields, legal entity, or location.
records-clear-focus = Clear focus filter
records-empty = No records match the current filters.

col-employee = Employee
col-legal-entity = Legal Entity
col-location = Location
col-missing-fields = Missing Fields
col-severity = Severity

filter-severity = Severity
filter-severity-critical = Critical
filter-severity-warning = Warning
filter-missing-fields = Missing Fields
filter-legal-entity = Legal Entity
filter-location = Location

detail-employee-details = Employee Details
detail-legal-entity = Legal Entity
detail-location = Location
detail-severity = Severity
detail-missing-data = Missing Data ({ $count })
detail-completeness-checklist = Completeness Checklist
detail-status-ok = OK
detail-status-missing = Missing

flow-update-working-conditions = Update working conditions
flow-update-working-hours = Update working hours
flow-update-tax-details = Update tax details
flow-update-bank-account = Update bank account
action-open-orgchart = Open in OrgChart

profile-sheet-title = Job Profile Details
profile-section-basic = Basic Information
profile-label-name = Name
profile-label-code = Code
profile-label-description = Description
profile-label-job-function = Job Function
profile-label-job-level = Job Level
profile-section-skills = Required Skills and Levels
profile-skill-level = Level { $level }
profile-skill-level-unspecified = Level not specified
profile-btn-edit = Edit
profile-btn-close = Close

issue-legal-entity = Legal entity not assigned
issue-location = Location missing
issue-cost-center = Cost center missing
issue-job-position = Job position missing
issue-working-conditions = Working conditions incomplete
issue-working-hours = Working hours missing
issue-tax = Tax information incomplete
issue-payroll-bank = Bank account missing
issue-jp-no-profile = Job position has no job profile
issue-jp-no-description = Job profile missing description
issue-jp-no-skills = Job profile has no skills

hint-legal-entity = Assign a company / legal entity on the active assignment.
hint-location = Select a site location on the employee assignment.
hint-cost-center = Assign a cost center on the assignment.
hint-job-position = Link a job position.
hint-working-conditions = Complete contract type, employment type, and hire date.
hint-working-hours = Define weekly or daily working hours.
hint-tax = Add tax identifiers required for payroll.
hint-payroll-bank = Add a payroll bank account.
hint-jp-no-profile = Connect this job position to a job profile in MDM / job structures.
hint-jp-no-description = Add a job profile description or localized description.
hint-jp-no-skills = Attach at least one skill to the job profile.

severity-critical = Critical
severity-warning = Warning
severity-info = Info

checklist-legal-entity = Legal entity assigned
checklist-location = Location assigned
checklist-cost-center = Cost center assigned
checklist-job-position = Job position assigned
checklist-working-conditions = Working conditions complete
checklist-working-hours = Working hours recorded
checklist-tax = Tax data present
checklist-payroll-bank = Bank account present

empty-no-data = No data
empty-adjust-filters = Adjust filters.
empty-no-breakdown = No breakdown
empty-no-employees = No employee data in scope.
empty-no-actions = No actions
empty-healthy = Dataset looks healthy.
empty-no-items = No items
empty-all-complete = All records are complete.

btn-show-more = Show more
btn-show-less = Show less

employee-not-assigned = Not assigned

unknown-company = Unknown company
unknown-location = Unknown location
unknown-label = Unknown
unknown-skill = Unknown skill

error-no-structure = No active organizational structure found.
error-load-failed = Failed to load data quality dataset
error-load-filters = Failed to load filters.
