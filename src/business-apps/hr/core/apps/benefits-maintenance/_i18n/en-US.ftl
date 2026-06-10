# Benefits Maintenance
page-title = Benefits Management
page-description = Manage company benefits, availability by location, eligible groups and providers.

# Tabs
tab-benefits = Benefits
tab-providers = Providers
tab-employee-assignments = Employee Assignments
tab-pending-approvals = Pending Approvals

# Create action
action-create-benefit = Create Benefit

# Filters
filter-search-placeholder = Search benefits...
filter-location = Location
filter-location-all = All
filter-legal-entity = Legal Entity
filter-visibility = Visibility
filter-visibility-all = All
filter-visibility-public = Public
filter-visibility-private = Individual
filter-status = Status
filter-status-all = All
filter-status-active = Active
filter-status-draft = Draft
filter-status-archived = Archived
filter-more = More filters
action-export = Export
action-settings = Settings

# Table columns
col-benefit = Benefit
col-code = Code
col-locations = Locations
col-legal-entity = Legal Entity
col-visibility = Visibility
col-value = Value
col-company-contribution = Company Contribution
col-period = Period
col-currency = Currency
col-status = Status
col-actions = Actions
col-name = Name
col-description = Description
col-display-order = Order
col-providers = Providers

# Status
status-active = Active
status-draft = Draft
status-archived = Archived
status-inactive = Inactive

# Periods
period-monthly = Monthly
period-yearly = Yearly
period-one-time = One-time

# Benefit visibility
visibility-public = Public
visibility-private = Individual

# Pagination
pagination-showing = Showing { $from } to { $to } of { $total } benefits
pagination-per-page = { $count } / page

# Empty states
empty-title = No benefits found
empty-description = No benefit types are configured yet. Create your first benefit type to get started.
empty-no-results = No benefits match your current filters.

# Detail panel
detail-close = Close
detail-tab-details = Details
detail-tab-providers = Providers
detail-tab-assignments = Assignments
detail-tab-history = History
detail-section-basic = Basic Information
detail-section-availability = Availability
detail-section-value = Benefit Value
detail-section-catalog = Catalog Information
detail-field-code = Code
detail-field-description = Description
detail-field-display-order = Display Order
detail-field-status = Status
detail-field-active-from = Active From
detail-field-active-to = Active To
detail-field-countries = Countries / Locations
detail-field-legal-entity = Legal Entity
detail-field-visibility = Visibility
detail-field-value = Value
detail-field-period = Period
detail-field-employee-contribution = Employee Contribution
detail-field-currency = Currency
detail-field-catalog = Catalog
detail-field-version = Version
detail-field-entry-id = Entry ID
action-edit-benefit = Edit Benefit
action-archive-benefit = Archive Benefit
action-reactivate-benefit = Reactivate Benefit
action-edit = Edit

# Benefit Type Dialog
dialog-create-title = Create Benefit
dialog-edit-title = Edit Benefit
field-code = Code
field-code-placeholder = e.g. MEAL_VOUCHER
field-name = Name
field-name-placeholder = Benefit type name
field-description = Description
field-description-placeholder = Optional description
field-country = Country / Location
field-country-placeholder = Select countries
field-legal-entity = Legal Entity
field-legal-entity-placeholder = Select legal entity...
field-legal-entity-hint = Currency is auto-set from the selected legal entity
field-value = Value
field-value-placeholder = e.g. 500
field-period = Period
field-currency = Currency
field-currency-placeholder = e.g. EUR
field-currency-hint = Auto-set based on company
field-visibility = Visibility
field-visibility-hint = Public benefits are visible to all employees. Individual benefits are visible only to HR Backoffice.
field-icon = Icon
field-icon-placeholder = Select an icon...
field-icon-search = Search icons...
field-icon-no-results = No icons found
field-employee-monthly-contribution = Employee Monthly Contribution
field-employee-monthly-contribution-placeholder = e.g. 50
field-employee-monthly-contribution-hint = Default monthly amount the employee contributes toward this benefit
field-display-order = Display Order
field-display-order-placeholder = e.g. 10

# Provider Dialog
dialog-create-provider-title = Create Provider
dialog-edit-provider-title = Edit Provider
field-parent-benefit = Parent Benefit Type
field-parent-benefit-placeholder = Select a benefit type...
field-provider-name = Provider Name
field-provider-name-placeholder = e.g. Allianz, Edenred

# Country filter
country-filter-label = Country
country-filter-placeholder = Select country...
country-filter-all = All Countries
country-loading = Loading countries...

# Form actions
btn-cancel = Cancel
btn-create = Create
btn-save = Save
btn-creating = Creating...
btn-saving = Saving...

# Toasts
toast-created = Benefit "{ $name }" created successfully
toast-updated = Benefit "{ $name }" updated successfully
toast-deactivated = Benefit "{ $name }" archived
toast-activated = Benefit "{ $name }" activated
toast-provider-created = Provider "{ $name }" created successfully
toast-provider-updated = Provider "{ $name }" updated successfully
toast-provider-deleted = Provider "{ $name }" deleted
toast-provider-activated = Provider "{ $name }" reactivated
toast-error = An error occurred: { $message }
toast-copied = Copied to clipboard

# Validation
validation-code-required = Code is required
validation-name-required = Name is required
validation-country-required = At least one country is required
validation-legal-entity-required = Legal entity is required
validation-value-required = Value is required
validation-parent-benefit-required = Parent benefit type is required
validation-currency-missing = Selected company has no currency configured. Please update the company setup first.

# Providers tab (standalone)
providers-title = All Providers
providers-search-placeholder = Search providers...
providers-col-provider = Provider
providers-col-parent = Parent Benefit
providers-empty = No providers found
providers-no-available = No unlinked providers available
action-create-provider = New Provider
action-add-provider = Add Provider
action-select-provider = Select a provider...
action-archive-provider = Archive Provider
action-reactivate-provider = Reactivate Provider
toast-provider-linked = Provider "{ $name }" linked successfully
toast-provider-unlinked = Provider "{ $name }" unlinked
action-back = Back
action-view-providers = View Providers
action-refresh = Refresh

# KPI Cards - Benefits tab
kpi-section-title = Benefits Overview
kpi-available-benefits = Available Benefits
kpi-private-benefits = Individual Benefits
kpi-employees-with-benefits = Employees with Benefits
kpi-avg-per-employee = Avg Benefits / Employee
kpi-trend-vs-last-month = vs last month
kpi-available-footer = Active benefits the company offers
kpi-private-footer = Individual benefits that can be assigned only by HR
kpi-employees-footer = Employees with at least one active benefit
kpi-avg-footer = Average number of benefits per employee

# KPI Cards - Providers tab
kpi-providers-count = Number of Providers
kpi-providers-footer = Across { $count } benefits
kpi-providers-avg = Avg Providers / Benefit
kpi-providers-avg-footer = Average providers per benefit type

# KPI Cards - Employee Assignments tab
kpi-assignments-employees = Employees with Benefits
kpi-assignments-employees-footer = In current period
kpi-assignments-total = Total Active Benefits
kpi-assignments-total-footer = Across all employees
kpi-assignments-avg = Avg. Benefits / Employee
kpi-assignments-avg-footer = Average active benefits per employee

# KPI Cards - Pending Approvals tab
kpi-pending-total = Pending Approvals
kpi-pending-total-footer = Requests pending confirmation
kpi-pending-employees = Employees Requesting
kpi-pending-employees-footer = Distinct employees with pending requests

# Employee Assignments tab
assignments-section-all = All Benefits
assignments-search-placeholder = Search employees, benefits...
assignments-filter-title = Filter Benefits
assignments-filter-description = Narrow down employee benefit assignments
assignments-empty = No employee benefit assignments found for this period.
assignments-detail-title = Benefit Details
assignments-exporting = Exporting...
filter-benefits-title = Filter Benefits
filter-group-legal-entity = Legal Entity
filter-group-provider = Provider
filter-group-status = Status
assignments-kpi-employees = Employees
assignments-kpi-active = Active Assignments
assignments-kpi-active-footer = Total active benefit assignments
assignments-kpi-avg = Avg / Employee
assignments-kpi-avg-footer = Average benefits per employee

# Shared column headers (used by assignments DataTable)
col-employee = Employee
col-benefit-type = Benefit Type
col-provider = Provider
col-monthly-amount = Monthly Amount
col-yearly-amount = Yearly Amount
col-employee-contribution = Employee Contribution
col-start-date = Start Date
col-end-date = End Date

# Status labels (used by assignments view)
status-approved = Approved
status-pending = Pending
status-activation = Activation
status-deactivation = Deactivation
status-unknown = Unknown
status-cancelled = Cancelled

# Benefit detail sheet sections
section-benefit = Benefit Information
section-amounts = Amounts
section-period = Period
section-notes = Notes
field-type = Type
field-provider = Provider
field-monthly-amount = Monthly Amount
field-yearly-amount = Yearly Amount
field-employee-monthly-contrib = Employee Contribution (monthly)
field-start-date = Start Date
field-end-date = End Date

# Month navigation
month-nav-previous = Previous month
month-nav-next = Next month
month-nav-today = Today

# Export
export-sheet-name = Benefits { $month }

# Pending Approvals tab
pending-description = Review and manage pending benefit activation requests from employees.
pending-no-requests = No pending benefit requests at this time.
pending-error-loading = Failed to load pending approvals. Please try again.
pending-col-employee = Employee
pending-col-benefit-type = Benefit Type
pending-col-provider = Provider
pending-col-amount = Amount
pending-col-start-date = Start Date
pending-col-requested-at = Requested
pending-col-status = Status
pending-col-actions = Actions
pending-action-approve = Approve
pending-action-reject = Reject
pending-approve-title = Approve Benefit Request
pending-reject-title = Reject Benefit Request
pending-confirm-approve = Are you sure you want to approve the { $benefitType } benefit for { $employeeName }?
pending-confirm-reject = Are you sure you want to reject the { $benefitType } benefit for { $employeeName }?
pending-reason-placeholder = Add a comment or reason (required for rejection)...
pending-reason-required = A reason is required when rejecting a request.
pending-processing = Processing...
pending-toast-approved = Benefit request approved successfully
pending-toast-rejected = Benefit request rejected

# Legacy / backward-compat keys
types-search-placeholder = Search...
types-empty = No items found
action-delete = Delete
