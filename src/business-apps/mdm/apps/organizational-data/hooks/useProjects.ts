import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { env } from '@/common/env/EnvUtils';
import { Project, ProjectData } from "../types";

// Interface for API response with paging
export interface PaginatedProjectRecords {
  data: ProjectData[];
  paging: {
    offset: number;
    totalRecords: number;
    hasMore: boolean;
  };
}

// Default pagination values
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_CURRENT_PAGE = 1;

const ORGCHART_BASE_URL = env('NEXT_PUBLIC_REST_ENDPOINT_ORGCHART')!;

// Transform API project data to UI-friendly Project interface
const transformProject = (projectData: ProjectData): Project => {
  const now = new Date();
  let status: "Active" | "Expired" | "Expiring Soon" = "Active";
  let isActive = true;
  let daysUntilExpiry: number | undefined;
  let formattedValidTo: string | undefined;

  if (projectData.validTo) {
    const validToDate = new Date(projectData.validTo);
    const timeDiff = validToDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Format the date for display
    formattedValidTo = validToDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (daysUntilExpiry < 0) {
      status = "Expired";
      isActive = false;
    } else if (daysUntilExpiry <= 30) {
      status = "Expiring Soon";
    }
  }

  return {
    id: projectData.id,
    name: projectData.name,
    description: projectData.description,
    validTo: projectData.validTo,
    structureId: projectData.structureId,
    projectType: projectData.projectType,
    customerId: projectData.customerId,
    status,
    isActive,
    daysUntilExpiry,
    formattedValidTo,
  };
};

export const useProjects = (context: BusinessAppContextProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_CURRENT_PAGE);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Fetch projects from orgchart API
  const fetchProjects = useCallback(
    async (validTo?: string, limit?: number, offset?: number): Promise<{projects: Project[], totalCount: number}> => {
      try {
        // Get structureId from additionalData or use default
        const structureId =
          context.additionalData?.structureId ||
          "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf";

        if (!structureId) {
          throw new Error("Structure ID is required to fetch projects");
        }

        const params: Record<string, string | number> = {
          structureId: structureId,
        };
        if (validTo) {
          params.valid_to = validTo;
        }
        
        // Add pagination params if provided
        if (limit !== undefined) {
          params.limit = limit;
        }
        if (offset !== undefined) {
          params.offset = offset;
        }

        const response = await restClient.get<PaginatedProjectRecords>(
          "/projects",
          {
            params,
            headers: {
              Authorization: `Bearer ${context.accessToken}`,
            },
          }
        );
        
        // Extract projects and total count from the paginated response
        const projectResponse = response;
        
        // Handle the response format with data and paging properties
        if (projectResponse && projectResponse.data && projectResponse.paging) {
          const transformedProjects = projectResponse.data.map(transformProject);
          const totalCount = projectResponse.paging.totalRecords;
          
          return { 
            projects: transformedProjects,
            totalCount 
          };
        }
        
        // Fallback for backward compatibility or unexpected response format
        const projects = Array.isArray(projectResponse) 
          ? projectResponse.map(transformProject) 
          : [];
        
        return { 
          projects,
          totalCount: projects.length
        };
      } catch (error) {
        console.error("Error fetching projects:", error);
        throw new Error("Failed to fetch projects from orgchart API");
      }
    },
    [context.accessToken, context.additionalData?.structureId, restClient, transformProject]
  );

  // Load initial data
  const loadData = useCallback(
    async (validTo?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Calculate offset based on current page and page size
        const offset = (currentPage - 1) * pageSize;
        const limit = pageSize;
        
        const result = await fetchProjects(validTo, limit, offset);
        setProjects(result.projects);
        setTotalCount(result.totalCount);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Error loading projects:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProjects, currentPage, pageSize]
  );

  // Filter projects by various criteria
  const filterProjects = useCallback(
    (
      searchTerm: string = "",
      projectType?: "INTERNAL" | "EXTERNAL" | "ALL",
      status?: "Active" | "Expired" | "Expiring Soon" | "ALL"
    ): Project[] => {
      return projects.filter((project) => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.description &&
            project.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        // Project type filter
        const matchesType =
          !projectType ||
          projectType === "ALL" ||
          project.projectType === projectType;

        // Status filter
        const matchesStatus =
          !status || status === "ALL" || project.status === status;

        return matchesSearch && matchesType && matchesStatus;
      });
    },
    [projects]
  );

  // Get projects by type
  const getProjectsByType = useCallback(
    (type: "INTERNAL" | "EXTERNAL"): Project[] => {
      return projects.filter((project) => project.projectType === type);
    },
    [projects]
  );

  // Get active projects
  const getActiveProjects = useCallback((): Project[] => {
    return projects.filter((project) => project.isActive);
  }, [projects]);

  // Get expired projects
  const getExpiredProjects = useCallback((): Project[] => {
    return projects.filter((project) => project.status === "Expired");
  }, [projects]);

  // Get projects expiring soon
  const getExpiringProjects = useCallback((): Project[] => {
    return projects.filter((project) => project.status === "Expiring Soon");
  }, [projects]);

  // Search projects by name or description
  const searchProjects = useCallback(
    (query: string): Project[] => {
      const searchTerm = query.toLowerCase();
      return projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm) ||
          (project.description &&
            project.description.toLowerCase().includes(searchTerm))
      );
    },
    [projects]
  );

  // Get project by ID
  const getProjectById = useCallback(
    (id: string): Project | undefined => {
      return projects.find((project) => project.id === id);
    },
    [projects]
  );

  const refetch = useCallback(
    (validTo?: string, newPage?: number, newPageSize?: number) => {
      // Update pagination state if provided
      if (newPage !== undefined) {
        setCurrentPage(newPage);
      }
      if (newPageSize !== undefined) {
        setPageSize(newPageSize);
      }
      return loadData(validTo);
    },
    [loadData]
  );

  // Load data on mount and when access token or pagination changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, currentPage, pageSize, loadData]);

  return {
    // Data
    projects,

    // State
    isLoading,
    error,
    
    // Pagination
    totalCount,
    currentPage,
    pageSize,
    
    // Change pagination
    setCurrentPage,
    setPageSize,

    // Actions
    refetch,

    // Filter functions
    filterProjects,
    getProjectsByType,
    getActiveProjects,
    getExpiredProjects,
    getExpiringProjects,
    searchProjects,
    getProjectById,

    // Statistics
    totalProjects: totalCount,
    internalProjects: getProjectsByType("INTERNAL").length,
    externalProjects: getProjectsByType("EXTERNAL").length,
    activeProjects: getActiveProjects().length,
    expiredProjects: getExpiredProjects().length,
    expiringProjects: getExpiringProjects().length,

    // Raw fetch function for advanced usage
    fetchProjects,
  };
};
