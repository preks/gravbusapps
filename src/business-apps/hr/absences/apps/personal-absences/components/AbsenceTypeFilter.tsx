import React from "react";
import { Button } from "@newwork/nw-design-system";

interface AbsenceTypeFilterProps {
  filterOptions: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const AbsenceTypeFilter: React.FC<AbsenceTypeFilterProps> = ({
  filterOptions,
  activeFilter,
  onFilterChange,
}) => (
  <>
    <style>
      {`
        .gba\\:filter-active[data-active="true"] {
          background-color: #000000 !important;
          border-color: #000000 !important;
          color: white !important;
          font-weight: 500 !important;
        }
        
        .gba\\:filter-active[data-active="true"]:hover {
          background-color: #333333 !important;
          border-color: #333333 !important;
          color: white !important;
        }
        
        .gba\\:filter-inactive[data-active="false"] {
          background-color: white !important;
          border-color: #d1d5db !important;
          color: #374151 !important;
        }
        
        .gba\\:filter-inactive[data-active="false"]:hover {
          background-color: #f9fafb !important;
          border-color: #9ca3af !important;
        }
      `}
    </style>
    <div
      className="gba:absenceListFilters gba:flex gba:gap-2"
      data-testid="absence-type-filter"
    >
      {filterOptions.map((filter) => (
        <Button
          key={filter}
          variant="outline"
          className={`gba:filterButton ${
            activeFilter === filter
              ? "gba:filter-active"
              : "gba:filter-inactive"
          }`}
          data-active={activeFilter === filter}
          onClick={() => onFilterChange(filter)}
          data-testid="absence-type-filter-button"
        >
          {filter}
        </Button>
      ))}
    </div>
  </>
);

export default AbsenceTypeFilter;
