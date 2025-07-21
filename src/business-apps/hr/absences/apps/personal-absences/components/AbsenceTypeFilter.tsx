import React from "react";
import { Button } from "antd";

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
  <div className="gba:absenceListFilters" data-testid="absence-type-filter">

    {filterOptions.map((filter) => (
      <Button
        key={filter}
        type={activeFilter === filter ? "primary" : "default"}
        className="gba:filterButton"
        onClick={() => onFilterChange(filter)}
        data-testid="absence-type-filter-button"
      >
        {filter}
      </Button>
    ))}
  </div>
);

export default AbsenceTypeFilter;
