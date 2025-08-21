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
  <div
    className="gba:flex gba:flex-wrap gba:gap-2"
    data-testid="absence-type-filter"
  >
    {filterOptions.map((filter) => (
      <Button
        key={filter}
        variant={activeFilter === filter ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange(filter)}
        data-testid="absence-type-filter-button"
        className="gba:transition-all gba:duration-200"
      >
        {filter}
      </Button>
    ))}
  </div>
);

export default AbsenceTypeFilter;
