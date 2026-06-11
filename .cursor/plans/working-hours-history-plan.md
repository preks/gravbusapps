---
name: working-hours-history-plan
overview: >
  Stop assuming workingHours[0] is the active record.
  Each employee will have multiple EmployeeWorkingHours entries, each with a
  non-overlapping activeFrom / activeTo date range (null activeTo = open-ended).
  Steps mirror what was done for workingCondition history.
  Work on one step at a time; do not start the next until the previous is merged/verified.
todos:
  - id: step-1-form
    content: 'Step 1 — Fix the change-working-hours form'
    status: completed
  - id: step-2-employee-record-display
    content: 'Step 2 — Display active working hours on Employee Record tabs'
    status: completed
  - id: step-3-my-time
    content: 'Step 3 — Fix My Time (useEmployeeWorkingHours + all consumer components)'
    status: completed
  - id: step-4-absence-correction-forms
    content: 'Step 4 — Fix absence and correction forms'
    status: pending
  - id: step-5-weekly-schedule-hooks
    content: 'Step 5 — Fix weekly schedule hooks'
    status: pending
  - id: step-6-team-manager-views
    content: 'Step 6 — Fix team / manager views'
    status: pending
  - id: step-7-payroll-compensation-absences
    content: 'Step 7 — Fix payroll, compensation planning, and absences insights'
    status: pending
  - id: step-8-admin-quality
    content: 'Step 8 — Fix HR Admin Cockpit data-quality checks'
    status: pending
  - id: step-9-mdm-project
    content: 'Step 9 — Fix MDM project management allocation'
    status: pending
isProject: true
---

# Working Hours History — Implementation Plan

## Selection Rule

Apply the same rule as for working conditions:

- If there is only one `workingHours` entry, treat it as active (legacy data).
- If there are multiple entries, use the one where the target date falls within `[activeFrom, activeTo]`, inclusive.
- `activeTo = null` means open-ended (still active).
- Never assume `workingHours[0]` is the active entry unless the query explicitly guarantees order and filtering with `limit: 1`.
- For time-period reports, payroll, and analytics, the target date must be agreed before changing behaviour (same as the "hard" category in working-condition checklist).

---

## Step 1 — Fix the change-working-hours form

This is the primary source-of-truth form, the direct analogue of `update-working-conditions`.

### What needs to change

- **Query** (`ChangeWorkingHoursQueries.ts`)
  - Add `activeFrom`, `activeTo` fields to the `workingHours` selection.
  - Remove `limit: 1` / implicit first-only assumption; fetch all non-deleted records with `orderBy: [{activeFrom: DESC}, {createdAt: DESC}]`.
  - Add a `workingHoursValidationRecords` alias that fetches only `id`, `version`, `activeFrom`, `activeTo` (used for overlap validation, mirrors `workingConditionValidationRecords`).

- **Context** (`ChangeWorkingHoursContext.tsx`)
  - Add `changeMode: 'INSERT' | 'UPDATE'` (read from `additionalData` / `externalContextData` / task payload, same extraction pattern as working conditions).
  - Add `getCurrentWorkingHours(records, today, workingHoursId?, changeMode?)` helper — same logic as `getCurrentWorkingCondition`.
  - Add `workingHoursValidationRecords` state.
  - Replace `res?.employee?.[0]?.workingHours?.[0]` with the helper result.
  - Expose `workingHoursValidationRecords` and `changeMode` from context.
  - Update `buildSubmitPayload` to include `activeFrom`, `activeTo`, `changeMode`, and the open-ended record to close (same as working conditions).

- **Constants** (`changeWorkingHoursConstants.ts`)
  - Add `activeFrom?: string` and `activeTo?: string` to `WorkingHoursFormValues`.

- **Form component** (`ChangeWorkingHoursForm.tsx`)
  - Add **Effective Start Date** (`activeFrom`) — required field.
  - Add **Effective End Date** (`activeTo`) — optional field.
  - Add overlap validation (same pattern as `getActivePeriodOverlapErrors` in working conditions screen).
  - Show a validation error if end date is before start date.

- **Screen** (`ChangeWorkingHours.tsx`)
  - Pass `changeMode` through context / props if not already done.

### Files to edit

| File                                                                                            | Change                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/business-apps/hr/core/forms/change-working-hours/ChangeWorkingHoursQueries.ts`             | Fetch all records + validationRecords alias                       |
| `src/business-apps/hr/core/forms/change-working-hours/context/ChangeWorkingHoursContext.tsx`    | Active selection, changeMode, validation records, updated payload |
| `src/business-apps/hr/core/forms/change-working-hours/constants/changeWorkingHoursConstants.ts` | Add activeFrom / activeTo to form types                           |
| `src/business-apps/hr/core/forms/change-working-hours/components/ChangeWorkingHoursForm.tsx`    | Date inputs + overlap validation                                  |
| `src/business-apps/hr/core/forms/change-working-hours/ChangeWorkingHours.tsx`                   | Pass changeMode if needed                                         |

---

## Step 2 — Display active working hours on Employee Record tabs

The central employee-record fetch (`useEmployeeData.ts`) includes `workingHours` with `activeFrom` / `activeTo`.
Employee Record tabs use the active working-hours record instead of blindly using `workingHours?.[0]`.

- Manually verified: `EmploymentTab.tsx` displays the working-hours entries correctly.
- Manually verified: Employee Record `TimeTrackingTab.tsx` displays working hours correctly.

### What needs to change

- **Query** (`useEmployeeData.ts`)
  - Add `activeFrom`, `activeTo` fields to the `workingHours` selection inside the main employee query.
  - Add `orderBy: [{activeFrom: DESC}, {createdAt: DESC}]` to the `workingHours` nested query.

- **Shared helper**
  - Create `getActiveWorkingHours(records, today)` in a shared utils location (e.g. `src/business-apps/hr/core/utils/workingHoursUtils.ts`), following the same pattern as `getActiveWorkingCondition`.

- **Consumer tabs** — replace `workingHours?.[0]` with `getActiveWorkingHours(workingHours, today)`
  - `EmploymentTab.tsx`
  - `SummaryTab.tsx`
  - `TimeTrackingTab.tsx`
  - `MonthlySummary.tsx`
  - `hooks/useTimeTrackingData.ts` selects the applicable working-hours record per calculation date.

### Files to edit

| File                                                                                           | Change                                                      |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData.ts`                      | Add activeFrom/activeTo + orderBy to workingHours selection |
| `src/business-apps/hr/core/utils/workingHoursUtils.ts`                                         | New shared helper `getActiveWorkingHours`                   |
| `src/business-apps/hr/core/apps/employee-record/components/tabs/EmploymentTab.tsx`             | Use helper instead of [0]                                   |
| `src/business-apps/hr/core/apps/employee-record/components/tabs/SummaryTab.tsx`                | Use helper instead of [0]                                   |
| `src/business-apps/hr/core/apps/employee-record/components/tabs/TimeTrackingTab.tsx`           | Use helper instead of [0]                                   |
| `src/business-apps/hr/core/apps/employee-record/components/tabs/components/MonthlySummary.tsx` | Use helper instead of [0]                                   |
| `src/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData.ts`  | Use helper instead of [0]                                   |

---

## Step 3 — Fix My Time

`useEmployeeWorkingHours` is the single hook that feeds all My Time components.
Fixing it here cascades to most consumers automatically. `MyTime.tsx` and `TimeTracking.tsx`
also pass active/full working-hours data to shared history/intervention components.

Status: completed.

- Manually verified: My Time displays working-hours based planned values correctly.

### What needs to change

- **`useEmployeeWorkingHours.ts`**
  - Accept `workingHours[]` (array) instead of a single entry.
  - Apply `getActiveWorkingHours(records, today)` internally.

- **`TimeTracking.tsx`**
  - Keep using `useEmployeeWorkingHours(employee)` for components that expect a single active schedule (`HeroClockCard`, `ThisWeekCard`, `InterventionsTable`).
  - Pass the full `employee?.workingHours` array into `useTimeTrackingData` so monthly/history calculations select the applicable record per date.
  - Replace the direct `employee?.workingHours?.[0]` passed to `InterventionsTable`.

- **`DailyLog.tsx`**
  - Pass the full `employee?.workingHours` array into `useTimeTrackingData`.

- **`TimeHistory.tsx`**
  - Allow `workingHours` to be either a single schedule or the full schedule array, matching `useTimeTrackingData`.

- **`MyTime.tsx`**
  - Select the active working-hours record once for shared components that expect a single schedule.
  - Pass the active record to `InterventionsTable`.
  - Pass the full `employee?.workingHours` array to `TimeHistory`.

### Files to edit

| File                                                                      | Change                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/business-apps/hr/core/apps/my-time/utils/useEmployeeWorkingHours.ts` | Accept array, apply active selection                     |
| `src/business-apps/hr/core/apps/my-time/components/TimeTracking.tsx`      | Pass full history to `useTimeTrackingData`; remove `[0]` |
| `src/business-apps/hr/core/apps/my-time/components/DailyLog.tsx`          | Pass full history to `useTimeTrackingData`               |
| `src/business-apps/hr/core/apps/my-time/components/TimeHistory.tsx`       | Accept single schedule or schedule array                 |
| `src/business-apps/hr/core/apps/my-time/MyTime.tsx`                       | Replace direct `[0]` usage                               |

> `HeroClockCard.tsx`, `ThisWeekCard.tsx`, and `exportTimeHistoryPdf.ts` needed no direct changes.

---

## Step 4 — Fix absence and correction forms

These forms do their own fetches and then take `[0]`.

### Files to edit

| File                                                                                        | Change                                                                |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/business-apps/hr/core/forms/create-new-absence/hooks/useAbsenceValidation.ts`          | After fetch, apply `getActiveWorkingHours` instead of `[0]`           |
| `src/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences.ts`         | Add `activeFrom`, `activeTo` to `workingHours` selection; add orderBy |
| `src/business-apps/hr/core/forms/create-request-correction/CreateRequestCorrectionForm.tsx` | After fetch, apply `getActiveWorkingHours` instead of `[0]`           |

---

## Step 5 — Fix weekly schedule hooks

These do their own fetches. `GET_EMPLOYEE_WEEKLY_SCHEDULE` already uses `limit: 1` + `orderBy: activeFrom DESC` which is safe for now but does not yet expose `activeFrom` / `activeTo` to callers.

### Files to edit

| File                                                                                 | Change                                                                                        |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/business-apps/hr/core/apps/employee-record/queries/queries.ts`                  | Verify `GET_EMPLOYEE_WEEKLY_SCHEDULE` still correct; add `activeFrom`/`activeTo` to selection |
| `src/business-apps/hr/core/apps/employee-record/hooks/useEmployeeWeeklySchedule.ts`  | Already uses `[0]` after `limit: 1` — confirm still safe or switch to helper                  |
| `src/business-apps/hr/core/apps/employee-record/hooks/useEmployeeTeamAllocations.ts` | Add `activeFrom`/`activeTo` + orderBy to inline query; apply helper                           |

---

## Step 6 — Fix team / manager views

### Files to edit

| File                                                                                       | Change                                                                        |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `src/business-apps/hr/core/apps/my-team-time/queries/queries.ts`                           | Add `activeFrom`/`activeTo` + orderBy to `workingHours` in `GET_TEAM_MEMBERS` |
| `src/business-apps/hr/core/apps/my-team-time/hooks/useTeamMembers.ts`                      | Replace `workingHours[0]` with `getActiveWorkingHours`                        |
| `src/business-apps/hr/compensation/apps/manager-planning/hooks/useTeamCompensationData.ts` | Replace `workingHours?.[0]` with `getActiveWorkingHours`                      |

---

## Step 7 — Fix payroll, compensation planning, and absences insights

These need a team decision on the **target date** (payroll month vs today) before changing behaviour.
Do not implement until the target date semantics are agreed.

### Files to discuss / edit

| File                                                                                                   | Decision needed                                                           | Change after decision                               |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `src/business-apps/hr/payroll/apps/payroll-preparation/queries/payrollQueries.ts`                      | Use payroll-month midpoint as target date?                                | Add activeFrom/activeTo; apply date-range selection |
| `src/business-apps/hr/payroll/apps/payroll-preparation/hooks/usePayrollEmployees.ts`                   | Same                                                                      | Replace `[0]` with period-aware helper              |
| `src/business-apps/hr/absences/apps/time-absence-hub/queries/OrgAttendanceQueries.ts`                  | Already uses `limit: 1` + orderBy updatedAt — correct?                    | Confirm or switch to activeFrom ordering            |
| `src/business-apps/hr/absences/apps/time-absence-hub/utils/insightsAggregation.ts`                     | Target date = report period start?                                        | Replace `[0]` with helper                           |
| `src/business-apps/hr/absences/apps/time-absence-hub/components/views/attendance/attendanceMetrics.ts` | Same                                                                      | Replace `[0]` with helper                           |
| `src/business-apps/hr/compensation/queries/compensationPlanningQueries.ts`                             | Already uses `limit: 1` + orderBy activeFrom DESC — confirm still correct | Possibly keep or switch                             |

---

## Step 8 — Fix HR Admin Cockpit data-quality checks

`dataQualityCompute.ts` uses `emp.workingHours[0]` (no optional chaining, no active selection).

### Files to edit

| File                                                                             | Change                                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/business-apps/hr/core/apps/hr-admin-cockpit/services/dataQualityQueries.ts` | Add `activeFrom`/`activeTo` to working hours selection                        |
| `src/business-apps/hr/core/apps/hr-admin-cockpit/services/dataQualityCompute.ts` | Replace `workingHours[0]` with `getActiveWorkingHours`; add optional chaining |

---

## Step 9 — Fix MDM project management allocation

These use both a GraphQL fetch and a REST write (`POST /updateEmployeeWorkingHours`).
The REST write is a process trigger and likely does not need a date range on its payload unless the backend process requires it — confirm with backend first.

### Files to edit

| File                                                                                                                 | Change                                                                                |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/business-apps/mdm/apps/project-management/hooks/useTeamAssignments.ts`                                          | Replace `workingHours?.[0]` with `getActiveWorkingHours`                              |
| `src/business-apps/core/every-platform/apps/manager-dashboard/components/views/project-view/AssignProjectDialog.tsx` | Add orderBy to inline query; replace `EmployeeWorkingHours[0]` with index-safe access |
| `src/business-apps/mdm/forms/employee-allocation-form/EmployeeAllocationForm.tsx`                                    | Confirm REST payload does not need activeFrom/activeTo or add if required             |
