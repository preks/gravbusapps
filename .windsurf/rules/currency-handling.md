---
description: Always use when currencies are required
alwaysApply: false
---

# Currency Handling Pattern

When working with financial data and currency formatting:

**Problem**: APIs return currency in format `Currency:v1:EUR`
**Solution**: Extract actual currency code for `Intl.NumberFormat`

## Currency Code Extraction

```typescript
const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR'
}
```

## Currency Formatting

```typescript
const formatCurrency = (amount: number, currencyId: string): string => {
  const currency = extractCurrencyCode(currencyId)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
```

## Table Column Usage

```typescript
{
  title: 'Amount',
  render: (amount: number, record: Entity) => {
    const currency = extractCurrencyCode(record.currencyId);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}
```

@src/business-apps/mdm/apps/compensation-data/components/tabs/PayGradesTab.tsx
