import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/common/hooks/useDebounce";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";

export const useOpportunitySearchHandling = () => {
  // State for investment search terms
  const [investmentGroupSearchTerm, setInvestmentGroupSearchTerm] = useState("");
  const [investmentTypeSearchTerm, setInvestmentTypeSearchTerm] = useState("");
  const [investmentRoleSearchTerm, setInvestmentRoleSearchTerm] = useState("");
  const [investmentStakeTypeSearchTerm, setInvestmentStakeTypeSearchTerm] = useState("");
  const [measurementUnitSearchTerm, setMeasurementUnitSearchTerm] = useState("");
  
  // Debounced search terms (300ms delay)
  const debouncedInvestmentGroupSearch = useDebounce(investmentGroupSearchTerm, 300);
  const debouncedInvestmentTypeSearch = useDebounce(investmentTypeSearchTerm, 300);
  const debouncedInvestmentRoleSearch = useDebounce(investmentRoleSearchTerm, 300);
  const debouncedInvestmentStakeTypeSearch = useDebounce(investmentStakeTypeSearchTerm, 300);
  const debouncedMeasurementUnitSearch = useDebounce(measurementUnitSearchTerm, 300);

  const {
    formValues,
    investmentGroupsSearchable,
    dependentInvestmentTypes,
    investmentRolesSearchable,
    investmentStakeTypesSearchable,
    measurementUnitsSearchable,
  } = useOpportunityFormContext();

  // Filter investment groups based on debounced search term
  const filteredInvestmentGroups = useMemo(() => {
    if (!debouncedInvestmentGroupSearch.trim()) {
      return investmentGroupsSearchable;
    }
    
    const searchLower = debouncedInvestmentGroupSearch.toLowerCase();
    return investmentGroupsSearchable.filter(group => 
      group.name.toLowerCase().includes(searchLower) ||
      group.label.toLowerCase().includes(searchLower)
    );
  }, [investmentGroupsSearchable, debouncedInvestmentGroupSearch]);

  // Filter investment types based on debounced search term
  const filteredInvestmentTypes = useMemo(() => {
    if (!debouncedInvestmentTypeSearch.trim()) {
      return dependentInvestmentTypes;
    }
    
    const searchLower = debouncedInvestmentTypeSearch.toLowerCase();
    return dependentInvestmentTypes.filter(type => 
      type.name.toLowerCase().includes(searchLower) ||
      type.label.toLowerCase().includes(searchLower)
    );
  }, [dependentInvestmentTypes, debouncedInvestmentTypeSearch]);

  // Filter investment roles based on debounced search term
  const filteredInvestmentRoles = useMemo(() => {
    if (!debouncedInvestmentRoleSearch.trim()) {
      return investmentRolesSearchable;
    }
    
    const searchLower = debouncedInvestmentRoleSearch.toLowerCase();
    return investmentRolesSearchable.filter(role => 
      role.name.toLowerCase().includes(searchLower) ||
      role.label.toLowerCase().includes(searchLower)
    );
  }, [investmentRolesSearchable, debouncedInvestmentRoleSearch]);

  // Filter investment stake types based on debounced search term
  const filteredInvestmentStakeTypes = useMemo(() => {
    if (!debouncedInvestmentStakeTypeSearch.trim()) {
      return investmentStakeTypesSearchable;
    }
    
    const searchLower = debouncedInvestmentStakeTypeSearch.toLowerCase();
    return investmentStakeTypesSearchable.filter(stakeType => 
      stakeType.name.toLowerCase().includes(searchLower) ||
      stakeType.label.toLowerCase().includes(searchLower)
    );
  }, [investmentStakeTypesSearchable, debouncedInvestmentStakeTypeSearch]);

  // Filter measurement units based on debounced search term
  const filteredMeasurementUnits = useMemo(() => {
    if (!debouncedMeasurementUnitSearch.trim()) {
      return measurementUnitsSearchable;
    }
    
    const searchLower = debouncedMeasurementUnitSearch.toLowerCase();
    return measurementUnitsSearchable.filter(unit => 
      unit.name.toLowerCase().includes(searchLower) ||
      unit.label.toLowerCase().includes(searchLower)
    );
  }, [measurementUnitsSearchable, debouncedMeasurementUnitSearch]);

  // Handle investment group search
  const handleInvestmentGroupSearch = (searchTerm: string) => {
    setInvestmentGroupSearchTerm(searchTerm);
  };

  // Handle investment type search
  const handleInvestmentTypeSearch = (searchTerm: string) => {
    setInvestmentTypeSearchTerm(searchTerm);
  };

  // Handle investment role search
  const handleInvestmentRoleSearch = (searchTerm: string) => {
    setInvestmentRoleSearchTerm(searchTerm);
  };

  // Handle investment stake type search
  const handleInvestmentStakeTypeSearch = (searchTerm: string) => {
    setInvestmentStakeTypeSearchTerm(searchTerm);
  };

  // Handle measurement unit search
  const handleMeasurementUnitSearch = (searchTerm: string) => {
    setMeasurementUnitSearchTerm(searchTerm);
  };

  // Clear search terms when investment group changes
  useEffect(() => {
    setInvestmentTypeSearchTerm("");
    setInvestmentRoleSearchTerm("");
    setInvestmentStakeTypeSearchTerm("");
    setMeasurementUnitSearchTerm("");
  }, [formValues.investmentGroupRef]);

  return {
    // Filtered options
    filteredInvestmentGroups,
    filteredInvestmentTypes,
    filteredInvestmentRoles,
    filteredInvestmentStakeTypes,
    filteredMeasurementUnits,
    
    // Search handlers
    handleInvestmentGroupSearch,
    handleInvestmentTypeSearch,
    handleInvestmentRoleSearch,
    handleInvestmentStakeTypeSearch,
    handleMeasurementUnitSearch,
  };
};
