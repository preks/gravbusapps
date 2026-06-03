# Hierarchical Translation System

This directory contains the root-level translations for all business applications.

## Structure

The translation system follows a hierarchical pattern where each level merges translations from the level above:

```
business-apps/
├─ i18n/                                    # Root: common translations
│  ├─ de-DE.ftl, en-US.ftl, ro-RO.ftl     # Translation files
│  └─ index.ts                             # Exports with 'common-' prefix
│
├─ {module}/
│  └─ i18n/                                # Module level (e.g., crm, hr, core)
│     └─ index.ts                          # Merges root + module translations
│
└─ {module}/{sub-module}/
   └─ i18n/                                # Sub-module level
      └─ index.ts                          # Merges parent + sub-module
```

## Key Naming Convention

All translation keys are automatically prefixed based on their hierarchy level:

- **Root**: `common-{key}` (e.g., `common-save`, `common-cancel`)
- **Module**: `{module}-{key}` (e.g., `core-settings`)
- **Sub-Module**: `{module}-{sub}-{key}` (e.g., `core-content-category`)
- **App/Form**: `{module}-{sub}-{app}-{key}` (e.g., `core-content-content-portal-intranet`)

## Usage in Components

```typescript
import { useTranslation } from '@newwork/nw-design-system';
import translations from './_i18n'; // Always colocated!

export const MyComponent: React.FC = () => {
  const { t } = useTranslation(translations);

  return (
    <div>
      <button>{t('common-save')}</button>
      <span>{t('core-content-category')}</span>
    </div>
  );
};
```

## Adding New Translations

### For a new app/form/window:

1. Create an `_i18n/` folder in your component directory
2. Add FTL files for each locale (`de-DE.ftl`, `en-US.ftl`, `ro-RO.ftl`)
3. Create `index.ts` that merges parent + own translations

```typescript
// src/business-apps/core/content/apps/my-app/_i18n/index.ts
import translations from '../../_i18n'

import deDE from './de-DE.ftl?raw'
import enUS from './en-US.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': translations['en-US'] + '\n' + enUS,
  'de-DE': translations['de-DE'] + '\n' + deDE,
  'ro-RO': translations['ro-RO'] + '\n' + roRO
}
```

### For container folders (without own translations):

If your component uses translations from a parent level, create an `_i18n/index.ts` that re-exports:

```typescript
// src/business-apps/core/content/components/_i18n/index.ts
export { default } from '../../_i18n'
```

## Important Rules

1. **Every level needs an `_i18n/` folder** - even if it only re-exports
2. **Always import from `./_i18n`** - keep translations colocated
3. **Follow naming conventions** - use kebab-case and clear prefixes
4. **Comment your FTL files** - group related keys with `# Section Name`

## FTL File Template

```fluent
# Section Name
key-one = Translation text
key-two = Another translation

# Another Section
key-three = More text
key-with-variable = Hello { $name }!
```

## Common Translations Available

This root level provides common translations that all apps can use:

- **Buttons**: save, cancel, delete, edit, close, back, etc.
- **Actions**: add, remove, update, view, download, upload
- **States**: loading, error, success, warning, info
- **Labels**: name, description, status, date, created, modified
- **Business entities**: employee, account, contact, lead, opportunity

See the FTL files in this directory for the complete list.
