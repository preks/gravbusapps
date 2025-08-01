import { Card, Spinner, Alert } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "../../../../../../../../../common/BusinessAppContext";
import { RiBarChartLine } from "@remixicon/react";
import { useState, useEffect } from "react";

import { navigateTo } from "../../../../../../../../../common/utils/navigationUtils";

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
  const [filteredReports, _setFilteredReports] = useState<Report[]>([]);
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
        // 🚨 TEMPORARY: Skip navigation service call to isolate 401 error
        setLoading(false);
        return;
        
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
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="absence-reports-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="absence-reports-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-medium">Error</h4>
            <p className="gba:text-sm">{error}</p>
          </div>
        </Alert>
      </div>
    );
  }
  
  const absenceReport = filteredReports.find(report => 
    report.title === 'Absence Reports'
  );

  if (!absenceReport) {
    return (
      <div className="gba:p-4" data-testid="absence-reports-not-found">
        <Alert>
          <div>
            <h4 className="gba:font-medium">No Absence Overview found</h4>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="gba:bg-white gba:rounded-lg gba:border gba:border-gray-200" data-testid="absence-reports-container">
      <div className="gba:p-2">
        <a 
          href={absenceReport.url}
          onClick={(e) => {
            e.preventDefault();
            navigateTo(absenceReport.url);
          }}
          className="gba:block gba:hover:no-underline"
          data-testid="absence-report-link"
        >
          <Card className="gba:border-0 gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:bg-gray-100 gba:p-3 gba:rounded-lg" data-testid="absence-report-icon">
                <RiBarChartLine className="gba:h-6 gba:w-6 gba:text-gray-600" />
              </div>
              <div>
                <h3 className="gba:text-base gba:font-medium gba:text-gray-900" data-testid="absence-report-title">
                  {absenceReport.title}
                </h3>
                {absenceReport.category && (
                  <p className="gba:text-sm gba:text-gray-500 gba:mt-1" data-testid="absence-report-category">
                    {absenceReport.category}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
};
