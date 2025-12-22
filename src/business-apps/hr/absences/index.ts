import ManagerAbsences from './apps/manager-absences/ManagerAbsences'
import { KPISectionModern as KPISection } from './apps/manager-absences/components/KPISection'

// Re-export as named exports
export { ManagerAbsences, KPISection }

// Default export for wrapper compatibility
export default {
  ManagerAbsences,
  KPISection
}
