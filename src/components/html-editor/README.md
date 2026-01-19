# HTML Editor Component

A WYSIWYG HTML editor with pre-built design-system components and drag-and-drop for creating HTML templates.

## Features

- **Pre-built Design-System Components**: Heading, Paragraph, Card, List, Button, Image, Divider, Spacer
- **Drag & Drop**: Reorder elements via drag-and-drop
- **Structured Configuration**: Each element has specific configuration fields
- **Code View**: Direct editing of generated HTML code
- **Live Preview**: Real-time preview of rendered HTML
- **Template Variables**: Variables can be inserted into text (e.g., `{{investmentName}}`)
- **Design-System Compliant**: All generated HTML tags use correct Tailwind classes with `gba:` prefix

## Available Element Types

### 1. Heading

Headings in 6 sizes (H1-H6) with design-system styling.

**Configuration:**

- Level: H1 (largest) to H6 (smallest)
- Text: The heading text

**Generated HTML:**

```html
<h1 class="gba:text-4xl gba:font-bold gba:text-foreground gba:mb-4">Ihr Text</h1>
```

### 2. Paragraph / Text

Text paragraphs with configurable alignment, weight, and size.

**Configuration:**

- Alignment: left, center, right
- Weight: normal, medium, semibold, bold
- Size: xs, sm, base, lg, xl, 2xl
- Text: The paragraph text

**Generated HTML:**

```html
<p class="gba:text-foreground gba:mb-2 gba:text-left gba:font-normal">Ihr Text</p>
```

### 3. Card

Container element with border or shadow.

**Configuration:**

- Variant: default, outlined, elevated
- Padding: sm, md, lg
- Content: Any content (can also contain variables)

**Generated HTML:**

```html
<div class="gba:rounded-lg gba:bg-card gba:text-card-foreground gba:border gba:border-input gba:p-4 gba:mb-4">
  Ihr Content
</div>
```

### 4. List

Bulleted or numbered lists.

**Configuration:**

- List Type: ul (Bullets) or ol (Numbered)
- Items: Add/remove any number of list entries

**Generated HTML:**

```html
<ul class="gba:list-disc gba:pl-6 gba:mb-4 gba:text-foreground">
  <li class="gba:mb-1">Item 1</li>
  <li class="gba:mb-1">Item 2</li>
</ul>
```

### 5. Button

Clickable button links with various styles.

**Configuration:**

- Button Text: The text on the button
- Variant: default, outline, ghost
- Size: sm, md, lg
- Link URL: Target URL of the link

**Generated HTML:**

```html
<a
  href="#"
  class="gba:inline-flex gba:items-center gba:justify-center gba:rounded-md gba:font-medium gba:transition-colors gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 gba:px-4 gba:py-2 gba:text-base gba:mb-4"
>
  Click Here
</a>
```

### 6. Image

Images with configurable width.

**Configuration:**

- Image URL: Path to the image
- Alt Text: Alternative text
- Width: 100%, 75%, 50%, 25%

**Generated HTML:**

```html
<img src="..." alt="..." class="gba:rounded-md gba:mb-4" style="width: 100%; height: auto;" />
```

### 7. Divider

Horizontal separator line.

**No configuration required**

**Generated HTML:**

```html
<hr class="gba:border-t gba:border-input gba:my-6" />
```

### 8. Spacer

Empty space between elements.

**Configuration:**

- Height: sm, md, lg, xl

**Generated HTML:**

```html
<div class="gba:h-8"></div>
```

## Usage

```typescript
import { HtmlEditor, TemplateVariable } from '@/components/html-editor';

const investmentVariables: TemplateVariable[] = [
  {
    key: 'investmentName',
    label: 'Investment Name',
    description: 'Name of the investment',
    example: 'Tech Growth Fund'
  },
  {
    key: 'amount',
    label: 'Amount',
    description: 'Investment amount',
    example: '€1,000,000'
  }
];

const MyTemplateEditor = () => {
  const [htmlContent, setHtmlContent] = useState('<h1>My Template</h1>');

  return (
    <HtmlEditor
      value={htmlContent}
      onChange={setHtmlContent}
      showVariableHelper
      availableVariables={investmentVariables}
      minHeight="500px"
      maxHeight="1000px"
      placeholder="Create your document template..."
    />
  );
};
```

## Workflow

### 1. Visual Editor (Standard)

1. Click on **"Add Element"**
2. Select element type (e.g., "Heading")
3. Configure element properties (e.g., Level: H1, Text: "Investment Summary")
4. Save → Element appears in the list
5. **Drag & Drop**: Drag the ⋮⋮ icon to change order
6. **Edit**: Click the ✏️ icon to edit the element
7. **Delete**: Click the 🗑️ icon to delete the element

### 2. Code Editor

- Switch to the "Code" tab
- View the generated HTML code
- Edit HTML directly (if needed)
- Switch back to "Visual" → Changes will be parsed

### 3. Preview

- Switch to the "Preview" tab
- See how the final HTML looks in the browser

### 4. Insert Variables

- In the right panel: Click "+" next to a variable
- Variable is inserted as a text element
- In the generated HTML appears: `{{variableName}}`

## Props

```typescript
interface TemplateVariable {
  key: string // Unique identifier for the variable (used in {{variableName}} syntax)
  label: string // Display name shown in the variable panel
  description: string // Helpful description of what the variable represents
  example: string // Example value to help users understand the variable
}

interface HtmlEditorProps {
  value: string // HTML content
  onChange: (html: string) => void // Callback when content changes
  disabled?: boolean // Disable editing
  showVariableHelper?: boolean // Show variable panel
  availableVariables?: TemplateVariable[] // Available template variables
  minHeight?: string // Minimum height (default: '300px')
  maxHeight?: string // Maximum height (default: '800px')
  placeholder?: string // Placeholder text
  prefixDataTestId?: string // Test ID prefix
}
```

## Design-System Integration

All generated HTML tags use:

- **Tailwind Classes** with `gba:` prefix
- **Design Tokens**: `gba:bg-primary`, `gba:text-foreground`, etc.
- **Responsive Spacing**: `gba:mb-4`, `gba:p-6`, etc.
- **Consistent Colors**: Uses Foreground/Background tokens

This means: The generated HTML code is directly compatible with the NEWWORK Design-System!

## Example Template

```html
<h1 class="gba:text-4xl gba:font-bold gba:text-foreground gba:mb-4">Investment Summary</h1>
<p class="gba:text-foreground gba:mb-2 gba:text-left gba:font-semibold gba:text-sm">{{investmentName}}</p>
<div class="gba:rounded-lg gba:bg-card gba:text-card-foreground gba:border gba:border-input gba:p-4 gba:mb-4">
  <p class="gba:text-foreground">Investment Amount: {{amount}}</p>
  <p class="gba:text-foreground">Investment Type: {{investmentType}}</p>
</div>
<hr class="gba:border-t gba:border-input gba:my-6" />
<a
  href="#"
  class="gba:inline-flex gba:items-center gba:justify-center gba:rounded-md gba:font-medium gba:transition-colors gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 gba:px-4 gba:py-2 gba:text-base gba:mb-4"
  >View Details</a
>
```
