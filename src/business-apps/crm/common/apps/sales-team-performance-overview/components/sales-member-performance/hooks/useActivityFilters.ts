import { useState, useMemo, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface FilterGroup {
  id: string;
  title: string;
  filters: Array<{
    id: string;
    label: string;
    value: string;
    selected: boolean;
  }>;
}

export interface ActivityFilters {
  selectedFilters: string[];
  filterGroups: FilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  clearAllFilters: () => void;
  getFilters: () => any;
}

const ACTIVITY_TYPE_OPTIONS = [
  { id: "call", label: "Call", value: "Call" },
  { id: "email", label: "Email", value: "Email" },
  { id: "meeting", label: "Meeting", value: "Meeting" },
  { id: "task", label: "Task", value: "Task" },
];

export const useActivityFilters = (
  _context: BusinessAppContextProps
): ActivityFilters => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "activityType",
        title: "Activity Type",
        filters: ACTIVITY_TYPE_OPTIONS.map((option) => ({
          ...option,
          selected: selectedFilters.includes(option.id),
        })),
      },
    ],
    [selectedFilters]
  );

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach((group) => {
      group.filters.forEach((filter) => {
        map[filter.id] = filter.label;
      });
    });
    return map;
  }, [filterGroups]);

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId) ? prev : [...prev, filterId]
    );
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) => prev.filter((id) => id !== filterId));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  // Add getFilters for activityType
  const getFilters = useCallback(() => {
    const filters: any = {};
    const activityTypes: string[] = [];
    selectedFilters.forEach((filterId) => {
      const typeOption = ACTIVITY_TYPE_OPTIONS.find(
        (opt) => opt.id === filterId
      );
      if (typeOption) {
        activityTypes.push(typeOption.value);
      }
    });
    if (activityTypes.length > 0) {
      filters.activityTypes = activityTypes;
    }
    return filters;
  }, [selectedFilters]);

  return {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
  };
};
