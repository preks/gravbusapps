import React, { useMemo } from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { PiUsers, PiChartBar, PiTarget, PiCalendar } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCustomerTeamDashboardData } from "./hooks/useCustomerTeamDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardViewProps extends BusinessAppContextProps {
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const DATA_TEST_ID_PREFIX = "CustomerTeamDashboardView";

const DashboardView: React.FC<DashboardViewProps> = ({ isLoading, error, onRetry, ...context }) => {
  const { data, isLoading: loadingData, error: dataError, refetch } = useCustomerTeamDashboardData(context as BusinessAppContextProps);

  const widgets: WidgetItem[] = useMemo(() => [
    {
      key: "total-activities",
      title: "Activities (7d)",
      value: data.activities7d,
      prefix: <PiChartBar />,
      color: "#1677ff",
      description: "Total activities last 7 days",
    },
    {
      key: "per-team",
      title: "Per Team",
      value: `${data.perTeam.length} groups`,
      valueIsString: true,
      prefix: <PiUsers />,
      color: "#10b981",
      description: "Distribution by team",
    },
    {
      key: "per-product",
      title: "Per Capability",
      value: `${data.perCapability.length} groups`,
      valueIsString: true,
      prefix: <PiTarget />,
      color: "#ff9500",
      description: "Distribution by capability",
    },
    {
      key: "per-region",
      title: "Per Region",
      value: `${data.perRegion.length} groups`,
      valueIsString: true,
      prefix: <PiCalendar />,
      color: "#722ed1",
      description: "Distribution by region",
    },
  ], [data]);

  return (
    <div data-testid={DATA_TEST_ID_PREFIX}>
      <WidgetGroup
        widgets={widgets}
        isLoading={!!isLoading || loadingData}
        error={error ?? dataError ?? null}
        onRetry={onRetry ?? refetch}
        skeletonCount={4}
        emptyText="No statistics yet"
        data-testid={`${DATA_TEST_ID_PREFIX}-widgets`}
      />
      <div className="gba:mt-6" data-testid={`${DATA_TEST_ID_PREFIX}-charts`}>
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          <div className="gba:w-full gba:h-[280px] gba:bg-white gba:rounded-md gba:p-4" data-testid={`${DATA_TEST_ID_PREFIX}-capability-chart`}>
            <h4 className="gba:mb-2">Distribution by capability</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perCapability} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1677ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="gba:w-full gba:h-[280px] gba:bg-white gba:rounded-md gba:p-4" data-testid={`${DATA_TEST_ID_PREFIX}-region-chart`}>
            <h4 className="gba:mb-2">Distribution by region</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perRegion} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

