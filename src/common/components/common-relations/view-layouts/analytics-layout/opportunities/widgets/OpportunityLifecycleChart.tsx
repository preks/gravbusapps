import React from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from "@newwork/nw-design-system";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PiChartLine, PiCalendar, PiEye } from "react-icons/pi";

export type TimeFilter = "month" | "quarter" | "sixMonths" | "year" | "historical";

export interface PipelineItem { id: string; name: string }

export interface OpportunityLifecyclePoint {
  date: string;
  opportunitiesCreated: number;
  opportunitiesWon: number;
}

interface OpportunityLifecycleChartProps {
  data: OpportunityLifecyclePoint[];
  selectedTimeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  pipelines: PipelineItem[];
  selectedPipelineId?: string;
  onPipelineChange: (pipelineId: string) => void;
}

export const OpportunityLifecycleChart: React.FC<OpportunityLifecycleChartProps> = ({
  data,
  selectedTimeFilter,
  onTimeFilterChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
}) => {
  const [visibleLines, setVisibleLines] = React.useState({ opportunitiesCreated: true, opportunitiesWon: true });
  const timeFilterOptions: { key: TimeFilter; label: string }[] = [
    { key: "month", label: "Last Month" },
    { key: "quarter", label: "Last Quarter" },
    { key: "sixMonths", label: "Last 6 Months" },
    { key: "year", label: "Last Year" },
    { key: "historical", label: "Historical" },
  ];
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    if (selectedTimeFilter === "month") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <Card data-testid="opportunity-lifecycle-chart">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiChartLine size={20} />
              Opportunity Lifecycle Overview
            </CardTitle>
            <div className="gba:min-w-48">
              <Select value={selectedPipelineId || "all"} onValueChange={onPipelineChange}>
                <SelectTrigger data-testid="opportunity-pipeline-selector">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pipelines</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>{pipeline.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid="opportunity-time-filters">
              {timeFilterOptions.map((option) => (
                <Button key={option.key} variant={selectedTimeFilter === option.key ? "default" : "outline"} size="sm" onClick={() => onTimeFilterChange(option.key)} data-testid={`opportunity-filter-${option.key}`}>
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiEye size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="opportunity-line-filters">
              {[
                { key: "opportunitiesCreated", label: "Opportunities Created", color: "#3B82F6" },
                { key: "opportunitiesWon", label: "Opportunities Won", color: "#10B981" },
              ].map((line) => (
                <label key={line.key} className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer" data-testid={`opportunity-line-filter-${line.key}`}>
                  <Checkbox checked={(visibleLines as any)[line.key]} onCheckedChange={() => setVisibleLines((prev) => ({ ...prev, [line.key]: !(prev as any)[line.key] }))} />
                  <div className="gba:w-3 gba:h-3 gba:rounded" style={{ backgroundColor: line.color }} />
                  <span className="gba:text-sm gba:text-gray-700">{line.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="opportunity-lifecycle-empty-state">
            <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">No opportunity lifecycle data found for the selected pipeline and time period.</p>
          </div>
        ) : (
          <div className="gba:h-80" data-testid="opportunity-lifecycle-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} stroke="#666" />
                <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                <Tooltip formatter={(value: number, name: string, props: any) => { const dataKey = props.dataKey; let label = name; if (dataKey === 'opportunitiesCreated') { label = 'Opportunities Created'; } else if (dataKey === 'opportunitiesWon') { label = 'Opportunities Won'; } return [value, label]; }} labelFormatter={(label) => `Period: ${formatXAxisLabel(label)}`} contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {visibleLines.opportunitiesCreated && (
                  <Area type="monotone" dataKey="opportunitiesCreated" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} dot={false} activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }} name="Opportunities Created" />
                )}
                {visibleLines.opportunitiesWon && (
                  <Area type="monotone" dataKey="opportunitiesWon" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} dot={false} activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }} name="Opportunities Won" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpportunityLifecycleChart;


