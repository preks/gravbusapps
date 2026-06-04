import React from 'react'

interface Customer360MetricProps {
  label: string
  testId: string
  children: React.ReactNode
}

/** Small bordered metric tile used by the scoring and finance summaries. */
const Customer360Metric: React.FC<Customer360MetricProps> = ({ label, testId, children }) => (
  <div
    className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:border gba:border-border gba:p-4"
    data-testid={testId}
  >
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
    <span className="gba:text-2xl gba:font-semibold gba:text-foreground">{children}</span>
  </div>
)

export default Customer360Metric
export { Customer360Metric }
