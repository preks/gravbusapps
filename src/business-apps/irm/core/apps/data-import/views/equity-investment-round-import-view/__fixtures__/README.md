# Equity Investment Round import — sample data

`equity-investment-round-sample.csv` is a manual-verification fixture for the
**Import Equity Investment Rounds** card on the IRM Data Import page.

## Columns

| Column                | Required | Maps to (frontend target)                    | Notes                                                                                  |
| --------------------- | -------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Investment`          | yes      | `equityInvestmentRound.equityInvestmentId`   | Existing `Investment.name` scoped to `InvestmentGroup:v1:EQUITY`. Resolved by Flowbot. |
| `Round Name`          | yes      | `equityInvestmentRound.name`                 |                                                                                        |
| `Year`                | yes      | `equityInvestmentRound.year`                 | Accepts a bare year (`2025`) or a full ISO date — the payload builder coerces to ISO.  |
| `Pre-Money Valuation` | yes      | `equityInvestmentRound.preValue`             | Numeric.                                                                               |
| `Investment Volume`   | yes      | `equityInvestmentRound.investmentVolume`     | Numeric.                                                                               |
| `Share Percentage`    | yes      | `equityInvestmentRound.roundSharePercentage` | Numeric (percentage as decimal points, e.g. `15` for 15%).                             |
| `Currency`            | yes      | `equityInvestmentRound.currencyRef`          | Catalog ref against `Currency` (e.g. `EUR`, `USD`).                                    |

## How to use locally

1. Seed your local backend with at least one `EquityInvestment` whose parent
   `Investment.name` matches a value in the `Investment` column above
   (e.g. `Acme Ventures`). The lookup is case-insensitive and ignores
   surrounding whitespace.
2. Open the IRM Data Import page and click **Start Round Import** on the
   "Import Equity Investment Rounds" card.
3. Upload `equity-investment-round-sample.csv`. The mapping step should
   auto-resolve every column (Flowbot's mapping hints prefer the
   `equityInvestmentId` and `equityInvestmentRound.*` candidates for the
   Investment column and the bare scalars for the rest).
4. Confirm and proceed. The preview cards should render the round name,
   year, and amounts; rows whose `Investment` value can't be matched are
   dropped with a single warning per unique name.

## What gets POSTed

The submission strategy wraps each row under
`equityInvestmentRoundRequests[*].equityInvestmentRound`, e.g.

```json
{
  "equityInvestmentRoundRequests": [
    {
      "equityInvestmentRound": {
        "name": "Series A",
        "year": "2024-01-01T00:00:00.000Z",
        "preValue": 8500000,
        "investmentVolume": 1500000,
        "roundSharePercentage": 15,
        "currencyRef": "Currency:v1:EUR",
        "equityInvestment": "<equity-investment-uuid>"
      }
    }
  ]
}
```

The endpoint is `POST /investment-relations/createEquityInvestmentRounds`
(treated as an assumed contract today — see the implementation plan for
follow-up notes).
