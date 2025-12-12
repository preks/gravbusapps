# CW 50 - Staging Release Summary — PRs #1118 → #[NEXT]

**Release Date:** Dec 10, 2024  
**Total PRs:** 1  
**Files Changed:** 878  
**Commits:** 150+

**Staging release PR:** [gravity-business-apps: #1118 Release into Staging - 04.12.25](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/1118) **merged**

**Release Ticket:** DEPLOYMENT-XXX: Weekly Release - CW 50 **[Status]**

---

## Table of Contents

1. [Staging Configuration](#1-staging-configuration)
   - 1.1 [Feature Flags Required for Staging](#11-feature-flags-required-for-staging)
   - 1.2 [Action to be taken on Staging](#12-action-to-be-taken-on-staging)
2. [Feature Overview](#2-feature-overview)
   - 2.1 [HR & Compensation](#21-hr--compensation)
   - 2.2 [MDM / Time Attendance](#22-mdm--time-attendance)
   - 2.3 [EveryAI & Platform](#23-everyai--platform)
   - 2.4 [Chat](#24-chat)
   - 2.5 [CRM / IRM](#25-crm--irm)
   - 2.6 [Bug Fixes](#26-bug-fixes-bugs-found-by-qa-during-testing)
3. [Technical Reference (Single Source of Truth)](#3-technical-reference-single-source-of-truth)
   - 3.1 [Catalogs Used in This Release](#31-catalogs-used-in-this-release)
   - 3.2 [Permission Matrix](#32-permission-matrix)
   - 3.3 [Permission Logic (Summary)](#33-permission-logic-summary)
   - 3.4 [Backend Services & Dependencies](#34-backend-services--dependencies)
   - 3.5 [Data Model Changes](#35-data-model-changes)
4. [Pre-Deployment Checklist](#4-pre-deployment-checklist)
5. [Testing Matrix](#5-testing-matrix)
6. [Rollback Strategy](#6-rollback-strategy)
7. [Stakeholder Communication](#7-stakeholder-communication)
8. [Release Sign-off](#8-release-sign-off)

---

## 1. Staging Configuration

### 1.1 Feature Flags Required for Staging

| Flag Key | Value (Staging) | Description | Checked Y/N | Check where feature flag has to be set |
|----------|----------------|-------------|-------------|----------------------------------------|
| **preview.enabled** | **true** | Enables:<br/>- Every Box (Task Hub)<br/>- Chat Responsive Redesign<br/>- Chat App Fix<br/>- Entity Mentions (@mentions)<br/>- Calendar & Meetings in Chat<br/>- Org Structure Search & Avatars<br/>- Sharing via Blink | Y | code only |
| **dev.enabled** | **false** | Disables development-only features (ensures parity & stability). These should not appear on staging:<br/>**HR & Compensation:**<br/>- Salary Assignment (New Employees)<br/>- Salary Review Modal<br/>- Cancel Button on Salary Modal<br/>- Bonus Granting Modal<br/>- Bonus Acknowledgment<br/>- Base Salary Model Update<br/>- Current Salary Model Fix<br/>- Time Tracking Fixes<br/>- Geolocation & Time Tracking<br/>- Benefit Type Rework<br/>**MDM / Time Attendance:**<br/>- Increment Types System | Y | code and Flow registry |
| **dev.employee-record.changelog.enabled** | **false** | Hides **Employee Profile Tabs** (adds HR changelog tab) | Y | code only |
| **services.enabled** | **true** | Service Tab enabled - Shows the Services module and its Service Tab | Y | code, resource url and flow registry |
| **everyai.enabled** | **true** | Enables voice/speech AI | Y | code only |
| **flow.creator.enabled** | **true** | Enables new Flow Creator redesign | Y | code, and resource url? |
| **assets.enabled** | **true** | My Assets Tab, Asset Management App | Y | code and resource url |

### 1.2 Action to be taken on Staging

- Import navigation service to staging
- Verify all feature flags are set correctly
- Deploy backend services and endpoints

---

## 2. Feature Overview

### 2.1 HR & Compensation

#### Salary Management
- **Salary Assignment for New Employees (NWHR-764, NWHR-766)**
  - Add new salary assignment mode for new employee onboarding
  - Update components for salary assignment mode
  - Support new employee salary assignment in review modal
  - Add translations for salary assignment workflow (EN/DE/RO)
  
- **Salary Review & Adjustment (NWHR-742)**
  - Add adjust employee salary review form
  - Update salary review component and shared review rows
  - Extract helper functions for improved code readability
  - Add translation keys for salary adjustment type
  - Update salary adjustment queries, context and fields component
  - Update salary adjustment group component and main form
  - Extract currency formatting helper and improve null checks
  
- **Base Salary Model Update (NWHR-751)**
  - Add translation keys for base salary compensation
  - Update compensation types and queries for base salary
  - Update compensation transformers for base salary data
  - Update compensation hooks to use base salary data model
  - Update compensation components to render base salary
  - Prevent array mutation in useCurrentCompensation sort
  - Use EmployeeSalary datamodel and document currency field relationship

#### Bonus Management
- **Bonus Granting Modal (NWHR-686, NWHR-753)**
  - Add queries and data formatting for bonus review
  - Add grant employee bonus review component
  - Add types and exports for bonus review form
  - Update bonus granting modal with payment month and read-only currency
  - Update bonus payload with paymentDate, null currency, and remove status
  - Add payment month and month name translations
  
- **Bonus Acknowledgment (NWHR-753)**
  - Add acknowledgment modal with bonus details for bonus granting
  - Add i18n translations for bonus review (EN/DE/RO)
  - Update compensation KPI cards with active bonus count and AppAction API

#### Time Tracking & Attendance
- **Time Tracking Enhancements**
  - Add History tab and component to Time Tracking section
  - Update time tracking labels and enhance date formatting logic
  - Update time tracking titles for improved clarity and consistency
  - Update time tracking title to reflect monthly summary context
  - Reorganize header to display above subtab selector in TimeTrackingTab
  - Update translation keys for employee record and absence validation
  - Enhance layout of Monthly Summary tab for better readability
  - Remove unnecessary whitespace in TimeTrackingTab component
  - Update translations for time tracking components and headers
  - Remove unused locale formatting code from LiveClock component
  - Enhance date formatting and clock-in display logic for clarity
  - Use consistent time formatting to match calendar position
  
- **Geolocation & Time Tracking (NWHR-631)**
  - Add increment types version details
  - Add overlap periods
  - Rebased with day types & created hook for overlap
  - Add translations / fix validations issues
  - Adjusted remove dialog
  - Convert minutes to HH:mm format
  - Fix sonar issues

#### Benefits Management
- **Benefit Type Rework**
  - Add benefit period input and update related labels in forms
  - Add country-based filtering for employee benefits catalog queries
  - Refactor image handling to prioritize uploaded images consistently
  - Remove unnecessary console logs and enhance eligibility filter

#### Employee Profile
- **Profile Enhancements**
  - Add camera icon and edit button for profile picture feature
  - Update profile picture component and add translation keys
  - Change AppActionButton to AppAction with header variant in EmployeeDetails
  - Enhance employeeId retrieval logic for better data handling
  - Enhance employee ID retrieval by adding additional context data
  - Refactor employee ID retrieval for enhanced data handling
  - Fix employee record tabs to enhance feature flag handling
  - Update employee record to use services feature flag instead of preview
  - Simplify permission checks in HrAdminTab component logic

#### Absence Management
- **Absence Validation & Working Hours**
  - Enhance absence validation by adding holidays and region logic
  - Add working hours management to absence validation logic
  - Fix half day date handling in absence validation logic
  - Refactor absence entitlement retrieval and locale handling logic

### 2.2 MDM / Time Attendance

#### Increment Types System (NWHR-631)
- Add increment types version details
- Add overlap periods functionality
- Rebased with day types & created hook for overlap
- Added translations and fix validation issues
- Adjusted remove dialog
- Convert minutes to HH:mm format
- Fixed SonarQube issues

#### Intervention Management
- Enhance intervention display with badges and icons for reasons
- Add expandable feature to interventions table for user alerts

### 2.3 EveryAI & Platform

#### EveryBox (Task Hub) - Major Feature
- **Core Implementation**
  - Add Bank Manager Workplace dashboard with VIP customers and real CRM navigation
  - Implement Every API for unified task management
  - EveryBox with unified api (kogito + cflow tasks)
  - Correct cflow endpoint environment variable name
  
- **Task Card Enhancements**
  - Add creator avatar, name, and creation date/time to task cards
  - Fetch employee avatars via GraphQL and fix creator name extraction
  - Handle JSON-encoded pictureThumbnail field for avatar display
  - Use proper Avatar pattern with AvatarImage src undefined fallback
  - Query by userId for Kogito tasks, fallback to employeeId for CFlow
  - Batch fetch avatars in one request + show nodeName for Kogito tasks
  - Use referenceName for Kogito tasks (more descriptive with context)
  
- **UI/UX Improvements**
  - Enhance TaskCard layout and reduce padding
  - Remove eye icon and reduce card padding
  - Reduce card height with minimal padding
  - Put creator name and timestamp on one line to reduce height
  - Optimize collapsed card display with Blink icon support
  - Enhance AssigneeAvatar to utilize prefetched employee data
  - Update InboxView and TaskCard for improved layout and styling
  - Increase padding for inbox and outbox tabs in EveryBox component
  - Refactor InboxView to simplify loading skeleton and layout
  - Add clear search button to InboxView and OutboxView components
  
- **Completed Tasks Feature**
  - Add completed tasks view and functionality
  - Add completedAt field mapping and completion time display
  - Extract avatar utility functions to shared avatarUtils.ts
  - Support completion timestamp for both old and new completed tasks
  - Show completion time with green checkmark in task cards
  - Display completion date in task detail dialog with success styling
  - Add success message and fix icon conflict for completed tasks
  - Add success toast notification when completing a blink task
  - Add error toast notification for failed completion attempts
  - Change Completed tab icon from CheckCircle to CheckCheck (double checkmark)
  
- **Master-Detail Layout**
  - Implement master-detail layout and UI improvements for EveryBox
  - Implement smooth master-detail layout for Inbox and Outbox views
  - Improve detail dialog UX with compact metadata section
  - Add backend timeout protection for outbox flows API
  - Apply consistent master-detail pattern across all views
  - Convert OutFlows detail dialog to inline panel (consistent with InFlows)
  
- **Layout & Density Optimizations**
  - Optimize EveryBox layout and card density
  - Fix viewport to always fit screen without scrolling
  - Compact header design (smaller title, removed subtitle)
  - Force search input padding with inline styles to override platform CSS
  - Reduce FlowCard height by 30-40% for better density
  - Smaller font sizes, margins, and progress bars in flow cards
  - Reduced spacing between cards from 12px to 8px
  - Now fits 3-4 flow cards in view instead of 2
  - Remove bottom padding to utilize full available height
  
- **Data & Performance**
  - Keep FlowCard content visible when selected (badges, progress, dates)
  - Fix badge counts to show total API counts instead of paginated counts
  - Increase EveryBox width by 20% (1280px -> 1536px) for better space utilization
  - Optimize EveryBox with smart polling and accurate task counts
  - Implement smart background polling that checks for new tasks without disrupting UI
  - Fetch 4 batches upfront (400 tasks) for accurate count display instead of 200
  - Add non-disruptive notification banner when new tasks arrive
  - Reduce backend load by 95% (from 6,000 to ~300 records/hour)
  - Maintain 100% sorting accuracy with client-side merge and sort
  - Implement staggered polling intervals (15s/30s/60s for different data types)
  - Add user control to load new tasks via notification button
  - Fix scroll jumping issue during polling
  
- **Navigation & URL Support**
  - Add complete URL navigation support to EveryBox
  - Add view parameter for tab selection and flowId parameter for Outflows
  - Enable direct linking to Outflows tab and specific flows with bookmarkable URLs
  - Support browser back/forward navigation for both tabs and selected items
  
- **Special Components**
  - Add EveryBoxCard component for digital workplace integration
  - Add AbsenceApprovalDetails component with Kogito process integration
  - Improve UnifiedTaskService with better task handling
  - Add team absence calendar to task details with custom table-based implementation
  - Maximize vertical space with floating header and full-height layout
  - Optimize header alignment (title: 42px left, button: 46px right)
  - Remove task card spacing for compact view (py-0, space-y-0)
  - Hide source badges (Kogito/CFlow) for all tasks when detail view is open
  - Compact filter buttons to fit 4 tabs on single line on MacBook 14 inch
  - Adjust detail panel to 60% width for better content visibility
  - Add module badge and improve logging in TaskDetailDialog and TeamAbsenceCalendar
  
- **Service Configuration**
  - Update every-api service configurations
  - Update task adapter service
  - Update unified task service
  - Update CFlow and Kogito clients
  - Update middleware and config
  
- **Quick Tasks/Blinks Enhancements**
  - Add universal entity reference support to Quick Tasks/Blinks
  - Add SearchableEntityCombobox component for entity search and selection
  - Implement useUniversalEntitySearch hook for cross-entity GraphQL search
  - Support CRM (Lead, Contact, Account, Opportunity) entities
  - Support HR (Employee, Absence) entities
  - Support Finance (Expense Request, Expense Plan, Expense Item) entities
  - Support IRM/Investment (Account, Lead, Opportunity, Investment) entities
  - Store entity references in workflow tags (entityType, entityId, entityName, entityDisplayUrl)
  - Display clickable entity references in both inbox and outbox
  - Add avatar support for employees and other entities with images
  - Update recipient selector modal to match parent modal size
  - Fix entity URLs to use correct platform URL patterns
  - Add comprehensive documentation in ENTITY_REFERENCE_IMPLEMENTATION.md
  - Store entity references in both links and tags for blinks
  - Store entity references in links array for inbox (task details)
  - Store entity references in tags object for outbox (list API)
  - Fix file upload implementation using static FileClient import
  - Display entity references and documents in both inbox and outbox
  - Add compact styling to QuickTaskFileUpload component
  - Add file upload functionality for quick task attachments
  - Add hint for teammates in employee selection component
  
- **Task Form & Process Integration**
  - Refactor task filtering and sorting for improved readability
  - Add task inputs for remote screen loaders in TaskDetailDialog
  - Implement task list refresh on process completion events
  - Refactor position fields and enhance form data handling logic
  - Add Advance Payment Approval V2 component with approval logic
  - Add comment functionality for approval and rejection actions
  - Refactor fetchAdvancePaymentData to use useCallback and useRef

#### EveryAI
- **Voice Mode & Streaming**
  - Add voice speech mode integration to EveryAI
  - Enhance EveryAI voice mode with streaming audio
  - Make VoiceOverlay work in sidepanel with prominent exit button
  - Hide reminders button in speech mode
  - EveryAI voice mode improvements
  - Add voice mode form interaction support for EveryAI
  
- **UI/UX Enhancements**
  - Add fullscreen button for EveryAI sidepanel mode
  - Improve EveryAI input UX - move fullscreen to top-left, compact action menu
  - Redesign Flow Creator home screen with OpenAI-inspired UI
  
- **Page Analytics**
  - Add page analytics to EveryAI
  - Add investment page analytics to EveryAI
  - Integrate page analytics with EveryAI
  
- **Entity Search & Dynamic Forms**
  - Add CRM entity search support for EveryAI dynamic forms
  - Remove order_by from CRM entity search queries
  - Implement conditional field display logic in DynamicFormDisplay
  
- **Context & Content**
  - Add context for glue article
  - Backup EveryAI embedding for local CRM testing
  - Add SalesActivityDisplay component for EveryAI

#### Flow Engine & Remote Screens
- **Flow Creator**
  - Redesign Flow Creator home screen with OpenAI-inspired UI
  - Update flow engine API URL to use base URL for consistency
  - Refactor pipeline imports and enhance deletion functionality
  
- **Remote Screen Loader**
  - Refactor RemoteScreenLoader to use globalThis for token access
  - Enhance RemoteScreenLoader to handle token refresh events
  - Enhance RemoteScreenLoader with CDN versioning and error handling
  - Simplify error handling in RemoteScreenLoader component

#### Platform Enhancements
- **Sharing Functionality (Blink)**
  - Add share via blink functionality to CRM entity records
  - Improve share dialog UX with success state and search icon
  - Fix search input padding for magnifying glass icon
  - Use important modifier for search input padding like DebouncedInput
  - Use flex container with native input for reliable search icon placement
  - Add horizontal padding to show left border on search input
  - Add share via blink to CRM Campaign and IRM records
  - Added share functionality to CRM Campaign record
  - Added share functionality to IRM Opportunity, Lead, Account, Contact records
  - Added share functionality to Investment record
  - Uses reusable useShareAction hook from share-entity component
  - Share actions appear in Actions dropdown under 'Sharing' category
  - Add share via blink to Employee record
  - Added share button to employee profile communication buttons
  - Share button appears alongside Chat, Audio Call, and Video Call buttons
  - Refactor: move employee share to Actions dropdown in Summary tab
  - Added share via blink to AppActionMenu in SummaryTab
  - Share option appears under 'Sharing' category in Actions dropdown
  - Removed standalone share button from ProfileHeader
  - Consistent with other entity record pages
  - Fix: restore missing skillsContainerRef in ProfileHeader
  - Fix: correct employee record URL path for sharing
  - Integrate BlinkProvider for entity sharing functionality across components

#### Assets Management
- **Asset Management App**
  - Refactor asset components for improved clarity and performance

### 2.4 Chat

#### Responsive Redesign
- **Chat Responsive Redesign**
  - Responsive Chat redesign for sidepanel and full-screen modes
  - Fix: improve calendar and message input UX
  - Add org structure filtering and avatar improvements for chat
  - Update chat service configuration

#### Calendar & Meetings
- **Calendar/Scheduling Feature**
  - Add calendar/scheduling feature to chat app
  - Fix: use consistent time formatting to match calendar position
  - Fix: handle undefined participants array in meeting details
  - Show participant names and response status in meeting details
  - Fix: update current time indicator every minute in calendar views
  - Fix: use addParticipantIds for meeting updates
  - Calendar improvements and chat mobile fixes

#### Entity Mentions
- **@Mentions Support**
  - Add entity mentions with @ symbol to chat

#### Intranet Content
- **Content References**
  - Add intranet content references and refactor MessageItem in chat

### 2.5 CRM / IRM

#### Sales Activity & Analytics
- **Sales Activity 360 Dashboard**
  - Add Sales Activity 360 executive dashboard
  - Improve AI insights cards layout in Sales Activity 360
  - Add SalesActivityDisplay component for EveryAI
  
- **Performance Overview**
  - Enhance performance overview with dynamic header information
  - Sales Team Performance (merged feature)

#### Campaign Management
- **Campaign Actions & Navigation (CRM-76)**
  - Resolve campaign actions and navigation
  - Resolve for sonar
  - Add Sales Campaign Delete Popup component for campaign management
  - Add date formatting for campaign cells and improve debugging logs

#### Lead Management
- **Lead Features**
  - Add LeadDeletePopup component for lead deletion functionality
  - Refactor LeadDeletePopup to use common components and hooks
  - Add debug logging and refactor payload building in LeadConvertForm and TaskForm components
  - Refactor contact type icon and color logic using enums
  - Refactor contact type display using a new ContactTypeBadge component

#### Account & Contact Management
- **Account & Contact Views**
  - Enhance contact and account views by adding contact type handling and improving column configurations
  - Add contact type badge with tooltip to account and contact sections
  - Refine account view labels and add empty state components
  - Add PageLayout header like other CRM apps
  - Refactor Activities & Notes section for HomeView components

#### Opportunity Management
- **Opportunity Features**
  - Add OpportunityDetailSheet component for opportunity details display
  - Refactor: integrate translation support for opportunity detail elements
  - Refactor: add keyboard accessibility to opportunity detail buttons
  - Refactor: replace divs with buttons for better accessibility in OpportunityDetailSheet
  - Add currency filtering support in opportunity statistics display
  - Fix: improve opportunity loading handling in investment form component

#### Delete Functionality
- **Delete Popups**
  - Add CRM and IRM delete popups for accounts, contacts, and opportunities

#### IRM (Investment Relationship Management)
- **Investment Features**
  - Add crm_investment
  - Fix: recognize investment-record in page context
  - Fix: investment entity name bug
  - Refactor: remove ownerEmployee from form data to prevent ID mapping issues
  - IRM Investment Section bugfix
  - IRM Lead Convert bugs
  - IRM Address and Communication (merged feature)

#### Communication Channels
- **Channel Handling**
  - Refactor communication channel handling for dynamic rendering

### 2.6 Bug Fixes (Bugs found by QA during Testing)

#### Expense Management
- **Expense Request & Items**
  - Fix: filter expense request options based on backend preselection
  - Fix: allow update action for ASSIGNED status in expense item actions
  - Fix: enhance expense request query to support null currency values

#### Currency & Formatting
- **Currency Handling**
  - Refactor: update currency handling and improve URL management logic

#### Data Validation
- **Form Validation**
  - Fix: refactor half day date handling in absence validation logic

#### UI/UX Fixes
- **Search & Input**
  - Fix: update header translation key and adjust search input padding
  
#### SonarQube & Code Quality
- **SonarQube Fixes**
  - Fix: resolve SonarQube issues in salary review form
  - Remove unused validateEmployeeSalaryCurrencyConsistency function
  - Extract findActiveSalary utility and align date comparison logic
  - Fix linting issues: remove unused TaskPriority type, add eslint-disable block for inline styles
  - Applied multiple SonarQube suggestions to various components

#### Component Cleanup
- **Removed Components**
  - Remove TaskDetailDialog component and related functionality
  - Remove ApproveAdvancePaymentDetails component from the project
  - Remove EveryBox optimization implementation plan document
  - Remove obsolete AI Features Guide for Bank Manager Workplace
  - Remove EveryBoxCard component and update expense request types
  - Remove EveryBox component to streamline the application structure
  - Remove unused HR navigation mappings from the URL mapping object
  - Remove redundant null function from PositionFormFields component
  - Remove dev screen overrides functionality for cleaner codebase
  - Remove deprecated expense approval overrides and component file

#### Refactoring
- **Code Improvements**
  - Move EveryBox components to core directory for better structure
  - Refactor imports to use 'node:' prefix for clarity and consistency
  - Refactor import paths to use the common directory structure
  - Remove unnecessary barrel index files
  - Refactor date formatting to use a dedicated utility function
  - Refactor date formatting to improve code readability and consistency
  - Refactor URL parsing and improve error handling mechanisms
  - Refactor condition filtering and improve loading state handling
  - Refactor submit button text logic into a reusable function
  - Rename icons for better clarity and consistency in usage
  - Update @newwork/nw-design-system to version 0.46.0-457 and refactor LeadConvertForm

---

## 3. Technical Reference (Single Source of Truth)

### 3.1 Catalogs Used in This Release

**Deployment checks:**
- SalaryAdjustReason has entries
- EmployeeBonusType has entries
- Currency contains EUR & USD
- BenefitType has entries
- TimeTypes present
- Increment Types configured

### 3.2 Permission Matrix

| Permission Key | Type | Features Affected | User Roles |
|---------------|------|-------------------|------------|
| `employee-growth` | Action | Salary Adjustment, Bonus Granting | Manager (with permission) |
| `employee-record-all-hr-backoffice` | Access | Full HR Admin features, Benefits visibility | HR Admin |
| `hr-notes-scope` | Access | HR Notes section | HR Admin, Manager |

### 3.3 Permission Logic (Summary)

```javascript
// Compensation Tab Visibility
canViewCompensation =
  isSelfView
  || (isDirectManager && hasEmployeeGrowth)
  || hasHrBackoffice;

// Compensation Actions (Salary/Bonus)
canManageCompensation =
  !isSelfView
  && (
    (isDirectManager && hasEmployeeGrowth)
    || hasHrBackoffice
  );

// Benefits Visibility
showAllBenefits = hasHrBackoffice;
showFilteredBenefits = !hasHrBackoffice; // Excludes HR_BACKOFFICE group benefits
```

### 3.4. Backend Services & Dependencies

#### A. Services

| Service | Purpose | Used By |
|---------|---------|---------|
| Every API | Unified task management (Kogito + CFlow) | EveryBox |
| CFlow Service | Workflow task service | EveryBox, Quick Tasks |
| Kogito Service | Process task service | EveryBox, Absence Approvals |
| Flow Engine | Workflow creation and management | Flow Creator |
| Navigation Service | Resource URL management | Platform |
| Chat Service | Real-time messaging | Chat App |

#### B. Kogito Endpoints (Time/Increment Types)

- Time increment types management endpoints
- Overlap period validation endpoints
- Day types configuration endpoints

### 3.5 Data Model Changes

- **EmployeeSalary**: Base salary model updates, currency field relationship documentation
- **EmployeeBonus**: Payment date field added, currency field handling
- **TimeIncrement**: Version details, overlap periods
- **TaskAdapter**: completedAt field mapping
- **BenefitType**: Period input support
- **UnifiedTask**: Entity reference support in tags and links

---

## 4. Pre-Deployment Checklist

### 4.1 Feature Flags
- [ ] Set `preview.enabled = true`
- [ ] Set `dev.enabled = false`
- [ ] Set `dev.employee-record.changelog.enabled = false`
- [ ] Set `services.enabled = true`
- [ ] Set `everyai.enabled = true`
- [ ] Set `flow.creator.enabled = true`
- [ ] Set `assets.enabled = true`

### 4.2 Catalogs
- [ ] Verify SalaryAdjustReason has entries
- [ ] Verify EmployeeBonusType has entries
- [ ] Verify Currency contains EUR & USD
- [ ] Verify BenefitType has entries
- [ ] Verify TimeTypes are present
- [ ] Verify Increment Types are configured

### 4.3 Permissions
- [ ] Configure `employee-growth` action permission
- [ ] Configure `employee-record-all-hr-backoffice` access permission
- [ ] Configure `hr-notes-scope` access permission

### 4.4 Backend
- [ ] Deploy Every API service
- [ ] Deploy CFlow service updates
- [ ] Deploy Kogito service updates
- [ ] Deploy Flow Engine updates
- [ ] Import Navigation Service to staging
- [ ] Deploy Chat Service updates

### 4.5 Database
- [ ] Run EmployeeSalary model migrations
- [ ] Run EmployeeBonus model migrations
- [ ] Run TimeIncrement model migrations
- [ ] Verify catalog entries are populated

---

## 5. Testing Matrix

### 5.1 HR / Compensation Features
- [ ] Test Salary Assignment for new employees
- [ ] Test Salary Review Modal workflow
- [ ] Test Bonus Granting Modal
- [ ] Test Bonus Acknowledgment
- [ ] Test Base Salary display and calculations
- [ ] Test Time Tracking History tab
- [ ] Test Absence validation with holidays and regions
- [ ] Test Benefits filtering by country
- [ ] Test Employee profile picture upload

### 5.2 MDM / Time Attendance Features
- [ ] Test Increment Types system
- [ ] Test Overlap periods validation
- [ ] Test Time tracking with geolocation
- [ ] Test Intervention display and expandable rows

### 5.3 Every AI & Platform Features
- [ ] Test EveryBox task display (Kogito + CFlow)
- [ ] Test Task completion workflow
- [ ] Test Master-detail layout
- [ ] Test Smart polling and task counts
- [ ] Test URL navigation and bookmarking
- [ ] Test Entity reference in Quick Tasks
- [ ] Test File upload in blinks
- [ ] Test Voice mode in EveryAI
- [ ] Test Fullscreen mode
- [ ] Test Page analytics
- [ ] Test Flow Creator redesign
- [ ] Test Sharing via Blink across entities

### 5.4 Chat Features
- [ ] Test Responsive design (sidepanel and fullscreen)
- [ ] Test Calendar and meetings
- [ ] Test Entity mentions (@mentions)
- [ ] Test Org structure search
- [ ] Test Participant display

### 5.5 CRM / IRM Features
- [ ] Test Sales Activity 360 dashboard
- [ ] Test Campaign management and deletion
- [ ] Test Lead conversion and deletion
- [ ] Test Opportunity detail sheet
- [ ] Test Account and Contact views
- [ ] Test Investment management
- [ ] Test Communication channels
- [ ] Test Contact type badges

---

## 6. Rollback Strategy

### 6.1 Quick Rollback via Flags
If critical issues arise:
1. Set `preview.enabled = false` to disable EveryBox, Chat, and Blink features
2. Set `services.enabled = false` to hide Services tab
3. Set `everyai.enabled = false` to disable voice AI
4. Set `flow.creator.enabled = false` to revert Flow Creator
5. Set `assets.enabled = false` to hide Assets management

### 6.2 Code-Level Rollback
If feature flags are insufficient:
1. Identify the last stable commit before PR #1118
2. Create a revert PR targeting the problematic commits
3. Follow emergency deployment process
4. Notify all stakeholders

---

## 7. Stakeholder Communication

**Pre-Deployment:**
- [ ] Notify QA team of deployment schedule
- [ ] Notify Product Owners of new features
- [ ] Notify DevOps of infrastructure requirements
- [ ] Notify Backend team of service dependencies

**Post-Deployment:**
- [ ] Confirm successful deployment to QA
- [ ] Share test credentials and feature flag status
- [ ] Provide release notes to Product team
- [ ] Schedule demo session for new features

---

## 8. Release Sign-off

**Development Lead:** _____________________ Date: _______

**QA Lead:** _____________________ Date: _______

**Product Owner:** _____________________ Date: _______

**DevOps Lead:** _____________________ Date: _______

---

## Notes

- This release contains 878 files changed and 150+ commits
- Major features: EveryBox (Task Hub), Voice AI, Chat Redesign, Salary Management
- Multiple performance optimizations and code quality improvements
- Extensive refactoring for better maintainability
- Focus on user experience improvements across all modules
