import AbsenceOverview from "@/components/absence-overview"
import KpiSection from "@/components/kpi-section"

export default function AbsenceManagementHub() {
  return (
    <div className="p-3 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <AbsenceOverview />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiSection />
      </div>
    </div>
  )
}
