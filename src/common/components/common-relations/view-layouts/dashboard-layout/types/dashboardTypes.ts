// Core types used across dashboard views

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface PipelineInfo {
  id: string
  name: string
  ref: string
  description?: string
  color?: string
}
