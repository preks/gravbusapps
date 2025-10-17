# AI Builder Testing Guide

Complete end-to-end testing guide for the NEWWORK AI Builder.

## 🧪 Test Scenarios

### Scenario 1: Simple Static Screen

**Objective**: Verify basic screen generation and publishing

**Steps**:
1. Start all services (FORGE, Publish Service, Dev Server)
2. Navigate to `/apps/platform/ai-builder`
3. In chat, enter: "Create a simple welcome screen with a title and description"
4. Wait for generation (~30 seconds)
5. Go to "Files" tab
6. Verify files created:
   - `WelcomeScreen.tsx`
   - `index.ts`
7. Go to "Preview" tab
8. Click "Start Preview"
9. Verify screen renders correctly
10. Click "Publish to Platform"
11. Enter:
    - Screen Path: `platform/apps/test-welcome`
    - Resource URL: `/apps/test/welcome`
12. Click "Publish Screen"
13. Wait for completion (~45 seconds)
14. Navigate to `/apps/test/welcome`
15. Verify screen is accessible and renders

**Expected Results**:
- ✅ Files generated in < 60 seconds
- ✅ All files have proper TypeScript
- ✅ All components use nw-design-system
- ✅ All classes use gba: prefix
- ✅ Preview shows the screen
- ✅ Publish succeeds
- ✅ Screen is accessible at URL

### Scenario 2: Screen with GraphQL Data

**Objective**: Verify data integration with newwork-graphql-mcp

**Steps**:
1. In chat, enter: "Create a lead list screen with columns for name, company, status, and created date. Include search functionality."
2. Wait for generation
3. Go to "Files" tab
4. Verify files created:
   - `LeadList.tsx` (main component)
   - `queries/LeadQueries.ts` (GraphQL queries)
   - `types/LeadTypes.ts` (TypeScript types)
   - `index.ts`
5. Open `LeadQueries.ts`
6. Verify:
   - Uses `useGraphQLClient`
   - Has proper query structure
   - Includes where conditions for search
   - Returns proper type
7. Open `LeadList.tsx`
8. Verify:
   - Uses the query hook
   - Has loading/error states
   - Has search input
   - Has data table
   - All elements have data-testid
9. Publish the screen
10. Test the published screen:
    - Search functionality works
    - Data loads from GraphQL
    - Table displays correctly
    - Sorting/filtering works

**Expected Results**:
- ✅ Query file uses correct pattern
- ✅ Component integrates with query
- ✅ Data loads from GraphQL API
- ✅ Search triggers GraphQL query
- ✅ Error states handled gracefully
- ✅ Loading states shown

### Scenario 3: Complex Form Screen

**Objective**: Verify form generation with validation

**Steps**:
1. In chat, enter: "Create a contact form with fields: name (required), email (required, valid email), phone (optional), company (required), notes (textarea). Include submit and cancel buttons."
2. Wait for generation
3. Verify files created:
   - `ContactForm.tsx`
   - `types/ContactFormTypes.ts`
   - `index.ts`
4. Open `ContactForm.tsx`
5. Verify:
   - Uses react-hook-form or similar
   - All fields have validation
   - Submit handler exists
   - Cancel handler exists
   - All inputs have data-testid
6. Preview the form
7. Test validation:
   - Try submitting empty form (should show errors)
   - Try invalid email (should show error)
   - Fill correctly and submit (should succeed)
8. Publish and test in platform

**Expected Results**:
- ✅ All fields render correctly
- ✅ Validation works on all required fields
- ✅ Email validation checks format
- ✅ Submit only works with valid data
- ✅ Error messages are user-friendly
- ✅ Form integrates with backend API

### Scenario 4: Dashboard with Statistics

**Objective**: Verify complex layouts and data aggregation

**Steps**:
1. In chat, enter: "Create a sales dashboard with statistics cards for: total leads (with trend), active opportunities (with value), closed deals this month, and conversion rate. Include a bar chart of leads by source."
2. Wait for generation
3. Verify files created:
   - `SalesDashboard.tsx`
   - `components/StatisticsCards.tsx`
   - `components/LeadSourceChart.tsx`
   - `queries/DashboardQueries.ts`
   - `types/DashboardTypes.ts`
4. Verify:
   - Uses WidgetGroup for statistics
   - Uses recharts or similar for charts
   - Queries aggregate data properly
   - Layout is responsive
5. Preview and verify:
   - Statistics display correctly
   - Chart renders
   - Data updates on refresh
6. Publish and test

**Expected Results**:
- ✅ Statistics cards use WidgetGroup pattern
- ✅ Charts render with real data
- ✅ Layout is responsive (mobile/tablet/desktop)
- ✅ Data aggregation queries work
- ✅ Loading states for all data

### Scenario 5: Error Handling

**Objective**: Verify robust error handling

**Test 5.1: FORGE API Down**
1. Stop FORGE service
2. Try to generate a screen
3. Verify error message shown
4. Verify user can retry

**Test 5.2: Invalid Screen Path**
1. Generate a screen
2. Try to publish with invalid path: `invalid-path`
3. Verify validation error shown
4. Correct path and retry
5. Verify publish succeeds

**Test 5.3: Publish Service Down**
1. Stop publish service
2. Try to publish a generated screen
3. Verify error message shown
4. Restart service
5. Verify retry works

**Test 5.4: GraphQL API Error**
1. Publish a screen with data integration
2. Stop GraphQL API
3. Open the published screen
4. Verify graceful error handling
5. Verify error message is user-friendly

**Expected Results**:
- ✅ All errors show user-friendly messages
- ✅ Retry functionality works
- ✅ No crashes or blank screens
- ✅ Errors are logged appropriately

## 🔍 Manual Testing Checklist

### Pre-Publishing
- [ ] All files have proper imports
- [ ] No TypeScript errors
- [ ] All components use nw-design-system
- [ ] All Tailwind classes use gba: prefix
- [ ] No hardcoded colors or values
- [ ] All interactive elements have data-testid
- [ ] GraphQL queries use correct pattern
- [ ] Types are properly defined
- [ ] Error boundaries exist
- [ ] Loading states implemented

### Post-Publishing
- [ ] Screen is accessible at URL
- [ ] All functionality works
- [ ] No console errors
- [ ] Styling matches design system
- [ ] Responsive on all devices
- [ ] Data loads correctly
- [ ] Forms submit successfully
- [ ] Navigation works
- [ ] Authentication respected

### Integration Points
- [ ] GraphQL queries work
- [ ] Access token is passed correctly
- [ ] User context available
- [ ] Permissions checked
- [ ] File uploads work (if applicable)
- [ ] External APIs accessible

## 🎯 Performance Testing

### Generation Speed
- Simple screen: < 30 seconds
- Screen with data: < 45 seconds
- Complex dashboard: < 60 seconds

### Publish Speed
- File writing: < 5 seconds
- Build process: < 30 seconds
- Azure upload: < 10 seconds
- Total: < 45 seconds

### Runtime Performance
- Initial load: < 2 seconds
- Data fetching: < 1 second
- User interactions: < 100ms

## 🔒 Security Testing

### Authentication
- [ ] Access token required for all API calls
- [ ] Expired tokens handled gracefully
- [ ] No token leakage in logs

### Input Validation
- [ ] Screen paths validated
- [ ] Resource URLs validated
- [ ] File paths sanitized
- [ ] No code injection possible

### File Operations
- [ ] Files only written to allowed directories
- [ ] No path traversal vulnerabilities
- [ ] Proper file permissions

## 📊 Success Criteria

### Functionality
- ✅ 100% of generated screens compile without errors
- ✅ 95%+ of generated screens work without modifications
- ✅ 100% of published screens are accessible

### Quality
- ✅ All screens follow gravity-business-apps patterns
- ✅ All screens use nw-design-system exclusively
- ✅ All screens have proper TypeScript types
- ✅ All screens have test IDs

### Performance
- ✅ Generation time < 60 seconds
- ✅ Publish time < 45 seconds
- ✅ Screen load time < 2 seconds

### Reliability
- ✅ Error rate < 5%
- ✅ All errors have user-friendly messages
- ✅ Retry mechanisms work

## 🐛 Known Issues and Workarounds

### Issue: Preview Not Loading
**Cause**: CORS restrictions or missing dependencies
**Workaround**: 
1. Check browser console for errors
2. Verify all dependencies installed
3. Try "Reload" button in preview

### Issue: Publish Fails with Path Error
**Cause**: Invalid screen path format
**Workaround**:
1. Verify format: `module/sub-module/apps/screen-name`
2. Use only lowercase and hyphens
3. Check path doesn't already exist

### Issue: Generated Code Has Linting Errors
**Cause**: AI generated non-compliant code
**Workaround**:
1. Review files tab
2. Fix obvious issues manually
3. Report pattern to improve AI prompts

## 📝 Test Results Template

```markdown
## Test Run: [Date]

### Environment
- FORGE Version: 
- gravity-business-apps Version:
- Node Version:

### Scenarios Tested
- [x] Simple Static Screen
- [x] Screen with GraphQL Data
- [x] Complex Form Screen
- [x] Dashboard with Statistics
- [x] Error Handling

### Results
- Total Screens Generated: X
- Successful Publishes: Y
- Average Generation Time: Zs
- Average Publish Time: Ws

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Workaround:

### Recommendations
- [Improvement suggestions]
```

## 🔄 Regression Testing

After any changes to:
- AI prompts
- Component patterns
- Publishing logic
- API integrations

Run all test scenarios and verify:
- No existing functionality broken
- New features work as expected
- Performance not degraded

---

**Testing Status**: ✅ Ready for Testing
**Last Updated**: October 15, 2025

