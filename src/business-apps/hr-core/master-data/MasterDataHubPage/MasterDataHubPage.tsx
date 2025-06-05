import React, { useState, useEffect } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Briefcase,
  FileStack,
  FileBox,
  Layers,
  DollarSign,
  Clock,
  FileText,
  Network,
  Download,
  Upload,
  ChevronRight,
  MapPin,
  Building,
  Users,
  Brain,
  Folder,
} from "lucide-react";

// Mock data for recent records
const mockRecentData = {
  "job-profiles": [
    { id: "JP001", title: "Software Engineer", level: "Mid" },
    { id: "JP002", title: "Senior Software Engineer", level: "Senior" },
    { id: "JP003", title: "UX Designer", level: "Mid" },
  ],
  "job-families": [
    { id: "JF001", name: "Engineering" },
    { id: "JF002", name: "Frontend Engineering" },
    { id: "JF003", name: "Design" },
  ],
  "job-functions": [
    { id: "JFN001", name: "Software Development" },
    { id: "JFN002", name: "DevOps" },
    { id: "JFN003", name: "User Experience" },
  ],
  "job-levels": [
    { id: "JL001", name: "Entry", order: 1 },
    { id: "JL002", name: "Mid", order: 2 },
    { id: "JL003", name: "Senior", order: 3 },
  ],
  "compensation-bands": [
    { id: "CB001", grade: "A1", range: "$50,000 - $70,000" },
    { id: "CB002", grade: "A2", range: "$70,000 - $90,000" },
    { id: "CB003", grade: "A3", range: "$90,000 - $120,000" },
  ],
  "employment-types": [
    { id: "ET001", name: "Full-Time" },
    { id: "ET002", name: "Part-Time" },
    { id: "ET003", name: "Contractor" },
  ],
  "contract-types": [
    { id: "CT001", name: "Permanent" },
    { id: "CT002", name: "Fixed-Term" },
    { id: "CT003", name: "Temporary" },
  ],
  "org-hierarchy": [
    { id: "OH001", relation: "CEO → CTO" },
    { id: "OH002", relation: "CEO → CFO" },
    { id: "OH003", relation: "CTO → Engineering Director" },
  ],
  locations: [
    { id: "LOC001", name: "New York Office", country: "United States" },
    { id: "LOC002", name: "San Francisco Office", country: "United States" },
    { id: "LOC003", name: "London Office", country: "United Kingdom" },
  ],
  departments: [
    { id: "DEPT001", name: "Engineering", headCount: 32 },
    { id: "DEPT002", name: "Design", headCount: 15 },
    { id: "DEPT003", name: "Product", headCount: 10 },
  ],
  teams: [
    { id: "TEAM001", name: "Frontend Development", type: "Functional" },
    { id: "TEAM002", name: "Backend Development", type: "Functional" },
    { id: "TEAM003", name: "UX Design", type: "Functional" },
  ],
  capabilities: [
    { id: "CAP001", name: "JavaScript", category: "Technical" },
    { id: "CAP002", name: "React", category: "Technical" },
    { id: "CAP003", name: "UX Design", category: "Design" },
  ],
  "cost-centers": [
    { id: "CC001", code: "CC-1001", name: "Engineering" },
    { id: "CC002", code: "CC-1002", name: "Design" },
    { id: "CC003", code: "CC-1003", name: "Product" },
  ],
  "open-positions": [
    { id: "POS001", title: "Senior Software Engineer", status: "hiring" },
    { id: "POS002", title: "UX Designer", status: "approved" },
    { id: "POS003", title: "Product Manager", status: "draft" },
  ],
  projects: [
    { id: "PRJ001", name: "Website Redesign", status: "active" },
    { id: "PRJ002", name: "Mobile App Development", status: "active" },
    { id: "PRJ003", name: "HR System Implementation", status: "active" },
  ],
};

const MasterDataHubPage: React.FC = () => {
  const [recentData] =
    useState<Record<string, any[]>>(mockRecentData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Master data categories with their details
  const masterDataCategories = [
    {
      id: "job-profiles",
      title: "Job Profiles",
      icon: <Briefcase className="h-8 w-8 text-primary-500" />,
      description:
        "Defines role templates including title, function, and level. Assigned to employees.",
      path: "/platform/master-data/job-profiles",
      count: 24,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.title} ({item.level})
        </span>
      ),
    },
    {
      id: "job-families",
      title: "Job Families",
      icon: <FileStack className="h-8 w-8 text-primary-500" />,
      description:
        "Groups related job profiles into hierarchical families for organizational structure.",
      path: "/platform/master-data/job-families",
      count: 7,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">• {item.name}</span>
      ),
    },
    {
      id: "job-functions",
      title: "Job Functions",
      icon: <FileBox className="h-8 w-8 text-primary-500" />,
      description:
        "Categorizes job profiles by functional area within job families.",
      path: "/platform/master-data/job-functions",
      count: 15,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">• {item.name}</span>
      ),
    },
    {
      id: "job-levels",
      title: "Job Levels",
      icon: <Layers className="h-8 w-8 text-primary-500" />,
      description:
        "Defines career progression levels from entry to senior positions.",
      path: "/platform/master-data/job-levels",
      count: 5,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name} (Order: {item.order})
        </span>
      ),
    },
    {
      id: "compensation-bands",
      title: "Compensation Bands",
      icon: <DollarSign className="h-8 w-8 text-primary-500" />,
      description:
        "Salary ranges for job levels across different regions and currencies.",
      path: "/platform/master-data/compensation-bands",
      count: 18,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • Grade {item.grade}: {item.range}
        </span>
      ),
    },
    {
      id: "employment-types",
      title: "Employment Types",
      icon: <Clock className="h-8 w-8 text-primary-500" />,
      description:
        "Categories of employment such as full-time, part-time, and contractor.",
      path: "/platform/master-data/employment-types",
      count: 5,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">• {item.name}</span>
      ),
    },
    {
      id: "contract-types",
      title: "Contract Types",
      icon: <FileText className="h-8 w-8 text-primary-500" />,
      description:
        "Types of employment contracts such as permanent, fixed-term, and temporary.",
      path: "/platform/master-data/contract-types",
      count: 4,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">• {item.name}</span>
      ),
    },
    {
      id: "org-hierarchy",
      title: "Org Hierarchy",
      icon: <Network className="h-8 w-8 text-primary-500" />,
      description:
        "Defines reporting relationships between job profiles in the organization.",
      path: "/platform/master-data/org-hierarchy",
      count: 32,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.relation}
        </span>
      ),
    },
    {
      id: "open-positions",
      title: "Open Positions",
      icon: <Briefcase className="h-8 w-8 text-primary-500" />,
      description:
        "Manage vacant positions for hiring and organizational planning.",
      path: "/platform/master-data/open-positions",
      count: 8,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.title} ({item.status})
        </span>
      ),
    },
    {
      id: "locations",
      title: "Locations",
      icon: <MapPin className="h-8 w-8 text-primary-500" />,
      description:
        "Physical and virtual office locations where employees are based.",
      path: "/platform/master-data/hr/locations",
      count: 12,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name}, {item.country}
        </span>
      ),
    },
    {
      id: "departments",
      title: "Departments",
      icon: <Building className="h-8 w-8 text-primary-500" />,
      description:
        "Organizational departments that group employees by function or purpose.",
      path: "/platform/master-data/departments",
      count: 8,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name} ({item.headCount} employees)
        </span>
      ),
    },
    {
      id: "teams",
      title: "Teams",
      icon: <Users className="h-8 w-8 text-primary-500" />,
      description:
        "Functional and cross-functional teams that employees belong to.",
      path: "/platform/master-data/teams",
      count: 15,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name} ({item.type})
        </span>
      ),
    },
    {
      id: "capabilities",
      title: "Capabilities",
      icon: <Brain className="h-8 w-8 text-primary-500" />,
      description:
        "Skills and competencies that employees possess or job profiles require.",
      path: "/platform/master-data/capabilities",
      count: 42,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name} ({item.category})
        </span>
      ),
    },
    {
      id: "cost-centers",
      title: "Cost Centers",
      icon: <DollarSign className="h-8 w-8 text-primary-500" />,
      description:
        "Financial cost centers for budget allocation and expense tracking.",
      path: "/platform/master-data/cost-centers",
      count: 10,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.code}: {item.name}
        </span>
      ),
    },
    {
      id: "projects",
      title: "Projects",
      icon: <Folder className="h-8 w-8 text-primary-500" />,
      description:
        "Manage projects for time tracking, resource allocation, and reporting.",
      path: "/platform/master-data/hr/projects",
      count: 6,
      renderPreview: (item: any) => (
        <span className="text-sm text-neutral-600 truncate">
          • {item.name} ({item.status})
        </span>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Master Data Hub"
        description="Central repository for all HR master data configuration"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" leftIcon={<Upload size={16} />}>
              Import
            </Button>
            <Button variant="outline" leftIcon={<Download size={16} />}>
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {masterDataCategories.map((category) => (
          <Card
            key={category.id}
            className="hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
            onClick={() => (window.location.href = category.path)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex items-center space-x-3 mb-4">
                  {category.icon}
                  <h3 className="text-lg font-semibold">{category.title}</h3>
                </div>

                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                  {category.description}
                </p>

                {/* Recent Records Preview */}
                <div className="mt-auto pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-neutral-500 uppercase">
                      Recent
                    </h4>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs text-primary-600"
                      rightIcon={<ChevronRight size={12} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = category.path;
                      }}
                    >
                      View All
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {isLoading ? (
                      // Skeleton loading state
                      <>
                        <div className="h-4 bg-neutral-100 rounded-sm animate-pulse"></div>
                        <div className="h-4 bg-neutral-100 rounded-sm animate-pulse"></div>
                        <div className="h-4 bg-neutral-100 rounded-sm animate-pulse"></div>
                      </>
                    ) : recentData[category.id] &&
                      recentData[category.id].length > 0 ? (
                      // Actual data
                      recentData[category.id].slice(0, 3).map((item, index) => (
                        <div key={index} className="group">
                          {category.renderPreview(item)}
                        </div>
                      ))
                    ) : (
                      // No data state
                      <span className="text-sm text-neutral-500 italic">
                        No records yet
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Badge
                    variant="default"
                    className="bg-neutral-100 text-neutral-700"
                  >
                    {category.count} records
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = category.path
                    }}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
};

export default MasterDataHubPage;
