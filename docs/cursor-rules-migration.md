# Cursor Rules Migration to @newwork/cursor-rules Package

## Migration Date

January 5, 2026

## Overview

Successfully migrated from 25 standalone rule files to the centralized `@newwork/cursor-rules` package (v0.1.0).

---

## What Changed

### Before Migration

- ❌ 25 separate .mdc rule files in `.cursor/rules/`
- ❌ 1 custom command (`sonarqube.md`)
- ❌ No version control for rule updates
- ❌ Manual sync required across projects
- ❌ Rules committed to git repository
- ❌ No validation or diff tools
- ❌ Duplication with other NEWWORK projects

### After Migration

- ✅ Rules synced from `@newwork/cursor-rules` package
- ✅ Automatic sync on `npm install` via postinstall script
- ✅ Version controlled via package.json dependency
- ✅ Shared team commands: `/pr`, `/ticket`, `/commit`, `/review`
- ✅ Rules generated (gitignored, not committed)
- ✅ CI validation with `npm run rules:validate`
- ✅ Configuration in `cursor-rules.config.cjs`
- ✅ Diff tool to see changes: `npm run rules:diff`

---

## Package Configuration

### Configuration File: `cursor-rules.config.cjs`

```javascript
{
  extends: ['@newwork/cursor-rules/presets/business-apps'],
  modules: ['crm', 'hr', 'fin', 'mdm', 'irm'],
  variables: {
    projectName: 'gravity-business-apps',
    designSystemPackage: '@newwork/nw-design-system',
    tailwindPrefix: 'gba:',
  }
}
```

### Package Rules Synced (18 files)

#### Base Rules (3 files)

- `base/00-ALWAYS-APPLIED.mdc` - Core principles
- `base/critical/01-security.mdc` - Security guidelines
- `base/critical/03-design-system-compliance.mdc` - Design system enforcement

#### Required Rules (4 files)

- `required/10-component-structure.mdc` - Component organization (300 line limit)
- `required/11-api-integration.mdc` - GraphQL, REST, Catalog APIs
- `required/12-data-testid.mdc` - Testing attributes for all components
- `required/13-kogito-processes.mdc` - Kogito process integration

#### Guidance Rules (3 files)

- `guidance/20-badge-variants.mdc` - Badge component usage
- `guidance/21-statistics-widgets.mdc` - KPI/statistics components
- `guidance/23-charts.mdc` - Chart component guidelines

#### Filters Rules (4 files)

- `filters/30-filters-initialization.mdc` - Filter initialization
- `filters/31-filters-url-parameters.mdc` - URL parameter sync
- `filters/32-filters-graphql-integration.mdc` - GraphQL filter queries
- `filters/33-filters-backend-fetching.mdc` - Backend data fetching

#### Module Rules (4 files)

- `modules/crm.mdc` - CRM domain patterns
- `modules/hr.mdc` - HR domain patterns
- `modules/fin.mdc` - Finance domain patterns
- `modules/mdm.mdc` - Master Data Management patterns

### Team Commands (4 files)

- `commands/pr.md` - Generate PR descriptions
- `commands/ticket.md` - Create Jira tickets
- `commands/commit.md` - Generate commit messages
- `commands/review.md` - Code review assistance

### Kept from Original

- `.cursor/rules/rules.md` - Communication guidelines
- `.cursor/commands/sonarqube.md` - Custom SonarQube command

---

## Archived Rules

All 25 original rules archived in: `.cursor-archive/rules-backup-20260105/`

See [.cursor-archive/README.md](.cursor-archive/README.md) for complete archive documentation.

---

## Testing Checklist

### ✅ Phase 1: Basic Functionality (Completed)

- [x] Package installed successfully
- [x] Config file created (`cursor-rules.config.cjs`)
- [x] Rules synced to `.cursor/rules/` (18 files)
- [x] Commands synced to `.cursor/commands/` (4 files)
- [x] Validation passing (`npm run rules:validate`)
- [x] Old rules archived safely

### 🧪 Phase 2: AI Behavior Validation (To Test)

- [ ] **Styling rules enforced**
  - [ ] `gba:` prefix required on all Tailwind utilities
  - [ ] Design system components preferred over custom styling
  - [ ] No inline styles suggested
  - [ ] No hardcoded colors (hex, rgb)
- [ ] **Component structure guidelines**
  - [ ] 300 line file size limit enforced
  - [ ] Proper component organization suggested
  - [ ] BusinessAppContextProps usage enforced
- [ ] **API integration patterns**
  - [ ] GraphQL client usage (`useGraphQLClient`)
  - [ ] Catalog client usage (`useCatalogManagerClient`)
  - [ ] Proper error handling suggested
- [ ] **Domain-specific patterns available**
  - [ ] CRM patterns (Lead, Account, Contact, Opportunity)
  - [ ] HR patterns (Employee, Organization)
  - [ ] FIN patterns (Expenses, Budgets)
  - [ ] MDM patterns (Compensation, Job Positions)
  - [ ] IRM patterns (Investments)
- [ ] **Data-testid enforcement**
  - [ ] All interactive elements get testids
  - [ ] Proper naming conventions used
- [ ] **Kogito process integration**
  - [ ] Process continuation patterns
  - [ ] Event dispatching

### 🎯 Phase 3: Team Commands (To Test)

- [ ] `/pr` - Generates comprehensive PR descriptions
- [ ] `/ticket` - Creates Jira tickets from conversation
- [ ] `/commit` - Generates conventional commit messages
- [ ] `/review` - Provides code review feedback

### 🔄 Phase 4: CI/CD (To Test)

- [ ] Pipeline syncs rules on install
- [ ] Validation passes in CI
- [ ] Build completes successfully

---

## npm Scripts

### Available Commands

```bash
# Sync rules from package (automatic on npm install)
npm run rules:sync

# Validate rule configuration
npm run rules:validate

# Show differences between local and package versions
npm run rules:diff
```

### Automatic Sync

Rules sync automatically on `npm install` via the postinstall script.

---

## Feedback Period

### Duration

**2 weeks**: January 5, 2026 - January 19, 2026

### What to Test

1. **Rule Coverage**: Are package rules sufficient for daily development?
2. **Missing Rules**: Which archived rules need to be restored?
3. **Team Commands**: Do `/pr`, `/ticket`, `/commit`, `/review` work well?
4. **AI Behavior**: Is AI following rules correctly?
5. **Performance**: Any slowdowns or issues?

### How to Provide Feedback

- **Jira**: Create tickets with label `cursor-rules-migration`
- **Slack**: Post in #gravity-dev channel
- **Direct**: Contact [Your Name/Team]
- **Document**: Add notes to this file

### Feedback Questions

1. ✅ Is gba: prefix enforced correctly?
2. ✅ Are design system rules working?
3. ✅ Are component structure limits helpful?
4. ✅ Do API integration patterns match your needs?
5. ⚠️ Which archived rules do you miss?
6. 🆕 What new rules would be helpful?

---

## Post-Migration Decisions

After the feedback period, decide:

### 1. Restore Needed Rules as Local Overrides

If certain archived rules are needed, restore them to `.cursor/rules/local/`:

```bash
# Example: Restore deployment rules
cp .cursor-archive/rules-backup-20260105/deployment-to-prod-rules.mdc \
   .cursor/rules/local/deployment-to-prod-rules.mdc

# Sync to include local rules
npm run rules:sync
```

### 2. Contribute Rules Back to Package

If rules are useful across all NEWWORK projects:

- Submit PR to `@newwork/cursor-rules` repository
- Document in package changelog

### 3. Delete Archive

Once confident package rules are sufficient:

```bash
rm -rf .cursor-archive/
```

---

## Likely Coverage Analysis

### ✅ Rules Likely Covered by Package

These archived rules are probably redundant now:

- `13-develop-component-styling.mdc` → Covered by `base/critical/03-design-system-compliance.mdc`
- `newwork-gravity-business-apps.mdc` → Covered by `required/10-component-structure.mdc`
- `api-integration.mdc` → Covered by `required/11-api-integration.mdc`
- `data-testid-guidelines.mdc` → Covered by `required/12-data-testid.mdc`
- `kogito-processes-guidelines.mdc` → Covered by `required/13-kogito-processes.mdc`
- `badge-variant-guideline.mdc` → Covered by `guidance/20-badge-variants.mdc`
- `statistics-components-guidelines.mdc` → Covered by `guidance/21-statistics-widgets.mdc`
- `charts-guidelines.mdc` → Covered by `guidance/23-charts.mdc`
- `filters-rules.mdc` → Covered by `filters/*.mdc` (4 files)
- `mdm-patterns.mdc` → Covered by `modules/mdm.mdc`

### ⚠️ Rules That May Need Restoration

These are project-specific and may need to be restored:

- `deployment-to-prod-rules.mdc` - Gravity-specific deployment process
- `cross-repository-dependencies.mdc` - MCP server enforcement (if not in package)
- `pay-grade-matrix.mdc` - Very specific to gravity-business-apps
- `rest-api-orgchart.mdc` - Specific REST API patterns
- `subview-query-params.mdc` - Specific routing pattern
- `translations-i18n.mdc` - Project-specific i18n patterns
- `currency-handling.mdc` - Currency formatting specifics
- `dataset-queries.mdc` - Dataset/timeseries query patterns
- `navigation-rules.mdc` - Navigation patterns
- `data-integration-hooks.mdc` - Hook patterns
- `feature-flag-integration.mdc` - Feature flag patterns
- `app-action-button-table-guidelines.mdc` - AppActionButton specifics
- `catalog-integration.mdc` - Catalog API patterns
- `graphql-integration.mdc` - GraphQL specifics
- `table-real-data.mdc` - Table patterns

---

## Rollback Instructions

If critical issues arise:

### Step 1: Uninstall Package

```bash
npm uninstall @newwork/cursor-rules
```

### Step 2: Remove Scripts from package.json

Remove these lines from `scripts` section:

```json
"rules:sync": "cursor-rules sync",
"rules:validate": "cursor-rules validate",
"rules:diff": "cursor-rules diff",
"postinstall": "cursor-rules sync --silent"
```

### Step 3: Restore Archived Rules

```bash
# Remove generated directories
rm -rf .cursor/rules/base .cursor/rules/required .cursor/rules/guidance \
       .cursor/rules/filters .cursor/rules/modules .cursor/rules/local

# Restore archived rules
cp .cursor-archive/rules-backup-20260105/*.mdc .cursor/rules/

# Remove team commands (keep sonarqube.md)
rm .cursor/commands/pr.md .cursor/commands/ticket.md \
   .cursor/commands/commit.md .cursor/commands/review.md
```

### Step 4: Update .gitignore

Remove these lines from `.gitignore`:

```gitignore
# Generated Cursor rules (synced from @newwork/cursor-rules)
.cursor/rules/base/
.cursor/rules/required/
.cursor/rules/guidance/
.cursor/rules/filters/
.cursor/rules/modules/
.cursor/rules/local/
.cursor/commands/commit.md
.cursor/commands/pr.md
.cursor/commands/review.md
.cursor/commands/ticket.md
```

### Step 5: Delete Config File

```bash
rm cursor-rules.config.cjs
```

### Step 6: Commit Rollback (if decided)

```bash
git add .
git commit -m "revert: rollback cursor-rules migration to standalone files"
```

---

## Success Metrics

### Immediate Success (Day 1)

- [x] Package installed
- [x] Rules synced
- [x] Validation passing
- [x] Old rules archived
- [x] Documentation created

### Short-term Success (Week 2)

- [ ] Team comfortable with new commands
- [ ] AI behavior matches expectations
- [ ] No critical issues reported
- [ ] CI pipeline working

### Long-term Success (Month 1)

- [ ] Rules stay up-to-date with package
- [ ] Team adopts new commands
- [ ] Reduced maintenance burden
- [ ] Consistent rules across projects

---

## Resources

- **Package Documentation**: `node_modules/@newwork/cursor-rules/README.md`
- **Consumer Guide**: [package-consumer-instructions.md](../package-consumer-instructions.md)
- **Archive**: [.cursor-archive/README.md](../.cursor-archive/README.md)
- **Config File**: `cursor-rules.config.cjs`
- **Package Repository**: https://bitbucket.org/new-work-team/cursor-rules

---

## Support

### Questions or Issues?

- **Documentation**: See files above
- **Slack**: #gravity-dev channel
- **Jira**: Label: `cursor-rules-migration`

### Package Updates

When `@newwork/cursor-rules` is updated:

```bash
npm update @newwork/cursor-rules
npm run rules:diff     # Preview changes
npm run rules:sync     # Apply changes
npm run rules:validate # Verify
```

---

## Notes

- Rules are gitignored (generated artifacts)
- Archive can be deleted after 30 days of stable operation
- Config file (`cursor-rules.config.cjs`) is committed to git
- Custom rules can be added to `.cursor/rules/local/` if needed
- Package version in use: See `package.json` devDependencies
