import React from "react";
import { Card, CardContent } from "../ui/Card";
import { Search, ChevronDown } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters?: {
    [key: string]: {
      value: string;
      options: FilterOption[];
      onChange: (value: string) => void;
    };
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  filters = {},
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row flex flex-col gap-2 sm:space-y-0 sm:space-x-2">
          <div className="flex-1">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full border border-neutral-300 rounded-md text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            {Object.entries(filters).map(([key, filter]) => (
              <div key={key} className="relative">
                <select
                  className="pr-8 pl-4 py-2 border border-neutral-300 rounded-md text-sm appearance-none bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
