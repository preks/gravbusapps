import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { Typography } from 'antd';
import { PiFileText, PiFilePdf } from 'react-icons/pi';
import { 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { DemographicsData } from '../hooks/useDemographicsDataIntegration';

const { Title, Text } = Typography;

interface DemographicsChartsViewProps {
  demographicsData: DemographicsData;
  isLoading: boolean;
  dataTestId: string;
}

interface TableData {
  category: string;
  value: number;
  percentage: string;
}

const DemographicsChartsView: React.FC<DemographicsChartsViewProps> = ({
  demographicsData,
  isLoading,
  dataTestId
}) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  // Color schemes for charts
  const colors = {
    primary: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff'],
    warm: ['#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7', '#ffe1e1', '#fff2f0'],
    cool: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be', '#f6ffed'],
    purple: ['#722ed1', '#9254de', '#b37feb', '#d3adf7', '#efdbff', '#f9f0ff'],
    orange: ['#fa8c16', '#ffa940', '#ffc069', '#ffd591', '#ffe7ba', '#fff7e6'],
    cyan: ['#13c2c2', '#36cfc9', '#5cdbd3', '#87e8de', '#b5f5ec', '#e6fffb']
  };

  // Custom label renderer for pie charts
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percent is greater than 5%
    return percent > 0.05 ? (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  // Safe access to data with null checks
  const genderData = demographicsData?.genderDistribution || [];
  const ageData = demographicsData?.ageDistribution || [];
  const nationalityData = demographicsData?.nationalityDistribution || [];

  // Transform data to include percentages
  const transformData = (data: Array<{ category: string; value: number }>): TableData[] => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      category: item.category,
      value: item.value,
      percentage: total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'
    }));
  };

  // Mock export functions
  const handleExport = async (format: 'excel' | 'pdf', tableName: string, data: TableData[]) => {
    setExportingTable(`${tableName}-${format}`);
    
    // Mock export delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`Exporting ${tableName} as ${format}:`, data);
    
    setExportingTable(null);
  };

  const chartConfigs = [
    {
      title: 'Gender Distribution',
      data: genderData,
      tableData: transformData(genderData),
      colors: colors.primary,
      testId: 'gender-chart',
      tag: `${genderData.length} categories`,
      description: 'Employee distribution by gender identity showing workforce gender composition'
    },
    {
      title: 'Age Distribution',
      data: ageData,
      tableData: transformData(ageData),
      colors: colors.warm,
      testId: 'age-chart',
      tag: `${ageData.length} age groups`,
      description: 'Employee distribution across age groups showing generational workforce makeup'
    },
    {
      title: 'Nationality Distribution',
      data: nationalityData.slice(0, 8), // Show top 8 nationalities in chart
      tableData: transformData(nationalityData), // Show all in table
      colors: colors.cool,
      testId: 'nationality-chart',
      tag: `Top 8 of ${nationalityData.length} nationalities`,
      description: 'Employee distribution by nationality showing international workforce diversity'
    }
  ];

  const handleChartClick = (chartId: string) => {
    // If clicking the same chart, deselect it. Otherwise, select the new one.
    setSelectedChart(selectedChart === chartId ? null : chartId);
  };

  // Find the selected chart configuration
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart);

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-charts-view`}>
        {/* Loading Charts Row */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="gba:animate-pulse">
              <CardHeader>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="gba:h-80 gba:bg-gray-100 gba:rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`${dataTestId}-charts-view`}>
      {/* Charts Row */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
        {chartConfigs.map((config) => {
          const isSelected = selectedChart === config.testId;
          
          return (
            <Card 
              key={config.testId}
              data-testid={`${dataTestId}-${config.testId}`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                isSelected 
                  ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' 
                  : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Title level={4} className="gba:m-0 gba:text-gray-800">{config.title}</Title>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
                  {config.description}
                </Text>
                {isSelected && (
                  <p className="gba:text-xs gba:text-blue-600 gba:mt-1">
                    ✓ Selected - Table shown below
                  </p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="gba:h-64">
                  {config.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={config.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="category"
                        >
                          {config.data.map((entry, entryIndex) => (
                            <Cell 
                              key={`cell-${entryIndex}`} 
                              fill={config.colors[entryIndex % config.colors.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} employees`,
                            name
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            fontSize: '10px',
                            marginTop: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
                      <p className="gba:text-gray-500 gba:text-sm">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Chart Data Table */}
      {selectedConfig && (
        <Card data-testid={`${dataTestId}-${selectedConfig.testId}-table`}>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-xl">Data Table: {selectedConfig.title}</CardTitle>
                <Badge variant="outline" className="gba:bg-green-50 gba:text-green-700">
                  {selectedConfig.tableData.length} entries
                </Badge>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingTable === `${selectedConfig.testId}-excel`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('excel', selectedConfig.testId, selectedConfig.tableData);
                  }}
                  data-testid={`${dataTestId}-${selectedConfig.testId}-export-excel`}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFileText className="gba:w-3 gba:h-3" />
                  Export Excel
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('pdf', selectedConfig.testId, selectedConfig.tableData);
                  }}
                  data-testid={`${dataTestId}-${selectedConfig.testId}-export-pdf`}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFilePdf className="gba:w-3 gba:h-3" />
                  Export PDF
                </Button>
              </div>
            </div>
            <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
              {selectedConfig.description}
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="gba:max-h-96 gba:overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-2/5">{selectedConfig.title.split(' ')[0]}</TableHead>
                    <TableHead className="gba:w-1/5">Count</TableHead>
                    <TableHead className="gba:w-2/5">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedConfig.tableData.map((item, index) => (
                    <TableRow key={item.category}>
                      <TableCell className="gba:font-medium">{item.category}</TableCell>
                      <TableCell>{item.value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gba:bg-blue-50 gba:text-blue-700">
                          {item.percentage}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Summary */}
            <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-md gba:flex gba:justify-between gba:items-center">
              <span className="gba:font-medium gba:text-sm">
                Total: {selectedConfig.tableData.reduce((sum, item) => sum + item.value, 0).toLocaleString()} employees
              </span>
              <span className="gba:text-sm gba:text-gray-600">
                {selectedConfig.tableData.length} categories
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!selectedConfig && (
        <div className="gba:text-center gba:py-8">
          <p className="gba:text-gray-500">
            Click on any chart above to view its detailed data table
          </p>
        </div>
      )}
    </div>
  );
};

export default DemographicsChartsView; 