# Mapping Review Step Translations (English - US)

# Step Header
mapping-review-step-title = Step 2: Review column matches

# Buttons
start-over-button = Start over
convert-button = Continue with { $count } { $entityType }
convert-button-no-count = Continue with { $entityType }
converting-button = Preparing your data...

# Summary Section
ai-detected-summary = We found { $sourceCount } columns in your file and matched { $mappedCount } of them.
unmapped-fields-warning = { $count } columns still need a match

# Section Titles
mapped-fields-title = Matched columns
unmapped-fields-title = Unmatched columns ({ $count })
relationship-columns-title = Relationship columns
relationship-hint-company-columns = Include a company name column plus "Owned By" and/or "Owns" columns. Separate multiple company names with semicolons.
relationship-hint-percentages = Percentages like "Beta Holdings (50%)" are supported in ownership columns.
relationship-hint-owner-vs-owned-by = Note: "Owner" (or "Owner Employee") is the responsible Employee at our firm and resolves to a person. "Owned By" is the parent company that owns this entity and resolves to an Investment Company — put company names there, not people.
relationship-hint-executives = "Executives" lists person names (separate multiple with semicolons). Each name is matched against Employees first, then Investment Contacts; unmatched names are skipped.
relationship-hint-executive-type = "Executive Type" applies a single role (e.g. CEO, CFO) to every executive in the row; it must match an entry in the `LegalEntityExecutiveType` catalog.
relationship-hint-stakeholders = "Stakeholders" lists `Name, Type` entries separated by semicolons (e.g. `Mike, Audit; Anna, Legal`). Each name is matched against Investment Contacts, then Investment Accounts; if neither matches, the row is kept as an external stakeholder.

# Field Labels
source-field-label = Your column
target-field-label = Matches to
type-label = Type
select-field-placeholder = Select a field
search-field-placeholder = Search fields...
no-fields-found = No fields found

# Type Values
type-catalog = Catalog
type-direct = Direct

# Unmapped Section
click-to-add-hint = Click a column to add a match

# Error State
no-analysis-data = No file has been analyzed yet. Upload a file and analyze it first.
