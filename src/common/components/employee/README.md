# Employee Hover Card Component

A modern, user-friendly hover card that displays employee information when hovering over an employee's name.

## Features

✨ **Clean Design**

- Horizontal layout with avatar and info side-by-side
- Online status indicator (green dot)
- Smooth hover animations
- Compact card layout optimized for readability

🎨 **Design System Compliant**

- Uses `@newwork/nw-design-system` components
- All colors use design tokens (`gba:` prefix)
- Consistent with platform styling

📱 **Interactive Elements**

- Clickable email (opens mailto:)
- Clickable phone (opens tel:)
- View Profile button (navigates to employee record)
- Hover effects on all interactive elements

## Usage

### Basic Usage

```tsx
import { EmployeeHoverCard } from '@/common/components/employee'

;<EmployeeHoverCard employee={employeeObject}>
  <span className="gba:cursor-pointer hover:gba:underline hover:gba:text-primary">{employeeObject.displayName}</span>
</EmployeeHoverCard>
```

### In Comment Section

```tsx
import { EmployeeHoverCard } from '@/common/components/employee'

// In CommentItem.tsx
{
  comment.creatorEmployee ? (
    <EmployeeHoverCard employee={comment.creatorEmployee}>
      <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:cursor-pointer hover:gba:text-primary hover:gba:underline">
        {comment.creatorDisplayName}
      </span>
    </EmployeeHoverCard>
  ) : (
    <span>{comment.creatorDisplayName}</span>
  )
}
```

### In Question View

```tsx
{
  question.creatorEmployee ? (
    <EmployeeHoverCard employee={question.creatorEmployee}>
      <span className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline">
        {question.authorFullName || 'Unknown'}
      </span>
    </EmployeeHoverCard>
  ) : (
    <span>{question.authorFullName || 'Unknown'}</span>
  )
}
```

## Props

| Prop       | Type          | Required | Description                             |
| ---------- | ------------- | -------- | --------------------------------------- |
| `employee` | `EmployeeRef` | ✅       | Employee data object (from GraphQL)     |
| `children` | `ReactNode`   | ✅       | Trigger element (usually employee name) |

### EmployeeRef Structure

The component automatically extracts the following data from the `EmployeeRef` object:

```typescript
interface EmployeeRef {
  id: string // Employee ID
  displayName?: string // Display name
  fullName?: string // Full name (fallback)
  pictureThumbnail?: string // Base64 profile picture

  // Job information (optional)
  employeePosition?: {
    jobPosition?: { name?: string } // Job title
    organizationalUnit?: { name?: string } // Business unit
  }

  // Contact information (optional)
  communication?: Array<{
    purpose?: string // "INTERNAL" for work contacts
    channel?: { code?: string; value?: string }
    value?: string // Actual email/phone value
    type?: { value?: string } // e.g., "Primary"
  }>
}
```

The component will:

- Show **job position** and **organizational unit** if available in `employeePosition`
- Extract **work email** from `communication` array (channel.value: `'Email'`, purpose: `'INTERNAL'`)
- Extract **work phone** from `communication` array (channel.value: `'Phone'` or `'Mobile'`, purpose: `'INTERNAL'`)
- Gracefully hide sections if data is not available

## Data Structure Notes

✅ **The `EMPLOYEE_REF_FRAGMENT` has been extended** to include all necessary fields:

- Job position and organizational unit via `employeePosition`
- Email and phone via `communication` (filtered for internal/work contacts)

All content queries using `EMPLOYEE_REF_FRAGMENT` will now fetch this additional data automatically.

## Design Features

### Visual Hierarchy

1. **Avatar**: Left-aligned with ring border and online status indicator
2. **Header Section**: Name, job position, and organizational unit displayed inline
3. **Status**: Green dot indicator (bottom-right of avatar)
4. **Contact Section**: Email and phone with icons (only shown if available)
5. **Actions**: Clickable email/phone with hover states
6. **CTA**: View Profile button at bottom

### Hover Behavior

- **Delay**: 300ms before opening (prevents accidental triggers)
- **Close Delay**: 100ms (allows moving mouse to card)
- **Alignment**: Starts aligned with trigger element
- **Offset**: 5px from trigger

### Interactions

- **Email**: Opens default email client
- **Phone**: Initiates phone call
- **Profile Button**: Navigates to employee record page

## Accessibility

- Uses semantic HTML elements
- Proper ARIA labels via HoverCard component
- Keyboard navigation support (via design system)
- Focus indicators on interactive elements

## Performance

- No data fetching (uses existing data)
- Lazy rendering (only renders when hovering)
- Optimized with proper React patterns

## Styling

All styles use the design system:

- ✅ `gba:` prefix for Tailwind utilities
- ✅ Design tokens for colors
- ✅ Consistent spacing
- ✅ No hardcoded values
