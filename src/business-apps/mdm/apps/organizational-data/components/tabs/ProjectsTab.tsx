import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowsDownUpIcon,
  EyeIcon,
  InfoIcon,
  LinkIcon,
  PlusIcon,
  XCircleIcon,
  PencilSimpleLineIcon,
  UsersIcon,
  CalendarBlankIcon,
  KanbanIcon,
  CheckCircleIcon,
  ClockIcon,
  WarningIcon,
  WallIcon,
  FileIcon,
  IdentificationCardIcon,
} from "@phosphor-icons/react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useDebounce } from "@/common/hooks/useDebounce";
import { useProjects } from "../../hooks";
import { Project } from "../../types";
import {
  DataTable,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Card,
  Input,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  Spinner,
  Progress,
  CardHeader,
} from "@newwork/nw-design-system";
import { ColumnDef } from "@tanstack/react-table";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import CardTabHeaderComponent from "../../../generic-components/card";
import { VerticalTable, VerticalTableProps } from "../../../generic-components/table/VerticalTable";
import {
  NavigationLinkCards,
  NavigationLinkCardsProps,
} from "../../../generic-components/card/NavigationLinkCards";
import { DeleteButton } from "../../../generic-components/delete-button/DeleteButton";
import ProjectForm from "@/business-apps/mdm/forms/project-form";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { env } from "@/common/env/EnvUtils";

export interface ProjectsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const DATA_TEST_ID_PREFIX = "ProjectsTab";
const ORGCHART_BASE_URL = `${env("NEXT_PUBLIC_ORGCHART_API_URL")}/orgchart/api/v1`;

const ProjectsTab: React.FC<ProjectsTabProps> = ({ prefixDataTestId, ...context }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX);
  const { t } = useTranslation();
  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Data integration
  const {
    projects,
    accounts,
    isLoading,
    error,
    refetch,
    totalProjects,
    filterProjects,
    structureId,
  } = useProjects(context);
  // Local state
  const [searchInput, setSearchInput] = useState("");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const showNavigationItems = false;

  // Debounce search input
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  useEffect(() => {
    if (selectedProject) {
      const updatedSelectedProject = projects.find((project) => project.id === selectedProject.id);

      if (updatedSelectedProject) {
        setSelectedProject(updatedSelectedProject);
      }
    }
  }, [projects]);

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    // With server-side pagination, we only filter the current page results
    // The full filtered count will be handled by the API
    return filterProjects(debouncedSearchTerm);
  }, [filterProjects, debouncedSearchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const dataTable = useMemo(
    () =>
      filteredProjects.map((project) => {
        const account = accounts.find((account) => account.id === project.customerId);

        return {
          ...project,
          accountName: account?.name,
        };
      }),
    [filteredProjects],
  );

  const renderProjectsTable = () => {
    const columns: ColumnDef<Project>[] = [
      {
        accessorKey: "projectType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Project Type
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        cell: ({ getValue }) => {
          const projectType = getValue() as string;
          const displayType = projectType
            ? projectType.charAt(0).toUpperCase() + projectType.slice(1).toLowerCase()
            : "N/A";
          return (
            <div className="gba:flex gba:items-center">
              <Badge variant={getProjectTypeColor(projectType)}>{displayType}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Project Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue();
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "accountName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Account
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const accountName = getValue();
          return <div className="gba:font-semibold">{accountName as string}</div>;
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Status
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue, row }) => {
          const status = getValue() ?? "N/A";
          const daysUntilExpiry = row.original.daysUntilExpiry;
          return (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Badge variant={getStatusColor(status as string)}>
                {(status as string) ?? "N/A"}
              </Badge>
              {daysUntilExpiry !== undefined && (
                <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  {daysUntilExpiry > 0
                    ? `${daysUntilExpiry} days left`
                    : `${Math.abs(daysUntilExpiry)} days ago`}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "validTo",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Valid Until
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const formattedDate = row.original.formattedValidTo;
          return (
            <div style={{ display: "flex", alignItems: "center" }}>
              {formattedDate ? (
                <>
                  <CalendarBlankIcon style={{ marginRight: "4px", color: "#666" }} />
                  <span>{formattedDate}</span>
                </>
              ) : (
                <span style={{ color: "#999", fontStyle: "italic" }}>No expiry</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Description
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = getValue();
          return <div>{description as string}</div>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const targetProject = projects.find((project) => project.id === row.original.id);

          return (
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(targetProject)}
                data-testid={`${dataTestId}-view-function-${row.original.id}`}
              >
                <EyeIcon className="gba:h-4 gba:w-4" />
              </Button>

              <ProjectForm
                childAddButton={
                  <Button variant="ghost" onClick={(event) => event.stopPropagation()}>
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                accessToken={context.accessToken}
                structureId={structureId}
                project={targetProject}
                accounts={accounts}
              />

              <DeleteButton
                onDelete={() => handleDelete(targetProject)}
                itemName={targetProject?.name ?? ""}
                itemTitle={"Project"}
              />
            </div>
          );
        },
      },
    ];

    return (
      <DataTable
        defaultDataSetId="projects"
        dataSets={[
          {
            id: "projects",
            label: "Projects",
            data: dataTable,
            columns: columns,
          },
        ]}
      />
    );
  };

  const drawerItems = useMemo(() => {
    if (!selectedProject) return [];
    const account = accounts.find((account) => account.id === selectedProject.customerId);
    const items: VerticalTableProps[] = [
      {
        icon: <InfoIcon />,
        title: "Project Information",
        verticalTable: true,
        items: [
          {
            label: "Name",
            value: selectedProject.name,
          },
        ],
      },
    ];

    if (account) {
      items[0].items.push({
        label: "Account",
        value: account.name,
      });
    }

    if (selectedProject.validTo) {
      items[0].items.push({
        label: "Valid Until",
        value:
          selectedProject.formattedValidTo ||
          new Date(selectedProject.validTo).toLocaleDateString(),
      });
    }

    if (selectedProject.description) {
      items[0].items.push({
        label: "Description",
        value: selectedProject.description,
      });
    }

    return items;
  }, [selectedProject]);

  const navigationItems = useMemo(() => {
    if (!selectedProject) return [];

    const items: NavigationLinkCardsProps[] = [
      {
        redirectLink: `/project-management/tasks?projectId=${selectedProject.id}`,
        color: "blue",
        icon: CheckCircleIcon,
        title: "View Tasks & Milestones",
        description: "Track project tasks and upcoming milestones",
      },
      {
        redirectLink: `/project-management/teams?projectId=${selectedProject.id}`,
        color: "green",
        icon: UsersIcon,
        title: "View Team Members",
        description: "See all team members and roles assigned to this project",
      },
      {
        redirectLink: selectedProject.customerId
          ? `/customer-management/customers/${selectedProject.customerId}`
          : "#",
        color: "purple",
        icon: IdentificationCardIcon,
        title: "View Customer Details",
        description: "View details about the customer for this project",
      },
      {
        redirectLink: `/project-management/reports?projectId=${selectedProject.id}`,
        color: "cyan",
        icon: FileIcon,
        title: "View Project Reports",
        description: "Access project reports and analytics",
      },
    ];

    return items;
  }, [selectedProject]);

  const handleView = (targetProject: Project | undefined) => {
    if (!targetProject) return;
    setSelectedProject(targetProject);
    setDrawerVisible(true);
  };

  const handleDelete = async (project: Project | undefined) => {
    if (!project) return;

    await restClient.delete(`/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${context.accessToken}` },
    });

    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Expired":
        return "destructive";
      case "Expiring Soon":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getProjectTypeColor = (type: string) => {
    return type === "INTERNAL" ? "info" : "ext1";
  };

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId || ""}-ProjectsTab`}
        style={{
          background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
          minHeight: "100%",
          padding: "24px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="gba:p-6 gba:text-center"
        data-testid={`${prefixDataTestId || ""}-ProjectsTab`}
      >
        <Alert
          className="gba:w-full gba:!flex gba:justify-between gba:!items-center"
          variant="destructive"
        >
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Projects
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Card data-testid={`${prefixDataTestId || ""}-JobProfilesTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <ProjectForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={(event) => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ""}-ProjectsTab-AddButton`}
                >
                  <PlusIcon /> Add Project
                </Button>
              }
              refetch={refetch}
              accessToken={context.accessToken}
              structureId={structureId}
              accounts={accounts}
            />
          }
          cardTitle={`${t("hr.project_management", "Project Management")} (${totalProjects})`}
          cardDescription="Manage projects and their details"
        />
      )}
      <CardContent>
        {/* Filters */}
        <div className="gba:relative gba:max-w-sm">
          <Input
            placeholder="Search projects..."
            value={searchInput}
            onChange={handleSearchChange}
            className="gba:ml-6"
            data-testid={`${prefixDataTestId || ""}-ProjectsTab-SearchInput`}
          />
        </div>

        {renderProjectsTable()}

        {selectedProject && (
          <Sheet
            open={drawerVisible}
            onOpenChange={(openStatus) => {
              if (!openStatus) {
                setSelectedProject(null);
              }
              setDrawerVisible(openStatus);
            }}
          >
            <style jsx>{`
              [data-slot="sheet-overlay"] {
                z-index: 1000 !important;
              }
              [data-slot="sheet-content"] {
                z-index: 1001 !important;
              }
              [data-slot="select-content"] {
                z-index: 1002 !important;
              }
              [data-slot="popover-content"] {
                z-index: 1002 !important;
              }
            `}</style>
            <SheetContent side="right" data-testid={`${dataTestId}-details-sheet`}>
              <SheetHeader>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <KanbanIcon className="h-5 w-5" />
                  <SheetTitle>Project Details</SheetTitle>
                </div>
              </SheetHeader>

              <div className="gba:flex-1 gba:overflow-auto gba:px-4 gba:pb-4">
                <div className="gba:space-y-6">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <Card className="gba:!gap-2 gba:text-lg">
                      <CardHeader className="gba:text-sm gba:text-gray-400">
                        Project Type
                      </CardHeader>
                      <CardContent
                        className={`${selectedProject.projectType === "INTERNAL" ? "gba:text-[#1890ff]" : "gba:text-[#722ed1]"} gba:!pt-0 gba:flex gba:items-center gba:gap-2`}
                      >
                        <WallIcon />
                        {selectedProject.projectType
                          ? selectedProject.projectType.charAt(0).toUpperCase() +
                            selectedProject.projectType.slice(1).toLowerCase()
                          : "N/A"}
                      </CardContent>
                    </Card>

                    <Card className="gba:!gap-2 gba:text-lg">
                      <CardHeader className="gba:text-sm gba:text-gray-400">Status</CardHeader>
                      <CardContent
                        className={`${selectedProject.status === "Active" ? "gba:text-[#52c41a]" : selectedProject.status === "Expired" ? "gba:text-[#f5222d]" : "gba:text-[#fa8c16]"} gba:!pt-0 gba:flex gba:items-center gba:gap-2`}
                      >
                        {selectedProject.status === "Active" ? (
                          <CheckCircleIcon />
                        ) : selectedProject.status === "Expired" ? (
                          <WarningIcon />
                        ) : (
                          <ClockIcon />
                        )}
                        {selectedProject.status}
                      </CardContent>
                    </Card>
                  </div>
                  {selectedProject.daysUntilExpiry !== undefined && (
                    <div className="gba:mt-4">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <h1 className="gba:font-medium">Time Remaining</h1>
                        <h1
                          className={`gba:text-sm gba:font-medium ${selectedProject.isActive ? "" : "gba:text-red-500"}`}
                        >
                          {selectedProject.daysUntilExpiry > 0
                            ? `${selectedProject.daysUntilExpiry} days remaining`
                            : `Expired ${Math.abs(selectedProject.daysUntilExpiry)} days ago`}
                        </h1>
                      </div>
                      <Progress
                        value={
                          selectedProject.daysUntilExpiry <= 0
                            ? 100
                            : selectedProject.daysUntilExpiry > 90
                              ? 25
                              : selectedProject.daysUntilExpiry > 30
                                ? 50
                                : selectedProject.daysUntilExpiry > 7
                                  ? 75
                                  : 90
                        }
                        className="gba:mt-2"
                      />
                    </div>
                  )}

                  {drawerItems.map((item) => {
                    return (
                      <VerticalTable
                        icon={item.icon}
                        title={item.title}
                        items={item.items}
                        verticalTable={item.verticalTable}
                      />
                    );
                  })}
                </div>
                {showNavigationItems && (
                  <div className="gba:mt-6">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:pb-4">
                      <LinkIcon className="gba:h-4 gba:w-4 gba:inline gba:mr-2" />
                      <span className="gba:text-base gba:font-semibold">Related Resources</span>
                    </div>

                    <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                      {navigationItems.map((item, index) => {
                        return <NavigationLinkCards key={index} {...item} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter>
                <div className="gba:flex gba:justify-end gba:gap-2">
                  <ProjectForm
                    childAddButton={
                      <Button>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    refetch={refetch}
                    accessToken={context.accessToken}
                    structureId={structureId}
                    project={selectedProject}
                    isDrawerActive={true}
                    accounts={accounts}
                  />

                  <SheetClose asChild>
                    <Button variant="outline">Close</Button>
                  </SheetClose>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectsTab;
