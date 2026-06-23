# Conversion Result Step Translations (English - US)

# Step Header
conversion-result-step-title = Step 3: Review and import

# Action Buttons
download-json-button = Download data file
start-over-button = Start over
import-more-button = Import more
done-button = Done
continue-ownership-button = Continue to ownership
skip-ownership-button = Skip ownership

# Success Messages
import-success-title = Import in progress
import-success-message = Your { $count } { $entityType } are being imported in the background.
import-success-email-hint = We'll email you when the import is complete.
conversion-success-message = { $count } { $entityType } are ready to import

# Campaign
campaign-label = Campaign: { $name }

# Preview Section
preview-title = Preview (first { $count } { $entityType })
preview-more-text = ... and { $count } more { $entityType }

# Preview Badges
industry-badge = Industry
size-badge = Size

# Extraction Warnings Section
extraction-warnings-title = Import warnings

# Ownership Summary Section
ownership-summary-title = Ownership relationships
ownership-summary-description = { $count } ownership relationship(s) detected. { $unresolvedCount } relationship(s) still need a resolved company id.
ownership-summary-unknown-company = Unknown company
ownership-summary-owned-by = Owned by: { $names }
ownership-summary-owns = Owns: { $names }
ownership-summary-more = ... and { $count } more company row(s) with ownership relationships
ownership-company-unresolved-suffix =  (Unresolved)

# Executive Summary Section
executive-summary-title = Company executives
executive-summary-description = { $count } executive(s) detected. { $resolvedCount } resolved, { $unresolvedCount } unresolved.
executive-summary-unknown-company = Unknown company
executive-summary-executives = Executives: { $names }
executive-summary-executives-label = Executives:
executive-summary-type = Type: { $type }
executive-summary-more = ... and { $count } more company row(s) with executives
executive-source-employee-suffix = (Employee)
executive-source-contact-suffix = (Contact)
executive-source-unresolved-suffix = (Unresolved)
executive-source-unresolved-tooltip = No matching Employee or Investment Contact was found in the system, so this executive will not be imported.

# Stakeholder Summary Section
stakeholder-summary-title = Company stakeholders
stakeholder-summary-description = { $count } stakeholder(s) detected. { $contactCount } as Investment Contact, { $accountCount } as Investment Account, { $externalCount } external.
stakeholder-summary-unknown-company = Unknown company
stakeholder-summary-stakeholders = Stakeholders: { $names }
stakeholder-summary-more = ... and { $count } more company row(s) with stakeholders
stakeholder-source-contact-suffix = (Investment Contact)
stakeholder-source-account-suffix = (Investment Account)
stakeholder-source-external-suffix = (External)

# Data Quality Section
data-quality-warnings-title = Data quality warnings
show-less-button = Show less
more-warnings-text = ... and { $count } more warnings
all-fields-good-message = Everything looks good—you're ready to import!

# Import Button
import-button = Import { $count } { $entityType }
importing-button = Importing...

# CSV Quality
csv-quality-warning-title = Column alignment issue detected
csv-quality-warning-message = { $shiftedRows } of { $totalRows } rows may have misaligned columns. You can try to fix them automatically—some values may change.
csv-quality-repair-button = Try to fix and extract data
csv-quality-repairing-button = Fixing...
csv-quality-residual-message = { $shiftedRows } row(s) could not be fully fixed. These rows may have missing or shifted values.
csv-quality-success-message = All rows were fixed successfully.
