import React, { useState, useMemo } from 'react';
import { Card, Tooltip, Alert, Button, Space, Tag, Statistic, Row, Col, Progress, Select, Radio, Typography, Divider, Spin, Tabs, Table } from 'antd';
import { ReloadOutlined, InfoCircleOutlined, SettingOutlined, TeamOutlined, ApartmentOutlined, GlobalOutlined, BankOutlined, EyeOutlined, SwitcherOutlined, DollarCircleOutlined, TableOutlined, BarChartOutlined } from '@ant-design/icons';
import { RadialBarChart as RechartsRadialBarChart, RadialBar, ResponsiveContainer, Legend, PolarGrid, PolarAngleAxis, Tooltip as RechartsTooltip } from 'recharts';
import { SunburstVisualizationProps, SunburstNode, HierarchyTableData, HierarchyLevelReportData } from '../types/hierarchyTypes';
import { ViewMode } from '../hooks/useHierarchyData';

const { Option } = Select;
const { Title, Text } = Typography;

// Radial bar chart data interface
interface RadialBarData {
  level: string;
  [key: string]: string | number;
}

export interface RadialBarChartProps extends SunburstVisualizationProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const RadialBarChart: React.FC<RadialBarChartProps> = ({
  data,
  statistics,
  tableData,
  isLoading,
  error,
  onRefresh,
  viewMode,
  onViewModeChange,
}) => {
  const [selectedNode, setSelectedNode] = useState<SunburstNode | null>(null);
  const [colorBy, setColorBy] = useState<'country' | 'level' | 'company'>('country');
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  // Transform sunburst data into radial bar chart data
  const radialBarData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const result: RadialBarData[] = [];

    // Get organizational levels from the root data
    const rootNode = data[0];
    if (rootNode && rootNode.children) {
      rootNode.children.forEach((levelNode, levelIndex) => {
        if (levelNode.children && levelNode.children.length > 0) {
          const levelData: RadialBarData = {
            level: `Level ${levelIndex}`,
          };

          // Add country data for this level
          levelNode.children.forEach((countryNode) => {
            const countryName = countryNode.countryName || countryNode.country || 'Unknown';
            levelData[countryName] = countryNode.value;
          });

          result.push(levelData);
        }
      });
    }

    return result;
  }, [data]);

  // Get all unique countries for the radial bars
  const allCountries = useMemo(() => {
    const countries = new Set<string>();
    radialBarData.forEach(level => {
      Object.keys(level).forEach(key => {
        if (key !== 'level' && key !== 'fill') {
          countries.add(key);
        }
      });
    });
    return Array.from(countries);
  }, [radialBarData]);

  // Colors are now handled through the colorMap from the data integration hook

  // Extract levels and create data for RadialBarChart
  const levels = data[0]?.children || [];
  
  // Prepare data for stacked radial bar chart
  const chartData = levels.map((level, levelIndex) => {
    const levelData: any = {
      level: `Level ${levelIndex}`,
      levelIndex,
      total: level.value,
    };

    // Add segments (countries, companies, or cost centers) as separate properties for stacking
    level.children.forEach((segment, segmentIndex) => {
      const segmentKey = viewMode === 'company' 
        ? `company_${segmentIndex}` 
        : viewMode === 'costcenter'
        ? `costcenter_${segmentIndex}`
        : `country_${segmentIndex}`;
      levelData[segmentKey] = segment.value;
      levelData[`${segmentKey}_name`] = segment.name;
      levelData[`${segmentKey}_color`] = segment.color;
    });

    return levelData;
  });

  // Get all unique segment keys for RadialBar components
  const allSegmentKeys = new Set<string>();
  chartData.forEach(levelData => {
    Object.keys(levelData).forEach(key => {
      if (key.startsWith('country_') || key.startsWith('company_') || key.startsWith('costcenter_')) {
        if (!key.endsWith('_name') && !key.endsWith('_color')) {
          allSegmentKeys.add(key);
        }
      }
    });
  });

  // Helper function to get color for a segment key from the chartData
  const getSegmentColor = (segmentKey: string): string => {
    // Find the first occurrence of this segment key in chartData and get its color
    for (const levelData of chartData) {
      const colorKey = `${segmentKey}_color`;
      if (levelData[colorKey]) {
        return levelData[colorKey];
      }
    }
    // Fallback to a default color if not found
    return '#6B7280';
  };

  // Get current table data based on view mode
  const currentTableData = useMemo(() => {
    if (!tableData) return [];
    return tableData[viewMode] || [];
  }, [tableData, viewMode]);

  // Table columns configuration
  const tableColumns = [
    {
      title: 'Level',
      dataIndex: 'levelName',
      key: 'levelName',
      width: 120,
      render: (text: string, record: HierarchyLevelReportData) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.organizationalUnits} units
          </Text>
        </div>
      ),
    },
    {
      title: 'Total Employees',
      dataIndex: 'totalEmployees',
      key: 'totalEmployees',
      width: 150,
      render: (value: number, record: HierarchyLevelReportData) => (
        <div>
          <Text strong style={{ fontSize: '16px' }}>{value}</Text>
          <br />
          <Progress 
            percent={record.percentage} 
            size="small" 
            showInfo={false}
            strokeColor="var(--nw-entity-employee)"
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.percentage}% of total
          </Text>
        </div>
      ),
    },
    {
      title: viewMode === 'company' ? 'Companies' : viewMode === 'costcenter' ? 'Cost Centers' : 'Countries',
      dataIndex: 'segments',
      key: 'segments',
      render: (segments: any[]) => (
        <div style={{ maxWidth: '400px' }}>
          {segments.map((segment, index) => (
            <div key={segment.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: index < segments.length - 1 ? '8px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: segment.color, 
                    borderRadius: '2px',
                    marginRight: '8px' 
                  }} 
                />
                <Text style={{ marginRight: '8px' }}>{segment.name}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag color="blue">{segment.employeeCount}</Tag>
                <Text type="secondary" style={{ fontSize: '12px', minWidth: '35px' }}>
                  {segment.percentage}%
                </Text>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Custom tooltip for RadialBar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card size="small" style={{ minWidth: 200 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            {label}
          </Title>
          <Text strong>Total Employees: {data.total}</Text>
          <Divider style={{ margin: '8px 0' }} />
          {Object.keys(data)
            .filter(key => (key.startsWith('country_') || key.startsWith('company_') || key.startsWith('costcenter_')) && !key.endsWith('_name') && !key.endsWith('_color'))
            .map(key => {
              const nameKey = `${key}_name`;
              const colorKey = `${key}_color`;
              const value = data[key];
              const name = data[nameKey];
              const color = data[colorKey];
              if (value > 0) {
                return (
                  <div key={key} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: color, 
                        borderRadius: '2px',
                        marginRight: '8px' 
                      }} 
                    />
                    <Text>{name}: <strong>{value}</strong> employees</Text>
                  </div>
                );
              }
              return null;
            })}
        </Card>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div 
        data-testid="OrganizationalHierarchyReport-RadialBarChart-Loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        data-testid="OrganizationalHierarchyReport-RadialBarChart-Error"
        message="Error Loading Hierarchy Data"
        description={error}
        type="error"
        showIcon
        action={
          <Button 
            size="small" 
            onClick={onRefresh}
            icon={<ReloadOutlined />}
          >
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div
      data-testid="OrganizationalHierarchyReport-RadialBarChart"
      style={{
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header with View Mode Switcher */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            <ApartmentOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
            Organizational Hierarchy Report
          </Title>
          <Tag color="blue" icon={<TeamOutlined />}>
            {statistics.totalEmployees} employees
          </Tag>
        </div>
        
        {/* View Mode Switcher */}
        <Space>
          <Text strong>
            <EyeOutlined style={{ marginRight: 8 }} />
            View by:
          </Text>
          <Radio.Group
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button 
              value="location" 
              data-testid="OrganizationalHierarchyReport-RadialBarChart-LocationModeButton"
            >
              <GlobalOutlined style={{ marginRight: 4 }} />
              Location
            </Radio.Button>
            <Radio.Button 
              value="company" 
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CompanyModeButton"
            >
              <BankOutlined style={{ marginRight: 4 }} />
              Company
            </Radio.Button>
            <Radio.Button 
              value="costcenter" 
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CostCenterModeButton"
            >
              <DollarCircleOutlined style={{ marginRight: 4 }} />
              Cost Center
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <Text className="gba:text-gray-700">
          Interactive radial bar chart visualization showing organizational hierarchy distribution across different levels. 
          Each ring represents an organizational level with segments showing distribution by {
            viewMode === 'company' ? 'company affiliations' : 
            viewMode === 'costcenter' ? 'cost center assignments' : 
            'geographic locations'
          }. Use the view mode buttons above to switch between different organizational perspectives.
        </Text>
      </div>

      {/* Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={statistics.totalEmployees}
              prefix={<TeamOutlined style={{ color: 'var(--nw-entity-employee)' }} />}
              valueStyle={{ color: 'var(--nw-entity-employee)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Organizational Units"
              value={statistics.totalOrganizationalUnits}
              prefix={<ApartmentOutlined style={{ color: 'var(--nw-entity-department)' }} />}
              valueStyle={{ color: 'var(--nw-entity-department)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hierarchy Levels"
              value={statistics.maxLevels}
              prefix={<SwitcherOutlined style={{ color: 'var(--nw-entity-strategy)' }} />}
              valueStyle={{ color: 'var(--nw-entity-strategy)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={
                viewMode === 'company' ? 'Companies' : 
                viewMode === 'costcenter' ? 'Cost Centers' : 
                'Countries'
              }
              value={
                viewMode === 'company' ? statistics.companiesCount : 
                viewMode === 'costcenter' ? statistics.costCentersCount : 
                statistics.countriesRepresented
              }
              prefix={
                viewMode === 'company' 
                  ? <BankOutlined style={{ color: 'var(--nw-entity-order)' }} />
                  : viewMode === 'costcenter'
                  ? <DollarCircleOutlined style={{ color: 'var(--nw-entity-department)' }} />
                  : <GlobalOutlined style={{ color: 'var(--nw-entity-location)' }} />
              }
              valueStyle={{ 
                color: viewMode === 'company' 
                  ? 'var(--nw-entity-order)' 
                  : viewMode === 'costcenter'
                  ? 'var(--nw-entity-department)'
                  : 'var(--nw-entity-location)'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Radial Chart Visualization */}
      <Card 
        title={
          <span>
            <BarChartOutlined style={{ marginRight: 8 }} />
            Organizational Hierarchy - {
              viewMode === 'company' ? 'By Company' : 
              viewMode === 'costcenter' ? 'By Cost Center' : 
              'By Location'
            }
          </span>
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[24, 24]}>
          {/* Visualization */}
          <Col xs={24} lg={16}>
            <div style={{ height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadialBarChart
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={450}
                  stackOffset="expand"
                >
                  {Array.from(allSegmentKeys).map((segmentKey, index) => (
                    <RadialBar
                      key={segmentKey}
                      dataKey={segmentKey}
                      stackId="segments"
                      fill={getSegmentColor(segmentKey)}
                    />
                  ))}
                  <Legend 
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                  <RechartsTooltip 
                    content={<CustomTooltip />}
                  />
                </RechartsRadialBarChart>
              </ResponsiveContainer>
            </div>
          </Col>

          {/* Level Breakdown */}
          <Col xs={24} lg={8}>
            <Card 
              title={
                <span>
                  <SwitcherOutlined style={{ marginRight: 8 }} />
                  Level Breakdown
                </span>
              }
              size="small"
            >
              {levels.map((level, index) => (
                <div 
                  key={level.id} 
                  style={{ 
                    marginBottom: '12px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: selectedLevel === index ? 'var(--nw-ai-background)' : 'transparent',
                    cursor: 'pointer',
                    border: selectedLevel === index ? '1px solid var(--nw-entity-strategy)' : '1px solid transparent'
                  }}
                  onClick={() => setSelectedLevel(selectedLevel === index ? null : index)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <Text strong>Level {index}</Text>
                    <Tag color="blue">{level.value} employees</Tag>
                  </div>
                  <Progress 
                    percent={Math.round((level.value / statistics.totalEmployees) * 100)} 
                    size="small"
                    strokeColor="var(--nw-entity-strategy)"
                  />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Table View */}
      <Card
        title={
          <span>
            <TableOutlined style={{ marginRight: 8 }} />
            Detailed Level Report - {
              viewMode === 'company' ? 'By Company' : 
              viewMode === 'costcenter' ? 'By Cost Center' : 
              'By Location'
            }
          </span>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">
            Detailed breakdown of employee distribution across organizational levels
          </Text>
        </div>
        <Table
          dataSource={currentTableData}
          columns={tableColumns}
          rowKey="level"
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default RadialBarChart; 