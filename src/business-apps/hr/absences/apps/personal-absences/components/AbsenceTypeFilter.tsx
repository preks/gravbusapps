import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface AbsenceTypeFilterProps {
  filterOptions: string[]
  activeFilter: string
  onFilterChange: (filter: string) => void
}

const AbsenceTypeFilter: React.FC<AbsenceTypeFilterProps> = ({ filterOptions, activeFilter, onFilterChange }) => (
  <>
    <style>
      {`
        .gba\\:filter-active[data-active="true"] {
          background-color: var(--nw-foreground) !important;
          border-color: var(--nw-foreground) !important;
          color: var(--nw-background) !important;
          font-weight: 500 !important;
        }
        
        .gba\\:filter-active[data-active="true"]:hover {
          background-color: var(--nw-muted-foreground) !important;
          border-color: var(--nw-muted-foreground) !important;
          color: var(--nw-background) !important;
        }
        
        .gba\\:filter-inactive[data-active="false"] {
          background-color: var(--nw-background) !important;
          border-color: var(--nw-border) !important;
          color: var(--nw-foreground) !important;
        }
        
        .gba\\:filter-inactive[data-active="false"]:hover {
          background-color: var(--nw-muted) !important;
          border-color: var(--nw-muted-foreground) !important;
        }
      `}
    </style>
    <div className="gba:absenceListFilters gba:flex gba:gap-2" data-testid="absence-type-filter">
      {filterOptions.map(filter => (
        <Button
          key={filter}
          variant="outline"
          className={`gba:filterButton ${activeFilter === filter ? 'gba:filter-active' : 'gba:filter-inactive'}`}
          data-active={activeFilter === filter}
          onClick={() => onFilterChange(filter)}
          data-testid="absence-type-filter-button"
        >
          {filter}
        </Button>
      ))}
    </div>
  </>
)

export default AbsenceTypeFilter
