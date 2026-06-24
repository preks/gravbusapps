# Investment Company import — sample data

`investment-company-sample.csv` is a manual-verification fixture for the
**Import Investment Companies** card on the IRM Data Import page (AIML-942).

## Columns

| Column                           | Required | Maps to (frontend target)                         | Notes                                                                                                                                                                                                                                         |
| -------------------------------- | -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Name`                           | yes      | `investmentCompany.name`                          |                                                                                                                                                                                                                                               |
| `Description`                    | no       | `investmentCompany.description`                   |                                                                                                                                                                                                                                               |
| `Commercial Registration Number` | no       | `investmentCompany.commercialRegistrationNumber`  |                                                                                                                                                                                                                                               |
| `Currency`                       | no       | `investmentCompany.currencyRef`                   | Catalog ref against `Currency`.                                                                                                                                                                                                               |
| `Owner`                          | no       | `investmentCompany.ownerEmployeeId`               | **Person name** of the Employee at our firm responsible for this company. Resolved against `Employee.displayName`. If no match, falls back to the current importer's employee id. **Do not put company names here** — use `Owned By` instead. |
| `Owned By`                       | no       | `investmentCompanyOwnership` (ownerCompanyIds)    | **Parent company** name. `Name (pct%)` entries; multi-value via `;` / `\n`. Resolved against `InvestmentCompany.name`.                                                                                                                        |
| `Owns`                           | no       | `investmentCompanyOwnership` (ownedCompanyIds)    | Same format as `Owned By`.                                                                                                                                                                                                                    |
| `Executives`                     | no       | `investmentCompany.investmentCompanyExecutives`   | Multi-value via `;`. Each entry is a person name resolved as `Employee` -> `InvestmentContact`; no match drops the entry from the payload but it still appears in the conversion summary with a "will not be imported" tooltip.               |
| `Executive Type`                 | no       | `investmentCompanyExecutive.executiveTypeRef`     | Applies to every executive in the row; resolved against `LegalEntityExecutiveType`.                                                                                                                                                           |
| `Stakeholders`                   | no       | `investmentCompany.investmentCompanyStakeholders` | Multi-value via `;`. Per entry: `Name, StakeholderTypeLabel`. Name resolves as `InvestmentContact` -> `InvestmentAccount` -> `external` (string).                                                                                             |

## How to use locally

1. Pick an `InvestmentCompanyGroup` (the import view's required select).
2. Optionally seed:
   - One or two `InvestmentCompany` rows (e.g. `Northwind Capital`, `Acme Ventures`)
     so the `Owned By` / `Owns` lookups resolve.
   - At least one `Employee` whose `displayName` matches an executive name
     (e.g. `John Smith`) **and** at least one whose `displayName` matches the
     `Owner` column value (e.g. `Maria Prangishvili`).
   - At least one `InvestmentContact` (e.g. `Jane Doe`, `Alice Contact`) so the
     contact-side executive and stakeholder paths resolve.
   - One `InvestmentAccount` (e.g. `Acme Bank`) so the account-side stakeholder
     path resolves.
   - The `InvestmentCompanyStakeholderType` catalog should already include
     `Audit`, `Legal`, `Compliance` (any unknown labels produce a warning and
     leave the type ref `null`).
3. Open the IRM Data Import page and click **Start Company Import** on the
   "Import Investment Companies" card, choose your group, and upload this CSV.
4. Confirm the conversion step shows:
   - An ownership summary card for `Alpha Holdings GmbH` and `Gamma Capital
Partners`.
   - An executives summary card with `John Smith (Employee)`, `Jane Doe
(Contact)`.
   - A stakeholders summary card listing `Alice Contact (Investment Contact)`,
     `Acme Bank (Investment Account)`, and any unmatched names as `(External)`.
5. Submit. Companies are created via
   `POST /investment-relations/createInvestmentCompanies` with
   `investmentCompanyExecutives` and `investmentCompanyStakeholders` embedded
   per company. Ownership relationships are then patched in a follow-up
   `updateInvestmentCompanies` call.
