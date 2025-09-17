import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Card, 
  CardContent,
  Badge,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system';
import { 
  Upload, 
  FileText, 
  ChartBar, 
  MagnifyingGlass,
  Plus,
  Funnel,
  Building,
  Calendar,
  CurrencyDollar,
  TrendUp
} from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentReportPortalIntegration } from './hooks/useInvestmentReportPortalIntegration';
import { ReportList, ReportAnalytics, ReportFilters } from './components';
import type { ReportScope } from '@/common/data/investment';

interface InvestmentReportPortalProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const InvestmentReportPortal: React.FC<InvestmentReportPortalProps> = ({
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'InvestmentReportPortal'
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState({
    search: '',
    investmentType: 'ALL' as 'ALL' | string,
    reportScope: 'ALL' as 'ALL' | ReportScope,
    dateRange: null as [string, string] | null,
    status: 'ALL' as 'ALL' | string
  });

  const {
    reports,
    investments,
    accounts,
    contacts,
    isLoading,
    error,
    refetch
  } = useInvestmentReportPortalIntegration({
    accessToken,
    userInfo,
    additionalData
  });

  // Filter investments to only show those relevant to the external user
  // This would be based on the user's company/account association
  const userRelevantInvestments = investments.filter(investment => {
    // TODO: Implement proper filtering based on user's company association
    // For now, show all investments - this should be filtered by the user's company
    return true;
  });

  // Filter reports to only show those for the user's investments
  const userRelevantReports = reports.filter(report => {
    return userRelevantInvestments.some(inv => inv.id === report.investment?.id);
  });

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const handleUploadReport = useCallback(() => {
    // TODO: Trigger platform action to open investment-report-form
    console.log('Platform action: Open investment report form for upload');
    
    if (typeof window !== 'undefined' && (window as any).platformActions) {
      (window as any).platformActions.openForm('investment-report-form', { mode: 'upload' });
    }
  }, []);

  const handleCreateReport = useCallback(() => {
    console.log('Platform action: Open investment report form for creation');
    
    if (typeof window !== 'undefined' && (window as any).platformActions) {
      (window as any).platformActions.openForm('investment-report-form', { mode: 'create' });
    }
  }, []);

  const handleEditReport = useCallback((reportId: string) => {
    console.log('Platform action: Open investment report form for editing:', reportId);
    
    if (typeof window !== 'undefined' && (window as any).platformActions) {
      (window as any).platformActions.openForm('investment-report-form', { 
        mode: 'edit', 
        reportId 
      });
    }
  }, []);

  if (!accessToken) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert variant="destructive">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel('error.noAccessToken', 'No access token found. Please ensure you are properly authenticated.')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              style={{ marginLeft: '16px' }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'Container')}>
      {/* Welcome Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
              {getTranslationFromI18nKeyAndLabel('portal.welcomeTitle', 'Welcome to Your Investment Portal')}
            </h1>
            <p style={{ margin: '0 0 24px 0', fontSize: '16px', opacity: 0.9 }}>
              {getTranslationFromI18nKeyAndLabel('portal.welcomeDescription', 'Upload and manage your company\'s investment reports to keep us informed about your progress.')}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                data-testid={formatDataTestId(prefixDataTestId, 'UploadButton')}
                onClick={handleUploadReport}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: 'none'
                }}
              >
                <Upload size={16} />
                {getTranslationFromI18nKeyAndLabel('button.uploadReport', 'Upload Report')}
              </Button>
              <Button
                data-testid={formatDataTestId(prefixDataTestId, 'CreateButton')}
                onClick={handleCreateReport}
                variant="ai"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  borderColor: 'white',
                  color: 'white'
                }}
              >
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('button.createReport', 'Create Report')}
              </Button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
              {getTranslationFromI18nKeyAndLabel('portal.activeInvestments', 'Active Investments')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>
              {userRelevantInvestments.length}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <FileText size={20} style={{ color: '#3f8600' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {getTranslationFromI18nKeyAndLabel('dashboard.totalReports', 'Total Reports')}
              </h3>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3f8600' }}>
              {userRelevantReports.length}
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
              {getTranslationFromI18nKeyAndLabel('dashboard.reportsDescription', 'Reports submitted to date')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Calendar size={20} style={{ color: '#1890ff' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {getTranslationFromI18nKeyAndLabel('dashboard.recentReports', 'Recent Reports')}
              </h3>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1890ff' }}>
              {userRelevantReports.filter(r => {
                if (!r.date) return false;
                const reportDate = new Date(r.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return reportDate >= thirtyDaysAgo;
              }).length}
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
              {getTranslationFromI18nKeyAndLabel('dashboard.recentDescription', 'Last 30 days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendUp size={20} style={{ color: '#722ed1' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {getTranslationFromI18nKeyAndLabel('dashboard.avgReturn', 'Avg. Return')}
              </h3>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#722ed1' }}>
              {userRelevantReports.length > 0 
                ? `${((userRelevantReports.reduce((sum, r) => {
                    // Calculate return percentage based on available data
                    if (r.investmentMarketValue && r.totalInvestmentAmount) {
                      const returnAmount = r.investmentMarketValue - r.totalInvestmentAmount;
                      return sum + ((returnAmount / r.totalInvestmentAmount) * 100);
                    }
                    return sum;
                  }, 0) / userRelevantReports.length) || 0).toFixed(1)}%`
                : '0.0%'
              }
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
              {getTranslationFromI18nKeyAndLabel('dashboard.returnDescription', 'Average across all reports')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <CurrencyDollar size={20} style={{ color: '#fa8c16' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {getTranslationFromI18nKeyAndLabel('dashboard.totalValue', 'Total Value')}
              </h3>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#fa8c16' }}>
              ${(userRelevantReports.reduce((sum, r) => sum + (r.investmentMarketValue || 0), 0) / 1000000).toFixed(1)}M
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
              {getTranslationFromI18nKeyAndLabel('dashboard.valueDescription', 'Current market value')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ marginBottom: '24px' }}>
          <TabsTrigger value="dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChartBar size={16} />
            {getTranslationFromI18nKeyAndLabel('tab.dashboard', 'Dashboard')}
          </TabsTrigger>
          <TabsTrigger value="reports" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} />
            {getTranslationFromI18nKeyAndLabel('tab.reports', 'My Reports')}
          </TabsTrigger>
          <TabsTrigger value="investments" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} />
            {getTranslationFromI18nKeyAndLabel('tab.investments', 'My Investments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Recent Activity */}
            <Card>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  {getTranslationFromI18nKeyAndLabel('dashboard.recentActivity', 'Recent Activity')}
                </h3>
                <ReportList
                  reports={userRelevantReports.slice(0, 5)}
                  onEdit={handleEditReport}
                  prefixDataTestId={prefixDataTestId}
                  showPagination={false}
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  {getTranslationFromI18nKeyAndLabel('dashboard.quickActions', 'Quick Actions')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    onClick={handleUploadReport}
                    style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                  >
                    <Upload size={16} style={{ marginRight: '8px' }} />
                    {getTranslationFromI18nKeyAndLabel('action.uploadReport', 'Upload New Report')}
                  </Button>
                  <Button
                    onClick={handleCreateReport}
                    variant="outline"
                    style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                  >
                    <Plus size={16} style={{ marginRight: '8px' }} />
                    {getTranslationFromI18nKeyAndLabel('action.createReport', 'Create Report')}
                  </Button>
                </div>
                
                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                    {getTranslationFromI18nKeyAndLabel('dashboard.helpTitle', 'Need Help?')}
                  </h4>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                    {getTranslationFromI18nKeyAndLabel('dashboard.helpText', 'Contact your investment manager for assistance with report submissions.')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {getTranslationFromI18nKeyAndLabel('reports.title', 'My Reports')}
                </h3>
                <Button
                  onClick={handleUploadReport}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} />
                  {getTranslationFromI18nKeyAndLabel('button.uploadReport', 'Upload Report')}
                </Button>
              </div>
              
              <ReportFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                prefixDataTestId={prefixDataTestId}
              />
              
              <div style={{ marginTop: '20px' }}>
                <ReportList
                  reports={userRelevantReports}
                  onEdit={handleEditReport}
                  prefixDataTestId={prefixDataTestId}
                  showPagination={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments">
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                {getTranslationFromI18nKeyAndLabel('investments.title', 'My Investments')}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {userRelevantInvestments.map(investment => (
                  <Card key={investment.id} style={{ border: '1px solid #e5e7eb' }}>
                    <CardContent style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          {investment.name}
                        </h4>
                        <Badge variant="secondary">
                          {investment.investmentType?.value || 'Investment'}
                        </Badge>
                      </div>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                          {getTranslationFromI18nKeyAndLabel('investment.code', 'Code')}: {investment.code || 'N/A'}
                        </p>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                          {getTranslationFromI18nKeyAndLabel('investment.status', 'Status')}: {investment.investmentStatus?.value || 'Active'}
                        </p>
                        {investment.totalInvestmentAmount && (
                          <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                            {getTranslationFromI18nKeyAndLabel('investment.amount', 'Amount')}: ${(investment.totalInvestmentAmount / 1000000).toFixed(1)}M
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateReport()}
                        style={{ width: '100%' }}
                      >
                        {getTranslationFromI18nKeyAndLabel('button.createReport', 'Create Report')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {userRelevantInvestments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <Building size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>{getTranslationFromI18nKeyAndLabel('investments.noInvestments', 'No investments found for your account.')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestmentReportPortal;
