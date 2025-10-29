import React from 'react'

interface NavigationTagProps {
  label: string
  selected: boolean
  onClick: () => void
  className?: string
}

const NavigationTag: React.FC<NavigationTagProps> = ({ label, selected, onClick, className }) => {
  // Keep original case for tests, but replace spaces with underscores
  const tagId = label.replace(/\s+/g, '_')
  const testId = `content-nav-tag-${tagId}`

  return (
    <div
      onClick={onClick}
      data-testid={testId}
      data-checked={selected.toString()}
      className={`gba:cursor-pointer gba:px-5 gba:py-3 gba:text-base gba:font-light gba:md:text-lg gba:transition-all gba:duration-200 ${
        selected
          ? 'gba:bg-transparent gba:text-foreground gba:border-b-2 gba:border-foreground gba:shadow-sm'
          : 'gba:bg-transparent gba:text-muted-foreground gba:border-b-2 gba:border-transparent gba:hover:text-foreground'
      } ${className ?? ''}`}
    >
      <span className="gba:uppercase">{label}</span>
    </div>
  )
}

export default NavigationTag
