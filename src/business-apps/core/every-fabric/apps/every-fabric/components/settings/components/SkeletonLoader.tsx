import React from 'react'

export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`gba:animate-pulse gba:bg-muted/40 gba:rounded ${className}`} style={{ animationDuration: '1.5s' }} />
)

export const MemoryItemSkeleton: React.FC = () => (
  <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
      <div className="gba:flex-1 gba:space-y-2">
        <SkeletonPulse className="gba:h-4 gba:w-32" />
        <SkeletonPulse className="gba:h-3 gba:w-full" />
        <SkeletonPulse className="gba:h-3 gba:w-3/4" />
      </div>
      <SkeletonPulse className="gba:h-7 gba:w-7 gba:rounded-full gba:shrink-0" />
    </div>
  </div>
)

export const SkillItemSkeleton: React.FC = () => (
  <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
    <div className="gba:flex gba:items-start gba:gap-3">
      <SkeletonPulse className="gba:h-5 gba:w-5 gba:rounded gba:shrink-0" />
      <div className="gba:flex-1 gba:space-y-2">
        <SkeletonPulse className="gba:h-4 gba:w-40" />
        <SkeletonPulse className="gba:h-3 gba:w-full" />
        <SkeletonPulse className="gba:h-3 gba:w-4/5" />
        <div className="gba:flex gba:gap-2 gba:mt-2">
          <SkeletonPulse className="gba:h-5 gba:w-16 gba:rounded-full" />
          <SkeletonPulse className="gba:h-3 gba:w-20 gba:self-center" />
        </div>
      </div>
      <div className="gba:flex gba:gap-1">
        <SkeletonPulse className="gba:h-7 gba:w-7 gba:rounded-full" />
        <SkeletonPulse className="gba:h-7 gba:w-7 gba:rounded-full" />
        <SkeletonPulse className="gba:h-7 gba:w-7 gba:rounded-full" />
      </div>
    </div>
  </div>
)

export const MetricCardSkeleton: React.FC = () => (
  <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
    <SkeletonPulse className="gba:h-3 gba:w-20 gba:mb-1.5" />
    <SkeletonPulse className="gba:h-6 gba:w-16" />
  </div>
)

export const MemoryListSkeleton: React.FC = () => (
  <div className="gba:space-y-1.5">
    <MemoryItemSkeleton />
    <MemoryItemSkeleton />
    <MemoryItemSkeleton />
  </div>
)

export const SkillsListSkeleton: React.FC = () => (
  <div className="gba:space-y-1.5">
    <SkillItemSkeleton />
    <SkillItemSkeleton />
    <SkillItemSkeleton />
    <SkillItemSkeleton />
  </div>
)

export const MetricsGridSkeleton: React.FC = () => (
  <>
    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mb-2.5 sm:gba:mb-3">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>
    <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
      <SkeletonPulse className="gba:h-3 gba:w-24 gba:mb-2" />
      <div className="gba:flex gba:gap-2">
        <SkeletonPulse className="gba:h-6 gba:w-24 gba:rounded-full" />
        <SkeletonPulse className="gba:h-6 gba:w-20 gba:rounded-full" />
      </div>
    </div>
  </>
)
