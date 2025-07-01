import { Card, Spin, Alert } from "antd";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { RiBarChartLine } from "@remixicon/react";
import { useState, useEffect } from "react";
import { env } from "@/common/env/EnvUtils";

interface ResourceUrl {
  id: string;
  url: string;
  name: string;
  name_i18n: Record<string, string>;
  description?: string | null;
  description_i18n?: Record<string, string>;
  [key: string]: any;
}
interface MenuItem {
  id: string;
  name: string;
  description?: string;
  descriptionTranslated?: Record<string, string>;
  icon: string | null;
  children?: MenuItem[];
  resourceUrl?: ResourceUrl;
  [key: string]: any;
}

interface Report {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  favorite: boolean;
  url: string;
}

const transformMenuItemsToReports = (menuItems: MenuItem[]): Report[] => {
  const reports: Report[] = [];

  const processItems = (items: MenuItem[]) => {
    items.forEach((item) => {
      if (item.resourceUrl?.url) {
        reports.push({
          id: item.id,
          title: item.name,
          description: item.description || 'No description available',
          icon: <RiBarChartLine className="h-5 w-5" />,
          category: item.resourceUrl.name || 'Report',
          favorite: false,
          url: `https://newwork-dev.newwork.com${item.resourceUrl.url}`,
        });
      }

      if (item.children && item.children.length > 0) {
        processItems(item.children);
      }
    });
  };

  processItems(menuItems);
  return reports;
};

const findMenuItem = (items: MenuItem[], name: string): MenuItem | undefined => {
  for (const item of items) {
    if (item.name === name) {
      return item;
    }
    if (item.children) {
      const found = findMenuItem(item.children, name);
      if (found) return found;
    }
  }
  return undefined;
};

export const AbsenceReports: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!accessToken) {
        setError('No access token available');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${env('NEXT_PUBLIC_NAVIGATION_SERVICE_API')}/menuItems`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.menuItems)) {
          throw new Error('Invalid response format: menuItems array not found');
        }

        const reports = transformMenuItemsToReports(data.menuItems);
        setFilteredReports(reports);
        
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItems();
  }, [accessToken]);

  
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert 
          message="Error" 
          description={error} 
          type="error" 
          showIcon 
        />
      </div>
    );
  }
  
  const absenceReport = filteredReports.find(report => 
    report.title === 'Absence Reports'
  );


  if (!absenceReport) {
    return (
      <div className="gba:p-4">
        <Alert 
          message="No Absence Overview found" 
          type="info" 
          showIcon 
        />
      </div>
    );
  }

  return (
    <div className="gba:w-full">
      <div className="gba:bg-white gba:rounded-lg gba:border gba:border-gray-200">
        <div className="gba:p-4">
          <a 
            href={absenceReport.url}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = absenceReport.url;
            }}
            className="gba:block gba:hover:no-underline"
          >
            <Card 
              className="gba:border-0 gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer"
              hoverable={false}
            >
              <div className="gba:p-4">
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:bg-gray-100 gba:p-3 gba:rounded-lg">
                    <RiBarChartLine className="gba:h-6 gba:w-6 gba:text-gray-600" />
                  </div>
                  <div>
                    <h3 className="gba:text-base gba:font-medium gba:text-gray-900">
                      {absenceReport.title}
                    </h3>
                    {absenceReport.category && (
                      <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
                        {absenceReport.category}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </a>
        </div>
      </div>
    </div>
  );
};
