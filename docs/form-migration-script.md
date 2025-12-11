# Form Migration Script

## Bereits migriert:

✅ CRM AccountForm -> AccountLayout

## Verbleibende Migrationen:

### CRM Forms:

1. **ContactForm** (`src/business-apps/crm/core/forms/contact-form/ContactFormComponent.tsx`)
   - Ersetze: `import ContactSegment from '@/common/components/common-relations/form-segments/contact-segment/ContactSegment'`
   - Mit: `import { ContactLayout } from '@/common/components/common-relations/form-layouts'`
   - Ersetze: `<ContactSegment customFields={...} />`
   - Mit: `<ContactLayout contactInformationCustomFields={...} />`

2. **OpportunityForm** (`src/business-apps/crm/core/forms/opportunity-form/OpportunityFormComponent.tsx`)
   - Ersetze: `import OpportunitySegment from '@/common/components/common-relations/form-segments/opportunity-segment/OpportunitySegment'`
   - Mit: `import { OpportunityLayout } from '@/common/components/common-relations/form-layouts'`
   - Ersetze: `<OpportunitySegment customFields={...} />`
   - Mit: `<OpportunityLayout opportunityInformationCustomFields={...} />`

3. **LeadForm** (`src/business-apps/crm/core/forms/lead-form/LeadFormComponent.tsx`)
   - Ersetze: `import LeadSegment from '@/common/components/common-relations/form-segments/lead-segment/LeadSegment'`
   - Mit: `import { LeadLayout } from '@/common/components/common-relations/form-layouts'`
   - Ersetze: `<LeadSegment customFields={...} />`
   - Mit: `<LeadLayout leadInformationCustomFields={...} />`

4. **LeadConvertForm** (`src/business-apps/crm/core/forms/convert-lead-form/LeadConvertForm.tsx`)
   - Ersetze: `import { LeadConvertAccountStep, LeadConvertContactStep, LeadConvertOpportunityStep } from '@/common/components/common-relations/form-segments/lead-convert-segment/segments'`
   - Mit: `import { LeadConvertAccountStep, LeadConvertContactStep, LeadConvertOpportunityStep } from '@/common/components/common-relations/form-layouts/lead-convert-layout'`
   - Props ändern: `customFields` → segment-spezifische Props (z.B. `accountInformationCustomFields`)

### IRM Forms:

5. **AccountForm** (`src/business-apps/irm/core/forms/account-form/AccountFormComponent.tsx`)
   - Identisch zu CRM AccountForm Migration

6. **ContactForm** (`src/business-apps/irm/core/forms/contact-form/ContactFormComponent.tsx`)
   - Identisch zu CRM ContactForm Migration

7. **OpportunityForm** (`src/business-apps/irm/core/forms/opportunity-form/OpportunityFormComponent.tsx`)
   - Identisch zu CRM OpportunityForm Migration
   - Zusätzlich: `additionalSegment` → `customSegments` (Array)

8. **LeadForm** (`src/business-apps/irm/core/forms/lead-form/LeadFormComponent.tsx`)
   - Identisch zu CRM LeadForm Migration
   - Zusätzlich: `investmentSegment` → `customSegments` (Array)

9. **LeadConvertForm** (`src/business-apps/irm/core/forms/lead-convert-form/LeadConvertForm.tsx`)
   - Identisch zu CRM LeadConvertForm Migration

## Wichtige Prop-Mappings:

### AccountLayout:

- `customFields` → `accountInformationCustomFields` (für Felder in AccountInformationSegment)
- Neue Props: `accountDetailsCustomFields`, `addressCustomFields`, `communicationCustomFields`, `customSegments`

### ContactLayout:

- `customFields` → `contactInformationCustomFields`
- Neue Props: `contactDetailsCustomFields`, `addressCustomFields`, `communicationCustomFields`, `customSegments`

### OpportunityLayout:

- `customFields` → `opportunityInformationCustomFields`
- `additionalSegment` → `customSegments` (Array)
- Neue Props: `opportunityDetailsCustomFields`, `opportunityPipelineCustomFields`

### LeadLayout:

- `customFields` → `leadInformationCustomFields`
- `investmentSegment` → `customSegments` (Array)
- Neue Props: `leadPersonCustomFields`, `leadCompanyCustomFields`, `addressCustomFields`, `communicationCustomFields`

### Lead Convert Steps:

- Steps nutzen jetzt Layouts statt Segments
- Import-Pfad: `@/common/components/common-relations/form-layouts/lead-convert-layout`
- Props ähnlich zu oben

## Migration abgeschlossen für:

✅ CRM AccountForm
