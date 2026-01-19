# Template Data Page

## Overview

The Template Data page allows users to create and manage HTML document templates for investment-related documents. These templates can be used to generate standardized reports, summaries, and other documents.

## Features

### Template Management

- **Create Templates**: Define new document templates with custom HTML content
- **Edit Templates**: Modify existing templates
- **Delete Templates**: Remove unused templates
- **Preview Templates**: View rendered HTML in a modal dialog
- **Activate/Deactivate**: Control which templates are active

### HTML Editor

- **Visual Tab**: Drag-and-drop element editor for building templates visually
- **Code Tab**: Edit raw HTML with formatting toolbar
- **Preview Tab**: See rendered HTML output in real-time
- **Element Types**: Headings, paragraphs, lists, tables, dividers, variables
- **Drag & Drop**: Reorder elements by dragging
- **Template Variables**: Use placeholders like `{{investmentName}}` for dynamic content
- **Variable Panel**: Browse and insert available variables with descriptions

## Catalog Structure

### Catalog: `InvestmentDocumentTemplate`

Version: `v1`

**Entry Structure:**

```typescript
{
  code: string;              // Unique identifier (e.g., 'INVESTMENT_SUMMARY')
  value: string;             // Display name
  alternativeCode?: string;  // Optional alternative identifier
  displayOrder?: number;     // Sort order
  additionalValue1: string;  // Description field
  objectValue: {
    htmlContent: string;     // The actual HTML template
    isActive: boolean;       // Active status
  }
}
```

## Mock Templates

Two sample templates are defined in the code:

### 1. Investment Summary Template

```html
<h1>Investment Summary</h1>
<p><strong>Investment Name:</strong> {{investmentName}}</p>
<p><strong>Type:</strong> {{investmentType}}</p>
<p><strong>Amount:</strong> {{amount}}</p>
<hr />
<h2>Details</h2>
<p>{{details}}</p>
```

### 2. Performance Report Template

```html
<h1>Performance Report</h1>
<p><strong>Quarter:</strong> {{quarter}}</p>
<p><strong>Year:</strong> {{year}}</p>
<h2>Key Metrics</h2>
<ul>
  <li>ROI: {{roi}}%</li>
  <li>Growth: {{growth}}%</li>
  <li>Risk Level: {{riskLevel}}</li>
</ul>
```

## Components

### TemplateDataPage

Main page component that orchestrates the template management flow.

### TemplateList

Displays all templates in a card grid with actions (edit, delete, preview).

### TemplateForm

Form for creating and editing templates with validation.

### HtmlEditor

Advanced drag-and-drop HTML editor from `@/components/html-editor` with visual, code, and preview modes.

### TemplatePreviewModal

Modal dialog for previewing rendered HTML templates.

## Available Template Variables

The editor includes 10 pre-defined investment variables:

- `{{investmentName}}` - Name of the investment
- `{{investmentType}}` - Type/category of investment
- `{{investmentGroup}}` - Group classification
- `{{amount}}` - Investment amount
- `{{currency}}` - Currency code
- `{{date}}` - Investment date
- `{{investor}}` - Investor name
- `{{status}}` - Investment status
- `{{roi}}` - Return on investment percentage
- `{{maturityDate}}` - Investment maturity date

## Future Enhancements

### Editor Enhancement

Upgrade to a professional WYSIWYG library:

- **react-quill**: Lightweight and easy to integrate
- **TinyMCE**: Feature-rich with extensive customization
- **CKEditor**: Professional-grade editor

### Template Variables System

- Variable auto-completion
- Variable validation
- Variable documentation/hints
- Data binding preview

### Template Categories

- Organize templates by type (Reports, Summaries, Notices)
- Filter and search by category

### Version History

- Track template changes over time
- Compare versions
- Restore previous versions

### Template Export/Import

- Export templates as JSON
- Import templates from other systems
- Share templates between environments

## Usage

1. Navigate to Investment Settings
2. Click on "Document Templates" card
3. Click "Create Template" to add a new template
4. Fill in the template details:
   - Code (unique identifier)
   - Name (display name)
   - Description (optional)
   - Display Order (for sorting)
   - Active status
   - HTML Content (using the editor)
5. Switch between Code and Preview tabs to verify the template
6. Save the template

## Integration

The template data page is integrated into the Investment Settings app:

```typescript
// InvestmentSettings.tsx
import TemplateDataPage from './pages/template-data/TemplateDataPage';

if (inlinePage?.key === 'template-data') {
  return (
    <TemplateDataPage
      {...context}
      prefixDataTestId={`${prefixDataTestId || ''}-InvestmentTemplateSettings`}
      onBack={() => handleInlinePageChange(null)}
    />
  );
}
```

## Testing

All components include `data-testid` attributes for E2E testing:

```typescript
// Example test IDs
'template-data-page'
'template-data-page-create-button'
'template-list-item-INVESTMENT_SUMMARY'
'template-form-code-input'
'html-editor-code-tab'
'html-editor-preview-tab'
```
