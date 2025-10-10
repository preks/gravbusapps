---
alwaysApply: true
---

# Data-TestID Implementation Guidelines for AI Agents

## Core Principle

EVERY interactive, meaningful, or testable element in React components MUST have a data-testid attribute for reliable automated testing and debugging.

## Required Elements for data-testid

### Always Include

- **Buttons**: All button elements (`<button>`, `<Button>`, etc.)
- **Input Fields**: Text inputs, selects, checkboxes, radio buttons, textareas
- **Links**: Navigation links and actionable text
- **Tables**: Table containers, rows, cells with dynamic content
- **Forms**: Form containers and fieldsets
- **Modals/Dialogs**: Modal containers and their action buttons
- **Lists**: List containers and list items with actions
- **Containers**: Main content areas, sections, and logical groupings
- **State Elements**: Loading spinners, error alerts, empty states, success messages

## Naming Convention Rules

### Structure Pattern

```
{prefix}-{component}-{element}-{identifier?}
```

### Component Type Suffixes

- **Buttons**: `-button`, `-btn`
- **Inputs**: `-input`, `-field`, `-select`
- **Tables**: `-table`, `-row`, `-cell`
- **Containers**: `-container`, `-wrapper`, `-section`
- **Lists**: `-list`, `-item`
- **Modals**: `-modal`, `-dialog`
- **Forms**: `-form`, `-fieldset`

### Examples of Good Naming

```typescript
// Buttons and Inputs
data-testid="lead-list-add-button"
data-testid="expense-form-amount-input"
data-testid="lead-filter-status-select"

// Tables
data-testid="opportunities-table"
data-testid="opportunities-table-row-456"
data-testid="opportunities-table-stage-cell-456"

// Containers and Lists
data-testid="personal-expenses-container"
data-testid="contact-list-item-789"
data-testid="lead-creation-modal"
```

## Component Patterns

### Table Components

```typescript
<Table data-testid="leads-table">
  <tr data-testid={`leads-table-row-${record.id}`}>
    <td data-testid={`leads-table-name-cell-${record.id}`}>
    <AppActionButton data-testid={`leads-update-button-${record.id}`} />
  </tr>
</Table>
```

### Form Components

```typescript
<Form data-testid="expense-creation-form">
  <FormItem data-testid="expense-form-title-field">
    <Input data-testid="expense-form-title-input" />
  </FormItem>
  <Button data-testid="expense-form-submit-button">Submit</Button>
</Form>
```

### List Components

```typescript
<div data-testid="investment-list-container">
  {investments.map(investment => (
    <div data-testid={`investment-list-item-${investment.id}`}>
      <h3 data-testid={`investment-title-${investment.id}`}>{investment.name}</h3>
      <Button data-testid={`investment-view-button-${investment.id}`}>View</Button>
    </div>
  ))}
</div>
```

### Modal Components

```typescript
<Modal data-testid="lead-conversion-modal">
  <div data-testid="lead-conversion-modal-content">
    <h2 data-testid="lead-conversion-modal-title">Convert Lead</h2>
    <Form data-testid="lead-conversion-form">...</Form>
    <div data-testid="lead-conversion-modal-actions">
      <Button data-testid="lead-conversion-cancel-button">Cancel</Button>
      <Button data-testid="lead-conversion-confirm-button">Convert</Button>
    </div>
  </div>
</Modal>
```

## State-Based TestIDs

```typescript
// Loading States
{isLoading ? (
  <Spin data-testid="opportunities-loading-spinner" />
) : (
  <Table data-testid="opportunities-table" />
)}

// Error States
{error && (
  <Alert data-testid="expense-list-error-alert" message={error} type="error" />
)}

// Empty States
{data.length === 0 && (
  <div data-testid="contacts-empty-state">
    <p data-testid="contacts-empty-message">No contacts found</p>
    <Button data-testid="contacts-create-first-button">Create First Contact</Button>
  </div>
)}
```

## Dynamic Content Guidelines

### Use IDs for Uniqueness

- Always append record IDs for dynamic list items: `data-testid={`item-${record.id}`}`
- Use meaningful identifiers for generated content
- Avoid array indices unless items are truly static

### Conditional Elements

```typescript
// ✅ Good: Specific testids for each state
{isEditing ? (
  <Input data-testid="lead-name-edit-input" />
) : (
  <span data-testid="lead-name-display-text">{name}</span>
)}
```

## Search and Filter Elements

```typescript
<DebouncedInput
  data-testid="lead-list-search-input"
  placeholder="Search leads..."
/>

<Select
  data-testid="lead-list-status-filter"
  placeholder="Filter by status"
/>

<Button data-testid="lead-list-clear-filters-button">
  Clear Filters
</Button>
```

## Anti-Patterns to Avoid

```typescript
// ❌ Bad Practices
data-testid="button"                    // Too generic
data-testid={`item-${index}`}           // Using array indices
<Button onClick={handleClick}>Submit</Button>  // Missing testid
data-testid="leadsList"                 // Inconsistent casing
data-testid="personal-expenses-application-main-container-expense-list-table-row-item-edit-button"  // Too verbose

// ✅ Good Practices
data-testid="expense-list-add-button"   // Specific and descriptive
data-testid={`expense-item-${expense.id}`}  // Meaningful identifiers
data-testid="lead-conversion-modal"     // Consistent kebab-case
data-testid="expense-edit-button"       // Appropriate length
```

## Implementation Checklist for AI Agents

### Before Implementation

1. [ ] Identify all interactive elements
2. [ ] Plan testid naming convention for component
3. [ ] Consider dynamic content patterns
4. [ ] Plan for different states (loading, error, empty)

### During Implementation

1. [ ] Add testid to component container
2. [ ] Add testids to all buttons and links
3. [ ] Add testids to all form inputs
4. [ ] Add testids to table rows and important cells
5. [ ] Add testids to modal/dialog elements
6. [ ] Include unique identifiers for dynamic content

### After Implementation

1. [ ] Verify all interactive elements have testids
2. [ ] Check naming consistency
3. [ ] Ensure dynamic content has unique identifiers
4. [ ] Validate testid hierarchy makes sense

## Special Cases

### AppActionButton Integration

```typescript
<AppActionButton
  data-testid={`${entityType}-update-button-${record.id}`}
  prefixDataTestId={`${entityType}-update`}
/>
```

### Complex Components (300+ lines)

Plan testids before splitting:

```typescript
// Main component
data-testid="expense-management-app"

// Sub-components after splitting
data-testid="expense-statistics-section"
data-testid="expense-filters-section"
data-testid="expense-table-section"
```

## Key Principles

- **Consistency**: Use the same patterns across the application
- **Specificity**: Generic testids are harder to maintain
- **Testability**: Think like a tester - what needs to be interacted with?
- **Maintainability**: Use patterns that scale with the application
