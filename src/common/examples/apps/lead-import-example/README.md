# Lead Import Example

AI-powered CSV import with intelligent field mapping for CustomerLead data.

## Features

### 3-Step Workflow

1. **Upload & AI Analysis**
   - Upload CSV file
   - AI agent analyzes headers and creates intelligent field mappings
   - Automatically detects catalog fields (Country, Industry, etc.)

2. **Review & Edit Mappings**
   - View AI-generated mappings
   - Manually adjust any incorrect mappings
   - Select different target fields from dropdown
   - Remove unwanted mappings

3. **Convert & Export**
   - Convert data using edited mappings
   - Automatic catalog lookups via `useCatalogEntries`
   - Download result as JSON
   - Ready for import into CustomerLead system

## Implementation Details

### AI Agent Integration

Uses the `LeadImportConverter` agent to analyze CSV headers:

- Agent returns field mappings with transformation types
- Identifies catalog fields (countryRef, industryRef, etc.)
- Provides catalogIdentifier for each catalog field

### Catalog Lookups

Frontend handles catalog conversion using:

- `useCatalogEntries` hooks for Country, CompanySize, IndustryClass, LeadSource
- Fuzzy matching on catalog value/code
- Caching for performance

### Data Flow

```
CSV File → AI Agent → Field Mappings → Manual Editing → Data Conversion → JSON Output
```

## Usage

```tsx
import { LeadImportExample } from '@/common/examples/apps/lead-import-example'

;<LeadImportExample {...context} />
```

## Supported Catalog Fields

- **countryRef**: Country catalog
- **regionRef**: Region catalog
- **numberOfEmployeesRef**: CompanySize catalog
- **industryRef**: IndustryClass catalog
- **leadSourceRef**: LeadSource catalog
- **leadStatusRef**: LeadStatus catalog
- **leadRatingRef**: LeadRating catalog

## Direct Fields

firstName, lastName, email, phoneNumber, position, companyName, companyEmail, companyPhone, companyWebsite, city, postalCode, description
