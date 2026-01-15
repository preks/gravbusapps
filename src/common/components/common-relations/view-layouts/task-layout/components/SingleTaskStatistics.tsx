import React from 'react'
import { TaskStatisticsCard, TaskStatisticsCardProps } from './TaskStatisticsCard'

export type SingleTaskStatisticsProps = TaskStatisticsCardProps

/**
 * Single Task Statistics Component
 * Wrapper around TaskStatisticsCard for backward compatibility
 * Used for Team Tasks view (replacing the dual-card TaskStatisticsLayout)
 */
export const SingleTaskStatistics: React.FC<SingleTaskStatisticsProps> = props => {
  return <TaskStatisticsCard {...props} />
}

export default SingleTaskStatistics
