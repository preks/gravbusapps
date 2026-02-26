/**
 * Row shape for the personal absences list (from GET_EMPLOYEE_ABSENCES).
 */
export interface AbsenceRow {
  id: string
  type: string
  typeColor: string
  typeParentEntryId: string
  startDate: string
  endDate: string
  status: string
  originalStatus: string
  workingDays: number
  description: string
  createdAt: string
}
