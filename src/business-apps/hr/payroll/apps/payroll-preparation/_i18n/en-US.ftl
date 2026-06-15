payroll-prep-title = Payroll Preparation
payroll-prep-description = Prepare and validate monthly payroll data across your organization

tab-overview = Overview
tab-payroll-grid = Payroll Grid
tab-exceptions = Exceptions
tab-changes = Changes
tab-country-checks = Country Checks
tab-export = Export & Sign-off

overview-title = Payroll Run Overview
overview-description = Summary of the current payroll preparation status

grid-title = Employee Payroll Grid
grid-description = Review all in-scope employees and their payroll readiness

exceptions-title = Exceptions Dashboard
exceptions-description = Review and resolve payroll blockers and warnings

changes-title = Changes Since Last Payroll
changes-description = Review all employee data changes since the previous payroll run

country-checks-title = Country-Specific Checks
country-checks-description = Validation results for country-specific payroll requirements

export-title = Export & Sign-off
export-description = Export payroll data and complete the sign-off process

status-in-progress = In Progress
status-ready-for-review = Ready for Review
status-approved = Approved for Export
status-exported = Exported
status-closed = Closed

readiness-ready = Ready
readiness-warning = Warning
readiness-blocked = Blocked
readiness-excluded = Excluded

severity-blocker = Blocker
severity-warning = Warning
severity-info = Info

summary-total = Total Employees
summary-ready = Ready
summary-warning = Warnings
summary-blocked = Blocked
summary-excluded = Excluded
summary-blockers = Open Blockers
summary-open-warnings = Open Warnings
summary-changed = Changes

label-company = Company:
label-month = Month:
label-year = Year:
label-readiness = Readiness:
label-department = Department:
label-severity = Severity:
label-category = Category:
select-company = Select Company
select-month = Select Month
no-company-selected = Please select a company to view and manage payroll runs.

runs-title = Payroll Runs
runs-description = View existing payroll runs or create a new one
runs-new-button = New Payroll Run
runs-empty = No payroll runs yet
runs-empty-hint = Create your first payroll run for this company to get started.
runs-col-period = Period
runs-col-status = Status
runs-col-cutoff = Cut-off Date
runs-col-payment = Payment Date
runs-col-created = Created

create-run-title = New Payroll Run
create-run-description = Set the period and key dates for this payroll run
create-run-month = Month
create-run-year = Year
create-run-cutoff = Cut-off Date
create-run-payment = Payment Date
create-run-submit = Create Run
create-run-cancel = Cancel
create-run-duplicate-error = A payroll run already exists for this period.
create-run-payment-date-error = Payment date must be after the cut-off date.

back-to-runs = Back to Runs
runs-select-hint = Select a payroll run from the Overview tab to get started.

grid-employee = Employee
grid-employee-code = Code
grid-country = Country
grid-legal-entity = Legal Entity
grid-status = Status
grid-hire-date = Hire Date
grid-termination-date = Termination Date
grid-department = Department
grid-cost-center = Cost Center
grid-location = Location
grid-contract-type = Contract
grid-fte = FTE
grid-base-salary = Base Salary
grid-bank-details = Bank
grid-variable-pay = Variable Pay
grid-paid-leave = Paid Leave
grid-sick-leave = Sick Leave
grid-unpaid-leave = Unpaid Leave
grid-logged-hours = Logged Hours
grid-capacity = Capacity
grid-balance = Balance
grid-overtime = Overtime
grid-missing-presence = Missing Days
grid-issues = Issues
grid-readiness = Readiness
grid-changed = Changed
grid-salary = Salary
grid-weekly-hours = Weekly Hours
grid-pagination-prev = Previous
grid-pagination-next = Next
grid-pagination-showing = Showing { $start }-{ $end } of { $total }
grid-pagination-page-size = { $size } / page

filter-all = All
filter-search = Search employees or code...
filter-readiness = Readiness Status
filter-changed-only = Changed Only
filter-department = Department

export-mode-all = All In-Scope Employees
export-mode-ready = Ready Only
export-mode-ready-warning = Ready + Warning
export-include-issues = Include Issue Summary
export-apply-grid-filters = Apply grid filters to export
export-grid-filters-active = Grid filters active: { $count } of { $total } employees selected
export-format-label = Format
export-format-csv = CSV (.csv)
export-format-xlsx = Excel (.xlsx)
export-button = Export
export-exceptions-button = Export Exceptions Report
export-success = Payroll data exported successfully.
export-mark-complete = Mark as Completed
export-complete-hint = After exporting the file successfully, confirm completion using the button below.

signoff-prepared-by = Prepared By
signoff-prepared-at = Prepared At
signoff-reviewed-by = Reviewed By
signoff-reviewed-at = Reviewed At
signoff-comments = Comments
signoff-approve = Approve for Export
signoff-reject = Reject
signoff-mark-ready = Mark as Ready for Review
signoff-current-user = Signed in as

step-1-label = Preparation
step-2-label = Review & Approval
step-3-label = Export
step-4-label = Complete
step-completed = Completed
step-pending = Pending
step-1-description = Mark the payroll run as ready for review once all data has been validated.
step-2-description = Review the payroll data and approve or reject it.
step-2-prepared-info = Prepared by { $name } on { $date }
step-2-comment-required = A review comment is required before submitting your decision.
step-2-approve-confirm-title = Confirm approval
step-2-approve-confirm-description = Are you sure you want to approve this payroll run for export?
step-2-approve-confirm-action = Approve
step-2-reject-confirm-title = Confirm rejection
step-2-reject-confirm = Are you sure you want to reject this payroll run? It will be set back to In Progress.
step-2-reject-confirm-action = Reject
step-3-description = Generate the approved payroll export, save the file, and then confirm the export completion.
step-3-review-info = { $decision } by { $name } on { $date }
step-3-review-comment = Review comment
step-4-description = The payroll run has been completed.
signoff-decision-approved = Approved
signoff-decision-not-approved = Not Approved
action-cancel = Cancel

change-new-hire = New Hire
change-termination = Termination
change-salary = Salary Change
change-working-time = Working Time Change
change-contract-type = Contract Type Change
change-legal-entity = Legal Entity Change
change-department = Department Change
change-bank-details = Bank Details Change
change-variable-pay = Variable Pay Change
change-one-off-payment = One-off Payment
change-deduction = Deduction Change
change-absence = Absence Change
change-country-specific = Country-Specific Change

category-missing-contract-data = Missing Contract Data
category-missing-bank-details = Missing Bank Details
category-missing-salary-data = Missing Salary Data
category-missing-tax-social = Missing Tax/Social Data
category-missing-contract-master-data = Missing Contract Master Data
category-missing-absence-data = Missing Absence Data
category-missing-working-hours = Missing Working Hours
category-pending-final-payroll = Pending Final Payroll
category-other-exceptions = Other Exceptions
employee-information-title = Employee Information
employee-contact-chat = Start chat
employee-contact-video = Start video call
employee-contact-call = Start audio call

# Issue codes (short titles; see validationRules / germanyValidation / romaniaValidation)
issue-code-missing-bank-details = Missing bank details
issue-code-missing-base-salary = Missing base salary
issue-code-missing-contract-type = Missing contract type
issue-code-missing-hire-date = Missing hire date
issue-code-missing-fte = Missing FTE
issue-code-payroll-relevant-not-set = Payroll relevance not set on contract type
issue-code-missing-presence-days = Missing presence days
issue-code-pending-variable-pay = Variable pay pending approval
issue-code-de-missing-tax-id = Missing tax ID
issue-code-de-missing-social-insurance = Missing social insurance number
issue-code-de-missing-health-insurer = Missing health insurer
issue-code-de-missing-employment-type = Missing employment type
issue-code-de-sick-leave-eau-missing = Sick leave: eAU not confirmed
issue-code-de-termination-final-payroll = Termination: review final payroll
issue-code-ro-missing-cnp = Missing CNP
issue-code-ro-invalid-cnp = Invalid CNP
issue-code-ro-missing-contract-salary = Missing contract salary
issue-code-ro-missing-work-norm = Missing weekly hours
issue-code-ro-medical-cert-needed = Sick leave: medical certificate

# Issue details
issue-message-missing-bank-details = Bank details are missing. Payroll cannot be processed without valid bank information.
issue-action-missing-bank-details = Navigate to employee profile and add bank account details.
issue-message-missing-base-salary = No active approved salary record found for the current period.
issue-action-missing-base-salary = Ensure an approved salary adjustment exists for this employee.
issue-message-missing-contract-type = Contract type is not specified.
issue-action-missing-contract-type = Update the employment working condition with the correct contract type.
issue-message-missing-hire-date = Hire date is missing.
issue-action-missing-hire-date = Set the hire date in the employee position record.
issue-message-missing-fte = Full-time equivalent (FTE) is not specified.
issue-action-missing-fte = Update working hours to include FTE value.
issue-message-payroll-relevant-not-set = The "payroll_relevant" attribute is not maintained in the contract type configuration.
issue-action-payroll-relevant-not-set = Update the contract type catalog entry to include the "payroll_relevant" attribute in its JSON configuration.
issue-message-missing-presence-days = Employee has { $count } working day(s) without recorded time or absence.
issue-action-missing-presence-days = Verify if the employee was present and log attendance, or record an absence for those days.
issue-message-pending-variable-pay = Variable compensation exists but has not been fully approved.
issue-action-pending-variable-pay = Review and approve pending bonus entries before payroll processing.
issue-message-de-missing-tax-id = Tax identification number is missing. Required for German payroll processing.
issue-action-de-missing-tax-id = Add the tax ID in the employee tax details section.
issue-message-de-missing-social-insurance = Social insurance number is missing. Required for German social contributions.
issue-action-de-missing-social-insurance = Add the social insurance number in the employee tax details section.
issue-message-de-missing-health-insurer = Health insurance fund is not assigned. Required for German payroll.
issue-action-de-missing-health-insurer = Assign the health insurance fund in the employee tax details.
issue-message-de-missing-employment-type = Employment type is not specified (e.g. regular, mini-job).
issue-action-de-missing-employment-type = Set the employment type in working conditions.
issue-message-de-sick-leave-eau-missing = Sick leave recorded but eAU (electronic certificate) status is not confirmed.
issue-action-de-sick-leave-eau-missing = Verify the eAU status for the recorded sick leave days.
issue-message-de-termination-final-payroll = Employee has a termination date. Ensure final payroll review is completed.
issue-action-de-termination-final-payroll = Review and confirm final payroll settlement for the terminating employee.
issue-message-ro-missing-cnp = CNP (Cod Numeric Personal) is missing. Required for Romanian payroll and statutory reporting.
issue-action-ro-missing-cnp = Add the CNP / social security number in the employee tax details section.
issue-message-ro-invalid-cnp = CNP (Cod Numeric Personal) is invalid. The 13-digit checksum validation failed.
issue-action-ro-invalid-cnp = Verify and correct the CNP in the employee tax details section.
issue-message-ro-missing-contract-salary = Contract salary is missing. Required for Romanian payroll processing.
issue-action-ro-missing-contract-salary = Ensure an approved salary record exists for this employee.
issue-message-ro-missing-work-norm = Working time norm (weekly hours) is missing. Required for Romanian payroll.
issue-action-ro-missing-work-norm = Update the working hours configuration for this employee.
issue-message-ro-medical-cert-needed = Employee has { $count } sick leave day(s). Medical certificate is required.
issue-action-ro-medical-cert-needed = Ensure the medical certificate is collected and filed for the sick leave period.

month-1 = January
month-2 = February
month-3 = March
month-4 = April
month-5 = May
month-6 = June
month-7 = July
month-8 = August
month-9 = September
month-10 = October
month-11 = November
month-12 = December

grid-other-leave = Other Leave

country-de = Germany
country-ro = Romania
de-tax-id = Tax ID
de-elstam = ELStAM
de-social-insurance = Social Insurance Nr.
de-health-insurance = Health Insurance
de-eau = eAU Status
de-employment-type = Employment Type
ro-cnp = CNP
ro-reges = REGES
ro-contract = Contract Status
ro-medical-cert = Medical Certificate
ro-d112 = D112 Readiness
ro-suspension = Suspension Status

employee-detail-title = Employee Detail
employee-detail-summary = Summary
employee-detail-personal = Personal Data
employee-detail-contract = Contract & Compensation
employee-detail-time = Time & Absences
employee-detail-country = Country-Specific
employee-detail-issues = Open Issues
employee-detail-changes = Changes
employee-detail-notes = Notes

overview-readiness = Readiness Distribution
overview-no-company-title = { $count } employee(s) without a company assignment
overview-no-company-description = These employees have no legal entity assigned. They may be missing from payroll exports or produce incorrect results. Please assign them to a company in the employee record.

changes-employees = Changed Employees
changes-total = Total Changes
changes-search-placeholder = Search employees or fields...
changes-type-label = Change Type:
changes-col-type = Change Type
changes-col-field = Field
changes-col-old = Old Value
changes-col-new = New Value
changes-col-effective = Effective Date
changes-col-changed-at = Changed At
changes-col-changed-by = Changed By
changes-empty = No changes detected since the last payroll run. Change tracking will be available once a previous payroll run has been closed.
changes-no-match = No changes match the selected filters.

export-mode-label = Export Mode

signoff-title = Sign-off
signoff-status = Status
signoff-comments-placeholder = Add review comments...
signoff-blocked-warning = Cannot approve: { $count } blocked employee(s). Resolve all blockers first.

audit-trail = Audit Trail
audit-empty = No audit events yet.

audit-payroll-created = Payroll run created
audit-marked-ready = Marked as ready for review
audit-status-changed = { $description }
audit-review-approved = { $description }
audit-review-rejected = { $description }
audit-export-generated = { $description }

refresh-data = Refresh
exceptions-hide-addressed = Hide addressed
exceptions-mark-addressed = Mark as addressed
exceptions-search-placeholder = Search employee or text...
exceptions-empty = No exceptions found. All employees pass validation.
exceptions-no-match = No issues match the selected filters or search.
exceptions-pagination-showing = Showing { $start }-{ $end } of { $total }
exception-detail-title = Exception
exception-detail-issue = Issue details
exception-detail-employee = Employee details
exception-detail-suggested-actions = Suggested Actions
exception-detail-open-employee = Open employee record
exception-detail-no-direct-action = No direct update action is available from payroll preparation for this exception yet.
exception-section-review = Review
exception-section-working-conditions = Working Conditions
exception-section-bank-details = Bank Details
exception-section-tax-details = Tax / Social Data
exception-section-salary = Salary
exception-section-working-hours = Working Hours
exception-section-contract-master-data = Contract Master Data
exception-section-absence-data = Absence Data
exception-section-final-payroll = Final Payroll
exception-section-attendance = Attendance
exception-section-variable-pay = Variable Pay
exception-action-update-working-conditions = Update working conditions
exception-action-update-bank-details = Change bank account
exception-action-update-tax-details = Change tax details
exception-action-update-salary = Adjust salary
exception-action-update-working-hours = Update working hours
exception-field-bank-account = Bank account
exception-field-payroll-relevant = Payroll relevant
exception-field-variable-pay-status = Variable pay status

no-data = No data available
loading = Loading...
error-loading = An error occurred while loading data.

label-code = Code
label-message = Message
label-missing = Missing
label-present = Present
label-not-set = Not set
label-not-applicable = N/A
label-changed = Changed
label-days = days
unit-hours-short = h
unit-days-short = d
