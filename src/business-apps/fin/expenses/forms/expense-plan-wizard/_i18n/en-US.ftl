# Expense Plan Wizard - English (transl.txt add_items_to_plan / modify_expense_request / create_expense_plan / approve_expense_request)

# Items screen
subtitle = Expenses
expense-items-counter = Estimated Expense Items
add-position-btn = Add Expense Item
add-items-button = Add Estimated Expense Items
total-text = Estimated Expenses
loading-text = Loading...

# Wizard footer (items step)
cancel-items-button = Cancel
save-button = Save
submit-button = Next

# Item card fallbacks (expense_item_request_card)
no-expense-group = No expense group
no-cost-center = No Cost Center

# Errors
error-fetch-items-payload = Error fetching items from payload

# Wizard shell
toast-action-canceled = The action has been canceled.
discard-plan-error = Failed to discard expense plan
invalid-profile-title = Validation Issue
wizard-btn-submit = Submit
wizard-back-text = Back
wizard-edit-text = Edit
wizard-btn-cancel = Cancel
wizard-btn-confirm = Confirm
title-input-placeholder = Enter Title
current-title-custom-rule = Please enter a title
maximum-characters-title-error-message = Maximum limit reached: The title can be up to 50 characters only.
trip-details-title = Trip Details
advance-payment-title = Advance Payment
summary-title = Summary

# Load / context (create_expense_request_wizard / modify_expense_request / create_expense_request / create_expense_item)
missing-employee-id = Missing employee ID
error-fetching-expense-data = Error fetching expense data
missing-expense-rule-message = There is no rule set for your user, please reach out to your administrator.
error-employee-rule = Error fetching employee expense rule
error-missing-user-info = Missing user information
error-load-trip-data = Error loading initial trip data
missing-plan-data = Missing plan data

# Trip screen (add_items_to_plan.add_trip_info_to_plan / create_expense_request.add_request_trip_details)
trip-start-location = Start Location
trip-departure = Departure
trip-start-input-label = Start Location
trip-start-date-label = Start Date
trip-end-date-label = Arrival Date
trip-start-time-label = Start Time
trip-destination = Destination
trip-departure-date = Departure Date
trip-departure-time = Departure Time
trip-add-destination = Add Destination
trip-end-location = End Location
trip-arrival = Arrival
trip-end-input-label = End Location
trip-arrival-date = Arrival Date
trip-arrival-time = Arrival Time
trip-skip-advance-payment-label = Request Advance Payment

# Trip overlap warnings (add_items_to_plan.add_trip_info_to_plan)
trip-overlap-absences-error = The selected date overlaps with an existing event: { $employeeAbsence } from { $absenceRequestTimeStampStart } to { $absenceRequestTimeStampEnd }. Please adjust the date.
trip-overlap-request-error = The selected date overlaps with an existing event: Expense Request { $requestTitle } from { $requestTimeStampStart } to { $requestTimeStampEnd }. Please adjust the date.
trip-overlap-request-draft-warning = The selected date overlaps with a draft event: Expense Request { $requestTitle } from { $requestTimeStampStart } to { $requestTimeStampEnd }. Please review before submitting if adjustments are needed.
trip-overlap-plan-error = The selected date overlaps with an existing event: Expense Plan { $planTitle } from { $planTimeStampStart } to { $planTimeStampEnd }. Please adjust the date.
trip-overlap-plan-draft-warning = The selected date overlaps with a planned event: Expense Plan { $planTitle } from { $planTimeStampStart } to { $planTimeStampEnd }. Please review before submitting if adjustments are needed.

# Weekday names (allowance list / getDayName)
wizard-weekday-sunday = Sunday
wizard-weekday-monday = Monday
wizard-weekday-tuesday = Tuesday
wizard-weekday-wednesday = Wednesday
wizard-weekday-thursday = Thursday
wizard-weekday-friday = Friday
wizard-weekday-saturday = Saturday

# Payment screen (initiate_expense_plan.create_expense_plan / create_expense_request.add_request_trip_details / create_expense_item)
process-error-data-fetch = Error fetching data
payment-method-direct-deposit = Direct Deposit
payment-method-cash-payment = Cash Payment
payment-valid-number = Please enter a valid number
payment-method-select-error = Please Select a Payment Method
payment-advance-custom-rule = Advance Payment amount can't be greater than Estimated Expenses and Allowances amount and they need to have the same currency
payment-amount-label = Amount
payment-amount-custom-rule = Please enter the amount
payment-currency-label = Currency
payment-currency-custom-rule = Please select a currency
payment-currency-placeholder = Select Currency
payment-method-label = Payment Method
payment-method-placeholder = Select Method
payment-estimated-expenses-label = Estimated Expenses
payment-allowances-label = Allowances
payment-advance-payment-label = Advance Payment

# Summary screen (expense_summary_request / add_items_to_plan / add_allowance_info_request / approve_expense_request)
summary-no-code = No code
summary-plan-creation = Plan Creation:
summary-no-start-date = No start date
summary-no-creation-date = No creation date
summary-no-end-date = No end date
summary-allowances-section = Allowances
summary-no-allowances = No allowances created
summary-expense-items-section = Estimated Expense Items
summary-no-estimated-items = No Estimated Expense Items Added
summary-non-reimbursable-amount = Not Reimbursable Amount
summary-reimbursable-amount = Reimbursable Amount
