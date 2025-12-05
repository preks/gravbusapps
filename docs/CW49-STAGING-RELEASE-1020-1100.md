# CW 49 - Staging Release Summary — PRs #1014 → #1100

**Release Date**: December 2024  
**Total PRs**: 70 | **Files Changed**: 600+ | **New Components**: 70+

---

## 1. Feature Overview

### 1.1 HR & Compensation

| Feature                           | PR(s)                                                                                                                                                                                                                                                               | Jira                                                                                                                 | Feature Flag                            | Permissions                                            | Catalogs                                                           | Backend                 | Status   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------- | -------- |
| Employee Profile Permission       | [#1020](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1020)                                                                                                                                                                               | [NWHR-680](https://newwork.atlassian.net/browse/NWHR-680)                                                            | —                                       | `employee-growth`, `employee-record-all-hr-backoffice` | —                                                                  | —                       | ✅ Ready |
| Salary Assignment (New Employees) | [#1078](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1078)                                                                                                                                                                               | [NWHR-764](https://newwork.atlassian.net/browse/NWHR-764)                                                            | —                                       | `employee-growth`                                      | `Currency`, `SalaryAdjustReason`                                   | Kogito                  | ✅ Ready |
| Salary Review Modal               | [#1083](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1083), [#1024](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1024)                                                                                        | [NWHR-766](https://newwork.atlassian.net/browse/NWHR-766), [NWHR-742](https://newwork.atlassian.net/browse/NWHR-742) | —                                       | `employee-growth`                                      | `Currency`, `SalaryAdjustReason`                                   | Kogito                  | ✅ Ready |
| Cancel Button on Salary Modal     | [#1085](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1085)                                                                                                                                                                               | [NWHR-765](https://newwork.atlassian.net/browse/NWHR-765)                                                            | —                                       | `employee-growth`                                      | —                                                                  | —                       | ✅ Ready |
| Bonus Granting Modal              | [#1052](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1052)                                                                                                                                                                               | [NWHR-686](https://newwork.atlassian.net/browse/NWHR-686)                                                            | —                                       | `employee-growth`                                      | `EmployeeBonusType`                                                | Kogito                  | ✅ Ready |
| Bonus Acknowledgment              | [#1058](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1058)                                                                                                                                                                               | [NWHR-753](https://newwork.atlassian.net/browse/NWHR-753)                                                            | —                                       | `employee-growth`                                      | `EmployeeBonusType`                                                | Kogito                  | ✅ Ready |
| Base Salary Model Update          | [#1042](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1042)                                                                                                                                                                               | [NWHR-751](https://newwork.atlassian.net/browse/NWHR-751)                                                            | —                                       | —                                                      | `Currency`                                                         | GraphQL                 | ✅ Ready |
| Current Salary Model Fix          | [#1062](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1062)                                                                                                                                                                               | [NWHR-695](https://newwork.atlassian.net/browse/NWHR-695)                                                            | —                                       | —                                                      | —                                                                  | GraphQL                 | ✅ Ready |
| Time Tracking Fixes               | [#1023](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1023), [#1040](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1040)                                                                                        | [NWHR-741](https://newwork.atlassian.net/browse/NWHR-741)                                                            | —                                       | —                                                      | —                                                                  | GraphQL                 | ✅ Ready |
| Geolocation & Time Tracking       | [#1080](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1080)                                                                                                                                                                               | [NWHR-664](https://newwork.atlassian.net/browse/NWHR-664)                                                            | —                                       | —                                                      | —                                                                  | Geolocation Service     | ✅ Ready |
| Benefit Type Rework               | [#1056](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1056)                                                                                                                                                                               | [NWHR-718](https://newwork.atlassian.net/browse/NWHR-718)                                                            | —                                       | `employee-record-all-hr-backoffice`                    | `BenefitType`                                                      | GraphQL, CatalogManager | ✅ Ready |
| Absence Calculations              | [#1031](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1031), [#1075](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1075), [#1090](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1090) | [NWHR-745](https://newwork.atlassian.net/browse/NWHR-745)                                                            | —                                       | —                                                      | `EmploymentRegionHoliday`, `AbsenceType`                           | GraphQL                 | ✅ Ready |
| My Absences Sort & Filter         | [#1094](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1094)                                                                                                                                                                               | [NWHR-189](https://newwork.atlassian.net/browse/NWHR-189)                                                            | —                                       | —                                                      | —                                                                  | GraphQL                 | ✅ Ready |
| Employee Profile Tabs             | [#1033](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1033), [#1039](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1039), [#1044](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1044) | [NWHR-677](https://newwork.atlassian.net/browse/NWHR-677)                                                            | `dev.employee-record.changelog.enabled` | —                                                      | —                                                                  | —                       | ✅ Ready |
| Working Conditions Fix            | [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037)                                                                                                                                                                               | [NWHR-748](https://newwork.atlassian.net/browse/NWHR-748)                                                            | —                                       | —                                                      | `EmploymentRegion`, `ContractType`, `EmploymentType`, `RemoteWork` | GraphQL                 | ✅ Ready |
| Upload Document Fix               | [#1038](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1038)                                                                                                                                                                               | [NWHR-749](https://newwork.atlassian.net/browse/NWHR-749)                                                            | —                                       | —                                                      | `DocumentGroup`, `DocumentType`                                    | GraphQL                 | ✅ Ready |
| My Assets Tab                     | [#1025](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1025)                                                                                                                                                                               | [NWHR-670](https://newwork.atlassian.net/browse/NWHR-670)                                                            | —                                       | —                                                      | —                                                                  | GraphQL                 | ✅ Ready |

### 1.2 MDM / Time Attendance

| Feature                | PR(s)                                                                                 | Jira                                                      | Feature Flag | Catalogs                          | Backend                     | Status   |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------ | --------------------------------- | --------------------------- | -------- |
| Increment Types System | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018) | [NWHR-631](https://newwork.atlassian.net/browse/NWHR-631) | —            | `TimeTypes`, `DayDetailFieldType` | Kogito (`/employee-time/*`) | ✅ Ready |

### 1.3 EveryAI & Platform

| Feature                       | PR(s)                                                                                                                                                                        | Jira      | Feature Flag           | Catalogs          | Backend                    | Status   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------- | ----------------- | -------------------------- | -------- |
| Every Box (Task Hub)          | [#1014](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1014)                                                                                        | NO-TICKET | `preview.enabled`      | —                 | Flow Engine, Kogito, CFlow | ✅ Ready |
| Voice/Speech AI               | [#1051](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1051)                                                                                        | NO-TICKET | `everyai.enabled`      | —                 | Speech APIs                | ✅ Ready |
| Flow Creator Redesign         | [#1063](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1063)                                                                                        | NO-TICKET | `flow.creator.enabled` | `ServiceCategory` | Flow Engine                | ✅ Ready |
| Page Analytics Infrastructure | [#1060](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1060), [#1068](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1068) | NO-TICKET | —                      | —                 | Analytics Service          | ✅ Ready |
| URL Pattern for Context       | [#1086](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1086)                                                                                        | NO-TICKET | —                      | —                 | —                          | ✅ Ready |
| Every Box Comment on Forms    | [#1091](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1091)                                                                                        | NO-TICKET | —                      | —                 | —                          | ✅ Ready |

### 1.4 Chat

| Feature                        | PR(s)                                                                                 | Jira      | Status   |
| ------------------------------ | ------------------------------------------------------------------------------------- | --------- | -------- |
| Chat App Fix                   | [#1032](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1032) | NO-TICKET | ✅ Ready |
| Responsive Redesign            | [#1064](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1064) | NO-TICKET | ✅ Ready |
| Entity Mentions (@mentions)    | [#1065](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1065) | NO-TICKET | ✅ Ready |
| Calendar & Meetings            | [#1087](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1087) | NO-TICKET | ✅ Ready |
| Org Structure Search & Avatars | [#1088](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1088) | NO-TICKET | ✅ Ready |

### 1.5 CRM / IRM

| Feature                           | PR(s)                                                                                                                                                                        | Jira                                                  | Feature Flag       | Catalogs                    | Backend                 | Status   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------ | --------------------------- | ----------------------- | -------- |
| Sales Activity 360 Dashboard      | [#1069](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1069), [#1073](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1073) | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| Delete Flows (All Entities)       | [#1028](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1028)                                                                                        | NO-TICKET                                             | —                  | —                           | Kogito                  | ✅ Ready |
| Kanban Detail Sheet               | [#1027](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1027)                                                                                        | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| Pipeline Settings                 | [#1047](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1047)                                                                                        | NO-TICKET                                             | —                  | `Pipeline`, `PipelineStage` | GraphQL, CatalogManager | ✅ Ready |
| Contact Type Improvements         | [#1053](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1053), [#1061](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1061) | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| IRM/CRM Records Adjustments       | [#1067](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1067)                                                                                        | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| Campaign Row Click                | [#1034](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1034)                                                                                        | [CRM-76](https://newwork.atlassian.net/browse/CRM-76) | —                  | —                           | —                       | ✅ Ready |
| Service Tab Flag                  | [#1072](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1072)                                                                                        | NO-TICKET                                             | `services.enabled` | —                           | —                       | ✅ Ready |
| Address & Communication Segments  | [#1055](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1055)                                                                                        | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| IRM Sales to Exits/Divestments    | [#1071](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1071)                                                                                        | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |
| Investment Data Displays Refactor | [#1074](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1074)                                                                                        | NO-TICKET                                             | —                  | —                           | GraphQL                 | ✅ Ready |

### 1.6 Bug Fixes

| Bug                             | PR                                                                                    | Jira                                                      | Area     | Catalogs Affected |
| ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- | ----------------- |
| CFlow Dynamic Form              | [#1026](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1026) | NO-TICKET                                                 | Every AI | —                 |
| Lead Convert Bugs               | [#1050](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1050) | NO-TICKET                                                 | CRM/IRM  | —                 |
| IRM Investment Section          | [#1054](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1054) | NO-TICKET                                                 | IRM      | —                 |
| Opportunity Currency Filter     | [#1066](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1066) | NO-TICKET                                                 | CRM/IRM  | `Currency`        |
| IRM Convert Opportunity Form    | [#1077](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1077) | NO-TICKET                                                 | IRM      | —                 |
| General CRM Bugfixes            | [#1070](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1070) | NO-TICKET                                                 | CRM      | —                 |
| CSS Specificity                 | [#1076](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1076) | NO-TICKET                                                 | Global   | —                 |
| HR Analytics Dashboard Queries  | [#1089](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1089) | [NWHR-755](https://newwork.atlassian.net/browse/NWHR-755) | HR       | —                 |
| Dropdown Menu Indicator         | [#1093](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1093) | [NWHR-761](https://newwork.atlassian.net/browse/NWHR-761) | HR       | —                 |
| IRM Investment Record Analytics | [#1095](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1095) | NO-TICKET                                                 | IRM      | —                 |
| Update Document Type            | [#1100](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1100) | NO-TICKET                                                 | IRM      | `DocumentType`    |

---

## 2. Catalog Summary

### 2.1 Catalogs Used in This Release

| Catalog Identifier      | Version | Used By PR(s)                                                                                                                                                                | Notes                              |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| EmployeeBonusType       | v1      | [#1052](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1052), [#1058](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1058) | Required for bonus type selection  |
| SalaryAdjustReason      | v1      | [#1024](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1024), [#1083](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1083) | Reasons for salary changes         |
| Currency                | v1      | [#1042](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1042), [#1066](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1066) | Currency selection                 |
| BenefitType             | v1      | [#1056](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1056)                                                                                        | Employee benefit types             |
| EmploymentRegion        | v1      | [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037)                                                                                        | Regional employment settings       |
| EmploymentRegionHoliday | v1      | [#1031](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1031), [#1075](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1075) | Regional holidays for calculations |
| ContractType            | v1      | [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037)                                                                                        | Employment contract types          |
| EmploymentType          | v1      | [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037)                                                                                        | Full-time, part-time, etc.         |
| RemoteWork              | v1      | [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037)                                                                                        | Remote work options                |
| AbsenceType             | v1      | [#1031](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1031)                                                                                        | Types of absences                  |
| DocumentGroup           | v1      | [#1038](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1038)                                                                                        | Document categorization            |
| DocumentType            | v1      | [#1038](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1038), [#1100](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1100) | Document types                     |
| TimeTypes               | v1      | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018)                                                                                        | System time types for MDM          |
| DayDetailFieldType      | v1      | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018)                                                                                        | Day detail configuration           |

### 2.2 Catalogs to Verify Before Deployment

| Catalog              | Required Entries          | Used In           | Example Verification                                                        |
| -------------------- | ------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `EmployeeBonusType`  | ≥ 1 active entry          | Bonus flows       | `CatalogEntry(where: {catalog: {identifier: {_eq: "EmployeeBonusType"}}})`  |
| `SalaryAdjustReason` | ≥ 1 active entry          | Salary adjustment | `CatalogEntry(where: {catalog: {identifier: {_eq: "SalaryAdjustReason"}}})` |
| `Currency`           | At minimum: EUR, USD      | Salary & CRM      | `CatalogEntry(where: {catalog: {identifier: {_eq: "Currency"}}})`           |
| `BenefitType`        | ≥ 1 active entry          | Benefits          | `CatalogEntry(where: {catalog: {identifier: {_eq: "BenefitType"}}})`        |
| `TimeTypes`          | System time types present | Increment Types   | `Catalog(where: {identifier: {_eq: "TimeTypes"}})`                          |

---

## 3. Permissions

### 3.1 Permission Matrix

| Permission Key                      | Type   | Features Affected                           | User Roles                |
| ----------------------------------- | ------ | ------------------------------------------- | ------------------------- |
| `employee-growth`                   | Action | Salary Adjustment, Bonus Granting           | Manager (with permission) |
| `employee-record-all-hr-backoffice` | Access | Full HR Admin features, Benefits visibility | HR Admin                  |
| `hr-notes-scope`                    | Access | HR Notes section                            | HR Admin, Manager         |

### 3.2 Permission Logic (Summary)

```typescript
// Compensation Tab Visibility
canViewCompensation = isSelfView || (isDirectManager && hasEmployeeGrowth) || hasHrBackoffice

// Compensation Actions (Salary/Bonus)
canManageCompensation = !isSelfView && ((isDirectManager && hasEmployeeGrowth) || hasHrBackoffice)

// Benefits Visibility
showAllBenefits = hasHrBackoffice
showFilteredBenefits = !hasHrBackoffice // Excludes HR_BACKOFFICE group benefits
```

---

## 4. Feature Flags

### 4.1 Flags Used

| Flag Key                                | Default | Features Controlled                     | Notes                              |
| --------------------------------------- | ------- | --------------------------------------- | ---------------------------------- |
| `preview.enabled`                       | `false` | Every Box (Task Hub), sharing via Blink | Must be `true` to enable Every Box |
| `dev.enabled`                           | `false` | Development-only features               | Keep `false` in staging/prod       |
| `dev.employee-record.changelog.enabled` | `false` | HR changelog tab                        | Optional                           |
| `services.enabled`                      | `false` | Services module, Service tab            | Enable only if module is ready     |
| `everyai.enabled`                       | varies  | Every AI features (voice/speech)        | Verify per environment             |
| `flow.creator.enabled`                  | varies  | Flow Creator app                        | Verify per environment             |

### 4.2 Recommended Staging Configuration

```yaml
preview.enabled: true
dev.enabled: false
dev.employee-record.changelog.enabled: false
services.enabled: false
everyai.enabled: true
flow.creator.enabled: true
```

---

## 5. Backend Services & Dependencies

### 5.1 Services

| Service             | Purpose            | Used By                                                                                               | Health Check          |
| ------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------- |
| GraphQL (Hasura)    | Data queries       | Most UI features                                                                                      | `/v1/graphql`         |
| Kogito              | Process workflows  | Salary, Bonus, Delete flows, Increment Types                                                          | `/q/health`           |
| Flow Engine         | Task management    | Every Box, reminders                                                                                  | `/flow-engine/health` |
| Chat Service        | Messaging          | Entity mentions                                                                                       | `/chat/health`        |
| Calendar API        | Meeting management | Chat Calendar ([#1087](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1087)) | `/calendar/health`    |
| Geolocation Service | Location tracking  | Time Tracking ([#1080](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1080)) | —                     |
| CatalogManager      | Catalog data       | All dropdowns and references                                                                          | `/catalog/health`     |
| FeatureHub          | Feature flags      | All gated features                                                                                    | SDK health/logs       |

### 5.2 Kogito Endpoints (Time/Increment Types)

| Endpoint                                          | Method | Feature                |
| ------------------------------------------------- | ------ | ---------------------- |
| `/employee-time/createIncrementType`              | POST   | Increment Types        |
| `/employee-time/updateIncrementType`              | POST   | Increment Types        |
| `/employee-time/createIncrementTypeVersionDetail` | POST   | Increment Type Details |
| `/employee-time/updateIncrementTypeVersionDetail` | POST   | Increment Type Details |
| `/employee-time/createTimeType`                   | POST   | Time Types             |
| `/employee-time/createRoundingRule`               | POST   | Rounding Rules         |
| `/employee-time/updateRoundingRule`               | POST   | Rounding Rules         |

---

## 6. Data Model Changes

### 6.1 New Entities

| Entity                       | Description                                 | PR                                                                                    |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `IncrementType`              | Base entity for increment types             | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018) |
| `IncrementTypeVersion`       | Versioning for increment type configuration | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018) |
| `IncrementTypeVersionDetail` | Detailed configuration per version          | [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018) |

### 6.2 Updated Entities

| Entity             | Change                             | PR                                                                                                                                                                           | Impact                             |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `EmployeeSalary`   | Now primary source for salary data | [#1042](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1042), [#1062](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1062) | Breaking change for old queries    |
| `EmployeeBonus`    | Extended for acknowledgment flow   | [#1058](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1058)                                                                                        | New fields for review              |
| `EmployeeLocation` | New queries for geolocation        | [#1080](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1080)                                                                                        | Geolocation data for time tracking |

### 6.3 GraphQL Schema (Must Exist)

```graphql
type EmployeeSalary {
  id: uuid!
  employeeId: uuid!
  annualGrossSalary: numeric
  monthlyGrossSalary: numeric
  hourlyGrossSalary: numeric
  currencyRef: String
  currency: CatalogEntry
  activeFrom: date
  activeTo: date
  # ...
}

type IncrementType {
  id: uuid!
  code: String!
  name: String!
  # ...
}
```

---

## 7. Pre-Deployment Checklist

### 7.1 Feature Flags

- [ ] `preview.enabled` set correctly (Every Box)
- [ ] `everyai.enabled` checked
- [ ] `flow.creator.enabled` checked
- [ ] `services.enabled` configured based on rollout

### 7.2 Catalogs

- [ ] `EmployeeBonusType` has active entries
- [ ] `SalaryAdjustReason` has active entries
- [ ] `Currency` has at least EUR and USD
- [ ] `BenefitType` has active entries
- [ ] `TimeTypes` present and readable

### 7.3 Permissions

- [ ] `employee-growth` policy configured
- [ ] `employee-record-all-hr-backoffice` policy configured
- [ ] `hr-notes-scope` policy configured

### 7.4 Backend

- [ ] Kogito `/employee-time/*` endpoints deployed
- [ ] Flow Engine available
- [ ] Chat Service supports entity mentions
- [ ] Calendar API available
- [ ] Geolocation service available
- [ ] GraphQL schema updated (`EmployeeSalary`, `IncrementType*`)

### 7.5 Database

- [ ] `IncrementType` tables created and migrated
- [ ] `EmployeeSalary` schema compatible with new UI
- [ ] Employee location queries available

---

## 8. Testing Matrix

| Feature              | Test Case                          | Role                      | Expected Result                         |
| -------------------- | ---------------------------------- | ------------------------- | --------------------------------------- |
| Salary Adjustment    | Manager adjusts team member salary | Manager + employee-growth | Modal opens, calculation correct, saves |
| Salary View          | Employee views own salary          | Employee                  | Read-only, no edit actions              |
| Bonus Granting       | HR grants and acknowledges bonus   | HR Admin                  | Full flow works                         |
| Every Box            | Open Task Hub                      | Any user (flag on)        | Task list visible                       |
| Every Box (flag off) | Open Task Hub                      | Any user                  | App/tab hidden                          |
| Entity Mentions      | @mention a contact in chat         | Any user                  | Suggestions appear, mention inserted    |
| Chat Calendar        | Create meeting from chat           | Any user                  | Meeting created, invites sent           |
| Geolocation          | View location in time tracking     | Any user                  | Location displayed in monthly summary   |
| HR Analytics         | View dashboard metrics             | HR Admin                  | Correct employee counts and rates       |
| My Absences          | Sort and filter absences           | Any user                  | List filters correctly                  |
| Increment Types      | Create new increment type          | MDM Admin                 | Type saved correctly                    |
| Delete Flows         | Delete entity (e.g., account)      | Owner/Admin               | Confirmation + soft delete              |

---

## 9. Rollback Strategy

### 9.1 Quick Rollback via Flags

| Issue                | Action                                                                                                                                                                              | Effect                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Every Box issues     | Set `preview.enabled = false`                                                                                                                                                       | Hides Every Box          |
| Services issues      | Set `services.enabled = false`                                                                                                                                                      | Hides Services Tab       |
| Salary form issues   | Revert [#1078](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1078), [#1083](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1083) | Lose new assignment mode |
| Chat mention issues  | Revert [#1065](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1065)                                                                                        | Lose @mentions           |
| Chat calendar issues | Revert [#1087](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1087), [#1088](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1088) | Lose calendar & avatars  |
| Geolocation issues   | Revert [#1080](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1080)                                                                                        | Lose location tracking   |
| HR Analytics issues  | Revert [#1089](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1089)                                                                                        | Dashboard queries broken |

### 9.2 Code-Level Rollback

Revert specific PRs for:

- **Salary UI**: [#1078](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1078), [#1083](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1083), [#1042](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1042), [#1062](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1062)
- **CRM flows**: [#1069](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1069), [#1073](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1073), [#1028](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1028)

Or redeploy previous tagged version:

```bash
git checkout tags/<previous-release-tag>
# rebuild + deploy pipeline as usual
```

---

## 10. Monitoring & Alerts

### 10.1 Metrics

| Metric                         | Threshold | Severity |
| ------------------------------ | --------- | -------- |
| GraphQL Error Rate             | > 1%      | Critical |
| Kogito Process Failures        | > 0.5%    | Warning  |
| Feature Flag Evaluation Errors | > 0       | Warning  |
| Chat Service Latency           | > 2s      | Warning  |
| Calendar API Errors            | > 1%      | Warning  |
| Geolocation Service Errors     | > 1%      | Warning  |

### 10.2 Log Patterns to Watch

```
"Error fetching salary data"
"Bonus granting failed"
"Increment type creation failed"
"Entity mention lookup failed"
"Every Box task fetch failed"
"Feature flag evaluation error"
"Calendar API error"
"Meeting creation failed"
"Geolocation service error"
"HR analytics query failed"
```

---

## 11. Stakeholder Communication

| Team          | Impacted Area                                      | Communication Needed                       |
| ------------- | -------------------------------------------------- | ------------------------------------------ |
| HR            | Salary workflows, benefits, geolocation, analytics | Training on new modals & flows             |
| Sales         | 360 dashboard, IRM updates                         | Demo session recommended                   |
| IT / Platform | Every Box, Chat, Flow Creator, Calendar            | Technical briefing                         |
| MDM Team      | Increment Types system                             | Admin training                             |
| All Users     | Every Box, Chat Calendar (when enabled)            | Release announcement / internal newsletter |

---

## 12. Release Sign-off

| Role            | Name | Date | Signature |
| --------------- | ---- | ---- | --------- |
| Release Manager |      |      |           |
| QA Lead         |      |      |           |
| Product Owner   |      |      |           |
| DevOps          |      |      |           |

---

**Document Version**: 1.3  
**Last Updated**: December 3, 2024  
**PR Range**: [#1014](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1014) – [#1100](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1100)

---

## Appendix: Complete PR Index

| PR                                                                                    | Title                                 | Category       |
| ------------------------------------------------------------------------------------- | ------------------------------------- | -------------- |
| [#1018](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1018) | NWHR-631 Increment Types              | MDM            |
| [#1020](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1020) | NWHR-680 Employee Profile Permission  | HR             |
| [#1022](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1022) | Change Debug View                     | Infrastructure |
| [#1023](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1023) | NWHR-741 Time Tracking Improvements   | HR             |
| [#1024](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1024) | NWHR-742 Salary Acknowledge Modal     | HR             |
| [#1025](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1025) | NWHR-670 My Assets Tab Fixes          | HR             |
| [#1026](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1026) | CFlow Dynamic Form Fix                | Bug Fix        |
| [#1027](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1027) | Kanban Board Details Sheet            | CRM/IRM        |
| [#1028](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1028) | IRM/CRM Delete Flows                  | CRM/IRM        |
| [#1030](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1030) | Improve Sonar Scans                   | Infrastructure |
| [#1031](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1031) | NWHR-745 Absences Calculations        | HR             |
| [#1032](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1032) | Fix Chat App                          | Chat           |
| [#1033](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1033) | NWHR-677 Employee Profile Tabs Order  | HR             |
| [#1034](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1034) | CRM-76 Campaign Row Click             | CRM            |
| [#1035](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1035) | Employee Details Refactor             | HR             |
| [#1036](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1036) | Improve Sonar Scan Step               | Infrastructure |
| [#1037](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1037) | NWHR-748 Working Conditions Fix       | HR             |
| [#1038](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1038) | NWHR-749 Upload Document Fix          | HR             |
| [#1039](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1039) | NWHR-677 Employee Profile Tabs        | HR             |
| [#1040](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1040) | NWHR-741 Time Tracking Enhance        | HR             |
| [#1041](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1041) | Adjust Sonar Settings                 | Infrastructure |
| [#1042](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1042) | NWHR-751 Base Salary Model            | HR             |
| [#1043](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1043) | Improve Sonar                         | Infrastructure |
| [#1044](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1044) | NWHR-677 Tabs Translations            | HR             |
| [#1047](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1047) | IRM/CRM Pipeline Settings             | CRM/IRM        |
| [#1048](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1048) | Adjust Sonar                          | Infrastructure |
| [#1049](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1049) | Bump ESLint                           | Infrastructure |
| [#1050](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1050) | Lead Convert Bugs                     | Bug Fix        |
| [#1051](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1051) | Every AI Voice/Speech                 | Platform       |
| [#1052](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1052) | NWHR-686 Bonus Granting Modal         | HR             |
| [#1053](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1053) | Contact Type Improvements             | CRM/IRM        |
| [#1054](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1054) | IRM Investment Section Fix            | Bug Fix        |
| [#1055](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1055) | Address & Communication Segments      | CRM/IRM        |
| [#1056](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1056) | NWHR-718 Benefit Type Rework          | HR             |
| [#1057](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1057) | Fix Prod Publish Path                 | Infrastructure |
| [#1058](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1058) | NWHR-753 Bonus Acknowledgment         | HR             |
| [#1060](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1060) | Page IRM Analytics                    | Platform       |
| [#1061](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1061) | Contact Account Section               | CRM/IRM        |
| [#1062](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1062) | NWHR-695 Salary Data Model Fix        | Bug Fix        |
| [#1063](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1063) | Flow Creator Redesign                 | Platform       |
| [#1064](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1064) | Chat Responsive Redesign              | Chat           |
| [#1065](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1065) | Chat Entity Mentions                  | Chat           |
| [#1066](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1066) | Opportunity Currency Filter           | Bug Fix        |
| [#1067](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1067) | IRM/CRM Records Adjustments           | CRM/IRM        |
| [#1068](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1068) | Page IRM Analytics                    | Platform       |
| [#1069](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1069) | Sales Activity 360 Dashboard          | CRM            |
| [#1070](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1070) | General CRM Bugfixes                  | Bug Fix        |
| [#1071](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1071) | IRM Sales to Exits/Divestments        | CRM/IRM        |
| [#1072](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1072) | Service Tab Flag                      | Platform       |
| [#1073](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1073) | Sales Activity 360 Improvements       | CRM            |
| [#1074](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1074) | Investment Data Displays Refactor     | CRM/IRM        |
| [#1075](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1075) | NWHR-745 Absences Form Fix            | HR             |
| [#1076](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1076) | CSS Specificity Fix                   | Bug Fix        |
| [#1077](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1077) | IRM Convert Opportunity Fix           | Bug Fix        |
| [#1078](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1078) | NWHR-764 Salary Assignment Mode       | HR             |
| [#1080](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1080) | NWHR-664 Geolocation & Time Tracking  | HR             |
| [#1083](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1083) | NWHR-766 Salary Review Modal          | HR             |
| [#1085](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1085) | NWHR-765 Cancel Button                | HR             |
| [#1086](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1086) | URL Pattern for Context               | Platform       |
| [#1087](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1087) | Chat Calendar Meetings                | Chat           |
| [#1088](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1088) | Chat Org Structure & Avatars          | Chat           |
| [#1089](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1089) | NWHR-755 HR Analytics Dashboard Fixes | Bug Fix        |
| [#1090](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1090) | NWHR-745 Absences Form Fix            | HR             |
| [#1091](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1091) | Every Box Comment on Forms            | Platform       |
| [#1093](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1093) | NWHR-761 Dropdown Menu Indicator Fix  | Bug Fix        |
| [#1094](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1094) | NWHR-189 My Absences Sort & Filter    | HR             |
| [#1095](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1095) | IRM Investment Record Analytics Fix   | Bug Fix        |
| [#1096](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1096) | BAPP-3581 Fix Screen Publish          | Infrastructure |
| [#1100](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1100) | Update Document Type                  | Bug Fix        |

**Total: 70 PRs**
