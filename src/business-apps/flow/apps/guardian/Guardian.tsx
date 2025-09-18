import React, { useState, useCallback } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GuardianD3Visualization } from './components/GuardianD3Visualization';
import { GuardianStatistics } from './components/GuardianStatistics';
// Using list-style dark SLA component
import { D3SLAViolationList } from './components/charts/D3SLAViolationList';
import { useGuardianData } from './hooks/useGuardianData';
import { GuardianViewMode, GuardianFilter } from './types/guardianTypes';

interface GuardianProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const Guardian: React.FC<GuardianProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'guardian'
}) => {
  // State for visualization controls
  const [viewMode] = useState<GuardianViewMode>('force-directed');
  const [filters, setFilters] = useState<GuardianFilter>({
    showActiveWorkflows: true,
    showCompleted: false,
    showDepartments: true,
    showUsers: true,
    showCapabilities: false,
    showLocations: false,
    workflowStatuses: ['IN_PROGRESS', 'SCHEDULED'],
    timeRange: '7d',
    selectedDepartments: [],
    selectedWorkflowTemplates: [],
    selectedUsers: [],
    minNodeSize: 8,
    maxNodeSize: 25,
    showLabels: true,
    showAnimations: true,
    showDensityTrails: true,
    assignmentModes: ['CLAIM', 'ASSIGN'],
    taskStatuses: []
  });
  const [animationSpeed] = useState(1);
  const [isRealTime, setIsRealTime] = useState(false); // Start with real-time disabled to prevent constant re-renders

  // Data hooks
  const { 
    networkData, 
    statistics, 
    auditData,
    isLoading, 
    error, 
    refetch 
  } = useGuardianData({ 
    accessToken, 
    viewMode, 
    filters,
    isRealTime,
    userId: userInfo?.employeeDetails?.employeeId
  });

  const handleFilterChange = useCallback((newFilters: Partial<GuardianFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);



  if (error) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-error-container`}
        style={{ 
          background: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#fca5a5', marginBottom: '16px' }}>
            Error Loading Guardian Data
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
            {error}
          </p>
          <Button onClick={refetch} data-testid={`${prefixDataTestId}-retry-button`}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(11,15,25,0.92) 0%, rgba(17,24,39,0.96) 100%), url('/src/assets/images/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px',
        // Scoped DS token overrides (dark glass theme)
        // Surfaces
        ['--color-surface-primary' as any]: 'rgba(15,23,42,0.65)',
        ['--color-surface-secondary' as any]: 'rgba(30,41,59,0.55)',
        // Text
        ['--color-text-primary' as any]: '#e5e7eb',
        ['--color-text-secondary' as any]: '#9ca3af',
        // Borders & shadows
        ['--color-border-default' as any]: 'rgba(148,163,184,0.12)',
        ['--shadow-md' as any]: '0 8px 24px rgba(0,0,0,0.35)',
        ['--shadow-lg' as any]: '0 12px 32px rgba(0,0,0,0.45)'
      }}
    >
      {/* Header with Title and Real-time Toggle */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#e5e7eb',
            margin: 0,
            marginBottom: '8px'
          }}>
            Guardian
          </h1>
          <p style={{ 
            color: '#9ca3af', 
            fontSize: '16px',
            margin: 0
          }}>
            Visualize flows and organizational dependencies
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Time Range:</span>
            <Select
              value={filters.timeRange}
              onValueChange={(value) => handleFilterChange({ timeRange: value as any })}
              data-testid={`${prefixDataTestId}-time-range-select`}
            >
              <SelectTrigger style={{ width: '140px', background: '#0f172a', color: '#e5e7eb', borderColor: '#374151' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Real-time</span>
            <Switch
              checked={isRealTime}
              onCheckedChange={setIsRealTime}
              data-testid={`${prefixDataTestId}-realtime-toggle`}
            />
          </div>
        </div>
      </div>

      {/* Direct KPI Cards - No wrapper card */}
      <div style={{ marginBottom: '24px' }}>
        <GuardianStatistics 
          statistics={statistics}
          isLoading={isLoading}
          prefixDataTestId={`${prefixDataTestId}-top-metrics`}
        />
      </div>

      {/* Timeline and Network Graph Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {/* Timeline (left) */}
        <div style={{ 
          position: 'relative',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(15,23,42,0.3)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
              Timeline View
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Chronological audit trail with SLA and failure indicators
            </p>
          </div>
          <div style={{ height: '600px' }}>
            <GuardianD3Visualization
              networkData={networkData}
              auditData={auditData}
              viewMode="timeline"
              filters={filters}
              animationSpeed={animationSpeed}
              isLoading={isLoading}
              isRealTime={isRealTime}
              prefixDataTestId={`${prefixDataTestId}-timeline`}
            />
          </div>
        </div>

        {/* Network Graph (right) */}
        <div style={{ 
          position: 'relative',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(15,23,42,0.3)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb', margin: 0, marginBottom: '4px' }}>
              Network Graph
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Force-directed view showing relationships and dependencies
            </p>
          </div>
          <div style={{ height: '600px' }}>
            <GuardianD3Visualization
              networkData={networkData}
              auditData={auditData}
              viewMode="force-directed"
              filters={filters}
              animationSpeed={animationSpeed}
              isLoading={isLoading}
              isRealTime={isRealTime}
              prefixDataTestId={`${prefixDataTestId}-force-directed`}
            />
          </div>
        </div>
      </div>

      {/* SLA Violations Row: Flow (left) and Task (right) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginTop: '24px'
      }}>
        {/* SLA Violations - Flow Level */}
        <div style={{ 
          position: 'relative',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(15,23,42,0.3)'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#e5e7eb',
              margin: 0,
              marginBottom: '4px'
            }}>
              SLA Violations (Flows)
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Worst offending flows requiring attention
            </p>
          </div>
          <div style={{ height: '380px' }}>
            <D3SLAViolationList
              workflowData={networkData?.metadata}
              dimensions={{ width: 600, height: 380 }}
              filters={filters}
              prefixDataTestId={`${prefixDataTestId}-sla-violations-flows`}
              grouping="flow"
            />
          </div>
        </div>

        {/* SLA Violations - Task Level */}
        <div style={{ 
          position: 'relative',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(15,23,42,0.3)'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#e5e7eb',
              margin: 0,
              marginBottom: '4px'
            }}>
              SLA Violations (Tasks)
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Steps with the highest violation rates
            </p>
          </div>
          <div style={{ height: '380px' }}>
            <D3SLAViolationList
              workflowData={networkData?.metadata}
              dimensions={{ width: 600, height: 380 }}
              filters={filters}
              prefixDataTestId={`${prefixDataTestId}-sla-violations-tasks`}
              grouping="task"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guardian;
