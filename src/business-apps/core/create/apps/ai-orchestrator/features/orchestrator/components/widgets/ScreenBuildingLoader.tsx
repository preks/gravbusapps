/**
 * ScreenBuildingLoader - Dashboard-style skeleton loader
 *
 * Clean skeleton interface that previews what the screen will look like.
 */

import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'

export interface ScreenBuildingLoaderProps {
  message?: string
  className?: string
}

export const ScreenBuildingLoader: React.FC<ScreenBuildingLoaderProps> = ({ message, className }) => {
  return (
    <div className={`gba:w-full gba:h-full gba:p-8 gba:space-y-8 ${className || ''}`}>
      {/* Header Section */}
      <div className="gba:space-y-4">
        <Skeleton className="gba:h-10 gba:w-80" />
        <Skeleton className="gba:h-5 gba:w-[500px]" />
      </div>

      {/* Stats Cards Row */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-6">
        {['skeleton-card-1', 'skeleton-card-2', 'skeleton-card-3', 'skeleton-card-4'].map(key => (
          <div key={key} className="gba:border gba:border-border gba:rounded-lg gba:p-6 gba:space-y-4">
            <Skeleton className="gba:h-5 gba:w-24" />
            <Skeleton className="gba:h-10 gba:w-32" />
            <Skeleton className="gba:h-4 gba:w-40" />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-8 gba:flex-1">
        {/* Left Column - Large Chart/Graph */}
        <div className="gba:col-span-2 gba:border gba:border-border gba:rounded-lg gba:p-8 gba:space-y-6 gba:bg-card">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Skeleton className="gba:h-7 gba:w-48" />
            <Skeleton className="gba:h-9 gba:w-32" />
          </div>
          <div className="gba:bg-muted/20 gba:rounded-md gba:p-4">
            <Skeleton className="gba:h-72 gba:w-full gba:bg-muted/40" />
          </div>
        </div>

        {/* Right Column - Activity List */}
        <div className="gba:border gba:border-border gba:rounded-lg gba:p-6 gba:space-y-6">
          <Skeleton className="gba:h-7 gba:w-40" />
          <div className="gba:space-y-4">
            {[
              'skeleton-activity-1',
              'skeleton-activity-2',
              'skeleton-activity-3',
              'skeleton-activity-4',
              'skeleton-activity-5',
              'skeleton-activity-6',
              'skeleton-activity-7'
            ].map(key => (
              <div key={key} className="gba:flex gba:items-center gba:gap-4">
                <Skeleton className="gba:h-12 gba:w-12 gba:rounded-full gba:shrink-0" />
                <div className="gba:flex-1 gba:space-y-2">
                  <Skeleton className="gba:h-4 gba:w-full" />
                  <Skeleton className="gba:h-3 gba:w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Optional Loading Message */}
      {message && (
        <div className="gba:text-center gba:pt-6">
          <p className="gba:text-sm gba:text-muted-foreground gba:animate-pulse">{message}</p>
        </div>
      )}
    </div>
  )
}

export default ScreenBuildingLoader
