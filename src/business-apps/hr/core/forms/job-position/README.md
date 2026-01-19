# Job Position Form

This form component has been **redesigned to match the Employee Form design patterns** using gravity-ui-catalog components and follows the same styling conventions and layout structure.

## New Form Structure

### Mandatory Fields (in order):

1. **Department** - Searchable dropdown (disabled in edit mode)
2. **Job Family** - Searchable dropdown
3. **Job Function** - Searchable dropdown (dependent on job family)
4. **Position Name** - Text input field

### Optional Field:

5. **Job Profile** - Searchable by both job profile name and code with live search

## Design System & Components

### ✅ **Component Library**

- **Uses**: `@newwork/gravity-ui-catalog` (matches Employee Form)
- **Components**: `Button`, `Select`, `Input` with consistent props and styling
- **Layout**: Uses same `gba:` prefixed Tailwind classes as Employee Form

### ✅ **Design Patterns (Matches Employee Form)**

- **Container**: `gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6`
- **Form Layout**: `gba:h-full gba:flex gba:flex-col`
- **Content Area**: `gba:flex-1 gba:overflow-y-auto gba:space-y-6`
- **Section Headers**: `gba:text-lg gba:font-semibold gba:text-gray-900 gba:border-b gba:border-gray-200 gba:pb-2`
- **Field Labels**: `gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1`
- **Button Area**: `gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3`

## Key Features

### ✅ **Simplified Field Structure**

- **Removed**: Job Level, Employment Type, Contract Type (not shown in form)
- **Focused**: Only essential job position fields
- **Auto-selection**: Job Level Group auto-selected from Job Function (backend handled)

### ✅ **Enhanced Job Profile Search**

- **Smart search trigger**: Only searches after 3+ characters entered (performance optimization)
- **Rich display**: Shows both job profile name and code in format "Name (Code)"
- **Dual search**: Searches both job profile name AND code fields in backend
- **Debounced search**: 300ms delay to prevent excessive API calls
- **Pagination**: "Load More" functionality for large datasets
- **Optional**: Job Profile is completely optional

### 🔍 **Search Matching Logic Explained**

#### **Frontend Search Trigger:**

1. User types in job profile dropdown
2. Search only triggers when:
   - **3+ characters entered** (e.g., "sen", "dev", "mg1")
   - **OR search is cleared** (empty string)
3. Less than 3 characters = no search (prevents excessive API calls)

#### **Backend Search Logic (GraphQL):**

```graphql
_or: [
  { name: { _ilike: "%searchTerm%" } },
  { code: { _ilike: "%searchTerm%" } }
]
```

#### **Search Examples:**

- **"sen"** → Finds "Senior Developer" AND job profiles with code "SEN001"
- **"dev"** → Finds "Developer", "Development Manager" AND codes like "DEV001"
- **"mg"** → Finds "Manager" roles AND codes like "MG001", "PMG002"
- **""** (empty) → Shows all job profiles (initial load)

#### **Display Format:**

- **With code**: "Senior Developer (SD001)"
- **Without code**: "Senior Developer"

### ✅ **Improved User Experience**

- **Clean design**: Matches Employee Form visual patterns
- **Consistent spacing**: Uses design system spacing tokens
- **Clear validation**: Asterisks (\*) for required fields
- **Smart dependencies**: Job Function disabled and filtered by selected Job Family
- **Auto-loading**: Job functions automatically load when Job Family changes
- **Loading feedback**: Visual indicators during data fetching
- **Helpful messages**: Guidance text for disabled fields

### ✅ **Enhanced Navigation**

- **Cancel button**: Secondary button to exit form
- **Create/Update button**: Primary action with loading states
- **Consistent layout**: Buttons fixed at bottom, matching Employee Form

## Form Validation

### **Required Fields:**

- Department
- Job Family
- Job Function
- Position Name

### **Optional Fields:**

- Job Profile (searchable by name and code)

## Smart Behavior

### **Dependency Chain:**

1. **Job Family** → enables **Job Function** dropdown
2. **Job Function** → auto-selects **Job Level Group** (hidden)
3. **Job Profile** → completely independent, optional search

### **Edit Mode Differences:**

- **Department**: Disabled in edit mode
- **Other fields**: Fully editable
- **Button text**: Changes to "Update Job Position"

## Component Usage

```tsx
import { JobPosition } from '@/business-apps/hr/core/forms/job-position';

// Create new job position
<JobPosition accessToken={accessToken} />

// Edit existing job position
<JobPosition
  accessToken={accessToken}
  initialValues={{
    id: 'jp-123',
    name: 'Senior Developer',
    organizationalUnitId: 'org-456',
    jobFamilyId: 'jf-789',
    jobFunctionId: 'func-101',
    jobProfileId: 'prof-112' // optional
  }}
  isEdit={true}
/>
```

## Technical Implementation

### **Enhanced Dependencies:**

- **Context-Level Dependency**: `useEffect` in context watches `formValues.jobFamilyId` changes
- **Automatic Filtering**: Job functions filtered by `jobFamily: { id: { _eq: $jobFamilyId } }` in GraphQL
- **Form-Level Validation**: Job Function field disabled when no Job Family selected
- **Loading States**: Specific `jobFunctionsLoading` state for better UX

### **Data Flow:**

1. Form loads with departments and job families
2. **Job family selection automatically triggers job function loading** (only shows functions for selected family)
3. Job function selection auto-selects job level group (hidden from UI)
4. Job profile search operates independently with smart search (3+ characters)
5. Form validates required fields before enabling submit

### **Component Structure:**

- `JobPosition`: Main wrapper with context provider (matches Employee pattern)
- `JobPositionForm`: Form component (matches EmployeeForm design)
- `JobPositionProvider`: Context for state management
- `useJobPositionContext`: Hook for accessing form state

### **Styling Approach:**

- **Consistent with Employee Form**: Same classes, same patterns, same component usage
- **Design System**: Uses gravity-ui-catalog components exclusively
- **Responsive**: Mobile-first design with `max-w-md` constraint
- **Accessibility**: Proper labels, validation messages, and keyboard navigation
