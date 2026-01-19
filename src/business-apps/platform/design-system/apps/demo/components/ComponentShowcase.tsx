import React from 'react'

interface ComponentShowcaseProps {
  title: string
  description: string
  children: React.ReactNode
}

/**
 * Reusable wrapper component for showcasing design system components
 */
export function ComponentShowcase({ title, description, children }: ComponentShowcaseProps) {
  return (
    <div className="gba:space-y-4" data-testid={`showcase-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div>
        <h3 className="gba:text-lg gba:font-medium gba:mb-2">{title}</h3>
        <p className="gba:text-muted-foreground gba:mb-4">{description}</p>
      </div>
      {children}
    </div>
  )
}

export default ComponentShowcase
