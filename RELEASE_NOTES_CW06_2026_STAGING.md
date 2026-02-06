# CW 06 2026 - Staging Release Summary — PRs merged after #1541 (business-apps) and #3205 (platform)

**Release Date**: February 3, 2026  
**Previous Release**: January 27, 2026 (CW05 - business-apps #1541, platform #3205)  
**Total PRs**: 60 (business-apps: 44 merged, platform: 16 merged)  
**Release PRs**: [business-apps #1541](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1541) | [platform #3205](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3205)

> **Note**: This release includes all PRs merged into `develop` after Jan 27, 2026. Some backfilled PRs with lower IDs (e.g., #1201, #1510) were merged during this window and are included.

---

**Note**: This release includes ALL PRs merged after #1541 (Jan 27) up to Feb 3, 2026 (staging release date). Platform PRs range from #3206 to #3223.

### New Screens/Features:

- **Business-apps**: No brand‑new screens detected in this release window; changes are enhancements/migrations to existing screens across HR, CRM/IRM, EveryAI, MDM, and Platform apps.

### Updated Screens/Features (high‑impact):

- **HR & Time Attendance**: Employee Record, Performance Evaluation, Project Analytics
- **EveryAI & Platform (business-apps)**: Content Portal, Create Workspace, Function Manager, Prompt Manager, Every Box
- **Platform (apps)**: Chat, Desk, Document Apps, Notes Apps, Notifications, Resource Manager, Shared, Slide Apps, Spaces, Spreadsheet Apps

### New Reusable Components (src/components): 5

- **Editable Cells**: EditableCell, EditableComboboxCell, EditableSelectCell
- **Layout**: ConfigurationLayout
- **Translatable Field**: TranslationWidget

---

## 1. Feature Overview

### 1.1 Expenses

| Feature             | PR(s)                                                                                 | Jira                                                                 | Page URL              | Feature Flag | Permissions | Catalogs | Backend | Status    |
| ------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------- | ------------ | ----------- | -------- | ------- | --------- |
| Discard Item Screen | [#1606](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1606) | [EXPENSES-758](https://newwork-se.atlassian.net/browse/EXPENSES-758) | /fin/expenses/apps/\* | —            | —           | —        | GraphQL | ✅ Merged |

### 1.2 HR & Time Attendance

| Feature                                        | PR(s)                                                                                                                                                                                                                                                                                                                                                      | Jira                                                             | Page URL | Feature Flag                       | Permissions | Catalogs                    | Backend | Status    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ---------------------------------- | ----------- | --------------------------- | ------- | --------- |
| Feedback Status Filter                         | [#1525](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1525)                                                                                                                                                                                                                                                                      | [NWHR-858](https://newwork-se.atlassian.net/browse/NWHR-858)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Time Report Enhancements                       | [#1527](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1527)                                                                                                                                                                                                                                                                      | [NWHR-740](https://newwork-se.atlassian.net/browse/NWHR-740)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Working Notifications                          | [#1530](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1530)                                                                                                                                                                                                                                                                      | [NWHR-807](https://newwork-se.atlassian.net/browse/NWHR-807)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Calendar Right-Click                           | [#1510](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1510), [#1562](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1562)                                                                                                                                                                               | —                                                                | /hr/\*   | —                                  | —           | —                           | —       | ✅ Merged |
| Absence Context Menu Vacation Request          | [#1570](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1570)                                                                                                                                                                                                                                                                      | —                                                                | /hr/\*   | —                                  | —           | —                           | Kogito  | ✅ Merged |
| Improve Employee Benefits                      | [#1543](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1543)                                                                                                                                                                                                                                                                      | [NWHR-882](https://newwork-se.atlassian.net/browse/NWHR-882)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Employment Data Issues Fix                     | [#1547](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1547)                                                                                                                                                                                                                                                                      | [NWHR-854](https://newwork-se.atlassian.net/browse/NWHR-854)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Revert Pending Modal Bank Account Change       | [#1551](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1551)                                                                                                                                                                                                                                                                      | [NWHR-819](https://newwork-se.atlassian.net/browse/NWHR-819)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| HR Analytics Forecasting                       | [#1557](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1557)                                                                                                                                                                                                                                                                      | [NWHR-893](https://newwork-se.atlassian.net/browse/NWHR-893)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Prevent HR Self-Approval                       | [#1574](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1574)                                                                                                                                                                                                                                                                      | [TICKET-86](https://newwork-se.atlassian.net/browse/TICKET-86)   | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Hire Date Label Change + Revert                | [#1575](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1575), [#1585](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1585)                                                                                                                                                                               | [TICKET-148](https://newwork-se.atlassian.net/browse/TICKET-148) | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Missing Translations in My Profile             | [#1593](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1593)                                                                                                                                                                                                                                                                      | [TICKET-3](https://newwork-se.atlassian.net/browse/TICKET-3)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Fixed-Term Fields and Exit Reason Improvements | [#1600](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1600), [#1609](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1609), [#1612](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1612)                                                                                        | [TICKET-147](https://newwork-se.atlassian.net/browse/TICKET-147) | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Date Inputs to Design System                   | [#1613](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1613)                                                                                                                                                                                                                                                                      | [TICKET-105](https://newwork-se.atlassian.net/browse/TICKET-105) | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Salary Reduction Negative Amounts              | [#1622](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1622)                                                                                                                                                                                                                                                                      | [NWHR-881](https://newwork-se.atlassian.net/browse/NWHR-881)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Missing Translations Fix                       | [#1624](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1624)                                                                                                                                                                                                                                                                      | [NWHR-707](https://newwork-se.atlassian.net/browse/NWHR-707)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| Performance Tracking Flags / Participants Fix  | [#1604](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1604), [#1627](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1627), [#1634](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1634), [#1640](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1640) | [NWHR-870](https://newwork-se.atlassian.net/browse/NWHR-870)     | /hr/\*   | —                                  | —           | —                           | GraphQL | ✅ Merged |
| HR Document Categories (Document Group/Type)   | [#1626](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1626)                                                                                                                                                                                                                                                                      | —                                                                | /hr/\*   | —                                  | —           | DocumentGroup, DocumentType | GraphQL | ✅ Merged |
| Time Tracking Tab Feature Flag Gate            | [#1640](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1640)                                                                                                                                                                                                                                                                      | [NWHR-870](https://newwork-se.atlassian.net/browse/NWHR-870)     | /hr/\*   | human-resources.attendance.enabled | —           | —                           | —       | ✅ Merged |

### 1.3 CRM / IRM

| Feature                            | PR(s)                                                                                 | Jira | Page URL                     | Feature Flag | Permissions | Catalogs                       | Backend | Status    |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ---- | ---------------------------- | ------------ | ----------- | ------------------------------ | ------- | --------- |
| CRM Data Import Extension          | [#1555](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1555) | —    | /crm/\*                      | —            | crm-user    | —                              | GraphQL | ✅ Merged |
| Opportunity Record Icon Import Fix | [#1605](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1605) | —    | /crm/core/apps/opportunities | —            | crm-user    | —                              | GraphQL | ✅ Merged |
| CRM/IRM Data Import Refactor       | [#1591](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1591) | —    | /crm/_, /irm/_               | —            | crm-user    | Multiple (see Catalog Summary) | GraphQL | ✅ Merged |

### 1.4 MDM & Catalogs

| Feature                                  | PR(s)                                                                                 | Jira | Page URL | Feature Flag | Permissions | Catalogs                                  | Backend        | Status    |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ---- | -------- | ------------ | ----------- | ----------------------------------------- | -------------- | --------- |
| Company Document Upload (Catalog Select) | [#1494](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1494) | —    | /mdm/\*  | —            | —           | CompanyDocumentGroup, CompanyDocumentType | CatalogManager | ✅ Merged |

### 1.5 EveryAI & Platform (business-apps)

| Feature                                  | PR(s)                                                                                                                                                                        | Jira | Page URL                | Feature Flag | Permissions    | Catalogs | Backend      | Status    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------- | ------------ | -------------- | -------- | ------------ | --------- |
| Resource Manager                         | [#1201](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1201)                                                                                        | —    | /platform/resources     | —            | platform-admin | —        | GraphQL      | ✅ Merged |
| Process Targets                          | [#1539](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1539)                                                                                        | —    | Platform                | —            | —              | —        | —            | ✅ Merged |
| Publish Windows to Prod                  | [#1554](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1554)                                                                                        | —    | Publishing              | —            | —              | —        | —            | ✅ Merged |
| Everybox Bugfix                          | [#1558](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1558)                                                                                        | —    | Every Box               | —            | —              | —        | —            | ✅ Merged |
| Document Section Root Level              | [#1560](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1560)                                                                                        | —    | /core/documents/apps/\* | —            | —              | —        | GraphQL      | ✅ Merged |
| Notes App Handwriting                    | [#1571](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1571)                                                                                        | —    | /core/notes/apps/\*     | —            | —              | —        | —            | ✅ Merged |
| Document QA Chat UI                      | [#1596](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1596), [#1616](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1616) | —    | /core/documents/apps/\* | —            | —              | —        | GraphQL      | ✅ Merged |
| IDE Header Color Update                  | [#1597](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1597)                                                                                        | —    | IDE                     | —            | —              | —        | —            | ✅ Merged |
| Everyone Dashboard                       | [#1617](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1617)                                                                                        | —    | /platform/everyone      | —            | —              | —        | —            | ✅ Merged |
| Create Workspace + AI Orchestrator       | [#1614](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1614)                                                                                        | —    | /platform/create/\*     | dev.enabled  | —              | —        | AI Service   | ✅ Merged |
| PDF Upload and UI Improvements           | [#1618](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1618), [#1638](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1638) | —    | /core/documents/apps/\* | —            | —              | —        | File Service | ✅ Merged |
| AI Transcription Post-Meeting Cloudflare | [#1619](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1619)                                                                                        | —    | Video/Audio Calls       | —            | —              | —        | RealtimeKit  | ✅ Merged |
| Project Analytics                        | [#1630](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1630)                                                                                        | —    | /platform/analytics     | —            | —              | —        | —            | ✅ Merged |

### 1.6 Stock & Finance

| Feature                  | PR(s)                                                                                                                                                                        | Jira | Page URL | Feature Flag | Permissions | Catalogs | Backend | Status    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------- | ------------ | ----------- | -------- | ------- | --------- |
| Fortunesheet Integration | [#1578](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1578), [#1586](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1586) | —    | /fin/\*  | —            | fin-user    | —        | GraphQL | ✅ Merged |

### 1.7 Gravity Platform (platform repo)

| Feature                                    | PR(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Jira        | Description                                                | Status    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- | --------- |
| NWHR-736 unassigned employees param        | [#3223](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3223)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | NWHR-736    | Add parameter for unassigned employees retrieval           | ✅ Merged |
| Process Executor Targets                   | [#3206](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3206)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PPLAT-8410  | Process executor targets                                   | ✅ Merged |
| Mobile viewport and WebView fixes (series) | [#3222](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3222), [#3221](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3221), [#3220](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3220), [#3218](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3218), [#3217](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3217), [#3216](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3216), [#3215](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3215) | —           | Mobile viewport stability                                  | ✅ Merged |
| Build and export fixes                     | [#3219](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3219)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —           | Avoid design-system Form and lowcoder css export issues    | ✅ Merged |
| Remove Create page and tests               | [#3214](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3214)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PPLAT-10083 | Remove Create page and tests                               | ✅ Merged |
| Simplify icon handling                     | [#3213](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3213)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PPLAT-10081 | Remove library dependency, fix icon resolution             | ✅ Merged |
| Mobile loading skeleton                    | [#3212](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3212)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —           | Add MobileLoadingSkeleton and integrate                    | ✅ Merged |
| Remove unused router import                | [#3210](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3210)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PPLAT-10075 | Remove unused router import and logic                      | ✅ Merged |
| Header notifications loader refactor       | [#3208](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3208)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —           | Replace NotificationsBell with NotificationsLoader         | ✅ Merged |
| Update design system version               | [#3207](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3207)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —           | Update @newwork/nw-design-system version and styles import | ✅ Merged |

---

## 2. Catalog Summary

### 2.1 Catalogs Used in This Release

- **CRM/IRM Data Import catalogs** (PR [#1591](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1591)): `LegalForm`, `CompanySize`, `IndustryClass`, `AnnualRevenue`, `AccountPriority`, `Country`, `Region`, `TimeZone`, `Salutation`, `AcademicTitle`, `Language`, `LeadSource`, `LeadStatus`, `LeadRating`, `InvestmentType`, `InvestmentGroup`, `InvestmentRole`, `InvestmentStakeType`, `SizeMeasurementUnit`
- **HR document catalogs** (PR [#1626](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1626)): `DocumentGroup`, `DocumentType`
- **MDM company document catalogs** (PR [#1494](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1494)): `CompanyDocumentGroup`, `CompanyDocumentType`

---

## 3. Permissions

No new platform permission keys identified in merged PRs (changes are UI-level sharing permissions and action permission schemas).

---

## 4. Feature Flags

- `dev.enabled` (Create Workspace + AI Orchestrator, PR [#1614](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1614))
- `human-resources.attendance.enabled` (Time Tracking tab visibility, PR [#1640](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1640))
- `dev.employee-record.changelog.enabled` (Employee Record changelog tab gating)
- `services.enabled` (Employee Record services tab gating)
- `Feature.HCM.Compensation.Key` (Compensation tab gating)
- `Feature.Preview.Enabled.Key` (Preview feature gating)

---

## 5. Backend Services & Dependencies

### 5.1 Services

| Service          | Purpose              | Used By                    | Health Check        |
| ---------------- | -------------------- | -------------------------- | ------------------- |
| GraphQL (Hasura) | Data queries         | Most UI features           | /v1/graphql         |
| Kogito           | Process workflows    | HR Forms, Absences         | /q/health           |
| Flow Engine      | Task management      | Every Box, Scheduled Tasks | /flow-engine/health |
| Chat Service     | Messaging            | Chat App                   | /chat/health        |
| CatalogManager   | Catalog data         | Dropdowns                  | /catalog/health     |
| AI Service       | AI features          | Every AI                   | /ai/health          |
| File Service     | File upload/download | Documents                  | /file/health        |
| RealtimeKit      | Video/Audio calls    | Video/Audio Calls          | /realtime/health    |
| Keycloak         | Authentication       | Login                      | /auth/health        |

---

## 6. Testing Matrix

### 6.1 Expense Features

| Feature         | Test Case                | Page URL              | Role         | Expected Result              | PR(s)                                                                                 |
| --------------- | ------------------------ | --------------------- | ------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| Discard Item UI | Open discard item screen | /fin/expenses/apps/\* | expense-user | Screen loads and fields work | [#1606](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1606) |

### 6.2 HR Features

| Feature                     | Test Case                            | Page URL | Role     | Expected Result               | PR(s)                                                                                 |
| --------------------------- | ------------------------------------ | -------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| NWHR-870 Tracking Flags     | Open performance tracking sections   | /hr/\*   | Any user | Flags and participants render | [#1604](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1604) |
| Fixed-Term Fields           | Create/edit employee with fixed term | /hr/\*   | HR admin | Fields show and persist       | [#1600](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1600) |
| Date Inputs (Design System) | Open HR forms with date inputs       | /hr/\*   | Any user | Date inputs render correctly  | [#1613](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1613) |

### 6.3 CRM Features

| Feature                   | Test Case                | Page URL | Role     | Expected Result       | PR(s)                                                                                 |
| ------------------------- | ------------------------ | -------- | -------- | --------------------- | ------------------------------------------------------------------------------------- |
| CRM Data Import Extension | Run CRM data import flow | /crm/\*  | crm-user | Import flow completes | [#1555](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1555) |

### 6.4 EveryAI/Platform Features

| Feature                 | Test Case             | Page URL                | Role     | Expected Result                | PR(s)                                                                                 |
| ----------------------- | --------------------- | ----------------------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Document QA Chat UI     | Open document QA chat | /core/documents/apps/\* | Any user | QA chat renders and responds   | [#1596](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1596) |
| PDF Upload Improvements | Upload and view PDF   | /core/documents/apps/\* | Any user | Upload succeeds and preview ok | [#1618](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1618) |

---

## 7. Pre-Deployment Checklist

### 7.1 Feature Flags

- [ ] `dev.enabled` configured in target environment
- [ ] `human-resources.attendance.enabled` configured in target environment
- [ ] `dev.employee-record.changelog.enabled` configured in target environment
- [ ] `services.enabled` configured in target environment
- [ ] `Feature.HCM.Compensation.Key` configured in target environment
- [ ] `Feature.Preview.Enabled.Key` configured in target environment

### 7.2 Catalogs

- [ ] CRM/IRM Data Import catalogs available
- [ ] HR document catalogs (DocumentGroup, DocumentType) available
- [ ] MDM company document catalogs (CompanyDocumentGroup, CompanyDocumentType) available

### 7.3 Permissions

- [ ] No new permissions in this release

### 7.4 Backend

- [ ] GraphQL schema updated for new queries
- [ ] File Service available for document features
- [ ] RealtimeKit/Cloudflare integration verified
- [ ] Keycloak authentication verified

### 7.5 Open PRs to Merge Before Release

**Business-apps (open PRs):**

- [#1641](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1641) - Feature/NWHR-894 generate edit templates
- [#1639](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1639) - [REVIEW] bugfix/NWHR-893_hr_analytics_forecasting_fix
- [#1599](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1599) - feat AIML-784: enable mentioning functionality for every-ai chat
- [#1623](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1623) - Feature/NO TICKET product management
- [#1522](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1522) - Feature/EXPENSES-730 expense settings
- [#1636](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1636) - feat AIML-788: system task link handling
- [#1620](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1620) - [REVIEW]Bugfix/EXPENSES-759 item creation issues
- [#1629](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1629) - [REVIEW]feat NO-TICKET: add loading structure option for widget height preservation
- [#1631](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1631) - Feature/CRM-104 investment management
- [#1632](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1632) - feat NO-TICKET: remove flow ID display and add due/start date labels
- [#523](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/523) - [skip ci] Update dependency @vitejs/plugin-react to v5
- [#1598](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1598) - feat NO-TICKET: populate ContentEntryWindow form fields from flow proposal data
- [#1628](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1628) - fix NO-TICKET: use uppercase link types to match flow engine API requirements
- [#1603](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1603) - feat NO-TICKET: add skills handling and job description file upload feature
- [#1588](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1588) - Feature/NO TICKET ai builder integration
- [#527](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/527) - [skip ci] Update dependency react to v19
- [#1610](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1610) - fix NO-TICKET: improve asset allocation with sequential execution and rollback
- [#1308](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1308) - feat CRM-84: infinit scroll logic for CRM forms
- [#1594](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1594) - Bugfix/NO TICKET custom data manager merge
- [#1580](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1580) - feat AIML-780: add multi-select employee field and fix form submit issue
- [#1552](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1552) - fix NO-TICKET: make voice dictation review-only bottom sheet
- [#1573](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1573) - fix NWHR-620: added hasJobPosition check for terminate job position
- [#1567](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1567) - Claude batch 8: fix-gba-prefixes-part-8
- [#1568](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1568) - Claude batch 5: fix-gba-prefixes-part-5
- [#1566](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1566) - Claude batch 6: fix-gba-prefixes-part-6
- [#1564](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1564) - Claude batch 3: fix-gba-prefixes-part-3
- [#1563](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1563) - Claude batch 1: fix-gba-prefixes-part-1
- [#1549](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1549) - Feature/NO TICKET services settings plus translate
- [#1544](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1544) - feat AIML-736: reload entity screen when it was changed through the every ai chat
- [#1398](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1398) - feat CRM-86: update infinit scrolling for IRM forms
- [#528](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/528) - [skip ci] Update dependency react-dom to v19
- [#522](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/522) - [skip ci] Update dependency @ant-design/icons to v6
- [#1514](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1514) - chore NO-TICKET: update 'Hire Date' label to 'Hiring Date' across HR module
- [#520](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/520) - [skip ci] Update dependency lucide-react to ^0.563.0
- [#1493](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1493) - Merged in feature/NO-TICKET_selgros_sales (pull request #1475)
- [#526](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/526) - [skip ci] Update dependency http-proxy-middleware to v3
- [#786](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/786) - [skip ci] Update dependency eslint-plugin-react-hooks to v7
- [#525](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/525) - [skip ci] Update dependency eslint-config-prettier to v10
- [#1364](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1364) - [skip ci] Update dependency @ant-design/cssinjs to v2
- [#1435](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1435) - [skip ci] Update node Docker tag to v20.20.0
- [#1381](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1381) - feat NO-TICKET: add state for tracking today's lunch break status
- [#1264](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1264) - fix NO-TICKET: align investment launcher lead flow and KPIs
- [#1250](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1250) - Bugfix/AIML-734 fix give feedback flow
- [#1245](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1245) - fix NO-TICKET: enhance DocumentPopup with file utilities for better integration
- [#889](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/889) - Bugfix/NO TICKET irm document download from forms
- [#1166](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1166) - [ON HOLD]:feat NO-TICKET: add jsPDF and jsPDF-AutoTable libraries to package lock
- [#1234](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1234) - feat NO-TICKET: add AI agent output schema builder
- [#1163](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1163) - fix NO-TICKET: fix GraphQL queries in entity display components
- [#1045](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1045) - feat NO-TICKET: remove Address section from IRM and CRM contact forms
- [#1046](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1046) - Feature/NO TICKET every ai employee chip
- [#886](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/886) - refactor NO-TICKET: remove CRM currency wrapper utilities
- [#878](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/878) - fix NO-TICKET: add missing catalogIdentifier and version parameters to catalog API calls
- [#895](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/895) - feat CRM-66: display formatted address in account location column
- [#888](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/888) - feat CRM-64: fix account form validation and address infinite loop
- [#906](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/906) - refactor CRM-70: update cards
- [#503](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/503) - [WIP] Feature/NO TICKET project rules
- [#778](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/778) - chore NO-TICKET: add Phosphor Icon Renderer remote component to optimize bundle size
- [#144](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/144) - [WIP] add request vs plan
- [#596](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/596) - Refactor AccountList and related hooks for consistency and clarity
- [#559](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/559) - update navigation
- [#254](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/254) - moved upload document button to documents tab and removed duplicate documents tab from overview tab

**Platform (open PRs, page 1):**

- [#3203](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3203) - Bugfix (NWHR-616) - Wrong employee id on flows from global search
- [#2814](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2814) - [skip ci] Update dependency @jitsi/react-sdk to v1.4.4
- [#3209](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3209) - [Snyk] Security upgrade next from 14.2.35 to 15.5.10
- [#2820](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2820) - [skip ci] Update dependency @newwork/lowcoder-sdk to v2.5.1-182
- [#3200](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3200) - [Snyk] Security upgrade lodash from 4.17.21 to 4.17.23
- [#3166](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3166) - chore(deps): update @newwork/remote-component-loader to 0.1.1 and tailwind-merge to 3.3.0
- [#3163](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3163) - [DO NOT MERGE] feat(middleware): implement strict mobile bridge CSP with nonce and refactor response handling; update remote component loading with nonce support
- [#2832](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2832) - [READY FOR TESTING] Feature/PORG-2313 check permissions remake
- [#3064](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3064) - feat(pplat-8413): adjust flow assignment handling
- [#3077](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3077) - Feature/PPLAT-8430 navigation ui performance Improvement
- [#2979](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2979) - feat: add expense translations for personal_expenses and expense_request_list
- [#2842](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2842) - Feature/add playwright tests
- [#2961](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2961) - feat(i18n): add expenses_launcher translations for en, de, ro
- [#2951](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2951) - feat(process-executor): add lastProcessEvent to metadata and dispatch in events
- [#2876](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2876) - [Snyk] Security upgrade next from 14.2.28 to 14.2.32
- [#2861](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2861) - [READY FOR TESTING] Feat(PORG-2340): adjusted right panel
- [#2682](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2682) - [READY FOR TESTING] PORG-2200 PORG-2202
- [#2770](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2770) - feat(every-648): fix create article knowledge case
- [#2735](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2735) - [READY FOR TESTING] Feature/PPLAT-8140 Manage Child Groups
- [#2747](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2747) - [REVIEW]: feat(every-648): add upload file for create article form
- [#2734](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2734) - [WIP]: feat(every-724): remove comments and share icon from intranet
- [#2620](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2620) - [READY-FOR-TESTING]: feat(every-737): change carousel from intranet
- [#2681](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2681) - [REVIEW]feat: create employee details content component and flow registry types
- [#2656](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2656) - [REVIEW]: feat(every-767): enhance absence card
- [#2601](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/2601) - [Snyk] Security upgrade next from 14.2.28 to 15.2.2

---

## 8. Rollback Strategy

### 8.1 Quick Rollback via Flags

Feature flags in this release:

- `dev.enabled`
- `human-resources.attendance.enabled`
- `dev.employee-record.changelog.enabled`
- `services.enabled`
- `Feature.HCM.Compensation.Key`
- `Feature.Preview.Enabled.Key`

### 8.2 Code-Level Rollback

Revert specific PRs if needed:

- [#1606](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1606) - Discard Item Screen
- [#1604](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1604) - NWHR-870 tracking flags
- [#1640](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1640) - Attendance feature flag gate
- [#1626](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1626) - HR document categories (DocumentGroup/Type)
- [#1618](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1618) - PDF upload and UI improvements
- [#1614](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1614) - Create Workspace + AI Orchestrator
- [#1555](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1555) - CRM data import extension
- [#1591](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1591) - CRM/IRM data import refactor
- [#1494](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1494) - Company document upload (catalog select)
- [#3223](https://bitbucket.org/new-work-team/gravity-platform/pull-requests/3223) - Platform unassigned employee parameter

---

## 9. Monitoring & Alerts

### 9.1 Metrics

| Metric                         | Threshold | Severity |
| ------------------------------ | --------- | -------- |
| GraphQL Error Rate             | > 1%      | Critical |
| Kogito Process Failures        | > 0.5%    | Warning  |
| Feature Flag Evaluation Errors | > 0       | Warning  |
| AI Service Latency             | > 5s      | Warning  |
| File Upload Errors             | > 1%      | Warning  |

### 9.2 Log Patterns to Watch

```
"Error fetching document data"
"PDF upload failed"
"Process tracking flags missing"
"CRM data import failed"
"Mobile viewport calculation failed"
```

---

## 10. Release Sign-off

| Role            | Name | Date | Signature |
| --------------- | ---- | ---- | --------- |
| Release Manager |      |      |           |
| QA Lead         |      |      |           |
| Product Owner   |      |      |           |
| DevOps          |      |      |           |

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**PR Range**:

- gravity-business-apps: merged after #1541 (includes backfilled IDs like #1201, #1510)
- gravity-platform: #3206–#3223
