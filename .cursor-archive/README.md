# Archived Cursor Rules

This directory contains the original cursor rules from gravity-business-apps before migration to `@newwork/cursor-rules` package.

## Archive Date

January 5, 2026

## Original Rules (25 files)

### Base/Core Rules

- `13-develop-component-styling.mdc` - Base styling rules with gba: prefix enforcement
- `newwork-gravity-business-apps.mdc` - Core project guidelines
- `rules.md` - Communication guidelines (kept in new structure)

### API Integration (4 files)

- `api-integration.mdc` - General API integration patterns
- `graphql-integration.mdc` - GraphQL query patterns
- `catalog-integration.mdc` - Catalog Manager API integration
- `rest-api-orgchart.mdc` - REST API for org chart

### Component Guidelines (5 files)

- `app-action-button-table-guidelines.mdc` - AppActionButton in tables
- `badge-variant-guideline.mdc` - Badge component variants
- `charts-guidelines.mdc` - Chart component usage
- `statistics-components-guidelines.mdc` - Statistics/KPI widgets
- `table-real-data.mdc` - Table components with real data

### Patterns & Workflows (5 files)

- `data-integration-hooks.mdc` - Data integration hook patterns
- `feature-flag-integration.mdc` - Feature flag usage
- `filters-rules.mdc` - Filtering patterns (comprehensive)
- `navigation-rules.mdc` - Navigation and routing
- `subview-query-params.mdc` - Subview URL parameters
- `kogito-processes-guidelines.mdc` - Kogito process integration

### Domain-Specific (2 files)

- `mdm-patterns.mdc` - Master Data Management patterns
- `pay-grade-matrix.mdc` - Pay grade matrix specifics

### Data Handling (3 files)

- `currency-handling.mdc` - Currency formatting
- `dataset-queries.mdc` - Dataset and timeseries queries
- `data-testid-guidelines.mdc` - Data-testid implementation

### Deployment & Dependencies (3 files)

- `deployment-to-prod-rules.mdc` - Production deployment process
- `cross-repository-dependencies.mdc` - nw-design-system + MCP server
- `translations-i18n.mdc` - i18n and translation patterns

### Commands (1 file)

- `sonarqube.md` - SonarQube command (kept in new structure)

## Migration Summary

### What Changed

- **Before**: 25 standalone .mdc files in `.cursor/rules/`
- **After**: Rules synced from `@newwork/cursor-rules` package
- **Method**: Installed `@newwork/cursor-rules` with `business-apps` preset

### Package Rules (18 files synced)

- `base/` - Core styling and security rules
- `required/` - Component structure, API patterns, data-testid, Kogito
- `guidance/` - Badge variants, statistics widgets, charts
- `filters/` - Complete filtering system (4 files)
- `modules/` - CRM, HR, FIN, MDM domain modules

### What Was Kept

- `rules.md` - Communication guidelines
- `sonarqube.md` - Custom command

## Next Steps

### Testing Phase (2 weeks)

1. Verify AI behavior matches expectations
2. Test styling enforcement (gba: prefix)
3. Test domain-specific patterns (CRM, HR, FIN, MDM)
4. Test new team commands (/pr, /ticket, /commit, /review)
5. Collect feedback from team

### Post-Testing Decisions

After testing period, decide:

1. ✅ Which archived rules are already covered by package
2. ⚠️ Which archived rules need to be restored as local overrides
3. 📝 Which rules to contribute back to package
4. 🗑️ Which archived rules can be deleted permanently

### Coverage Analysis

**Likely Covered by Package:**

- Component styling (base rules)
- Component structure (required rules)
- Data-testid patterns (required rules)
- API integration basics (required rules)
- Badge variants (guidance rules)
- Statistics widgets (guidance rules)
- Charts (guidance rules)
- Filters (filters rules - 4 files)
- Kogito processes (required rules)
- Domain modules (CRM, HR, FIN, MDM in modules/)

**May Need Restoration as Local Rules:**

- `pay-grade-matrix.mdc` - Very specific to gravity-business-apps
- `deployment-to-prod-rules.mdc` - Project-specific deployment process
- `cross-repository-dependencies.mdc` - MCP server enforcement details
- `rest-api-orgchart.mdc` - Specific REST API patterns
- `subview-query-params.mdc` - Specific routing pattern
- `translations-i18n.mdc` - Project-specific i18n patterns

**May Contribute Back to Package:**

- Enhanced filter rules if more detailed than package
- Currency handling patterns
- Dataset query patterns
- Navigation patterns

## Rollback Instructions

If critical issues arise during testing:

```bash
# 1. Uninstall package
npm uninstall @newwork/cursor-rules

# 2. Remove postinstall script from package.json
# (Edit package.json to remove "postinstall": "cursor-rules sync --silent")

# 3. Restore archived rules
cp .cursor-archive/rules-backup-20260105/*.mdc .cursor/rules/

# 4. Remove generated directories
rm -rf .cursor/rules/base .cursor/rules/required .cursor/rules/guidance .cursor/rules/filters .cursor/rules/modules .cursor/rules/local

# 5. Remove from .gitignore
# (Edit .gitignore to remove .cursor/rules/ and .cursor/commands/)

# 6. Commit restored rules
git add .cursor/rules/
git commit -m "revert: rollback to original cursor rules"
```

## Archive Retention

- **Keep for**: 30 days after successful testing
- **Delete when**: Team confirms package rules are sufficient
- **Location**: `.cursor-archive/rules-backup-20260105/`
