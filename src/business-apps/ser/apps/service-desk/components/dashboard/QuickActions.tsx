import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Separator
} from '@newwork/nw-design-system';
import { 
  Plus, 
  List, 
  CheckCircle, 
  UserPlus, 
  TrendingUp, 
  BarChart3, 
  AlertTriangle, 
  Settings,
  Search,
  FileText,
  Users,
  Clock,
  Target
} from 'lucide-react';

/**
 * Quick Actions Panel Component - Contextual action buttons and shortcuts
 * Provides smart shortcuts based on user role and current workload
 */
export interface QuickActionsProps extends BusinessAppContextProps {
  onNavigate?: (path: string) => void;
}

// Action item interface
interface ActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: {
    count: number;
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
  };
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'create' | 'manage' | 'analyze' | 'admin';
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNavigate,
  // accessToken and userInfo reserved for future user-specific actions
}) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Generate contextual quick actions based on sample data
  const generateQuickActions = (): ActionItem[] => {
    return [
      // Create Actions
      {
        id: 'create-ticket',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.create_ticket',
          'Create New Ticket'
        ),
        description: 'Submit a new service request',
        icon: <Plus className="gba:h-4 gba:w-4" />,
        action: '/tickets/create',
        priority: 'high',
        category: 'create'
      },
      {
        id: 'create-bulk-import',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.bulk_import',
          'Bulk Import Tickets'
        ),
        description: 'Import multiple tickets from CSV',
        icon: <FileText className="gba:h-4 gba:w-4" />,
        action: '/tickets/import',
        priority: 'medium',
        category: 'create'
      },

      // Manage Actions
      {
        id: 'my-assignments',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.my_assignments',
          'My Assignments'
        ),
        description: 'View and manage assigned tickets',
        icon: <List className="gba:h-4 gba:w-4" />,
        badge: { count: 23, variant: 'default' },
        action: '/tickets/assigned',
        priority: 'high',
        category: 'manage'
      },
      {
        id: 'pending-approval',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.pending_approval',
          'Pending Approvals'
        ),
        description: 'Review tickets awaiting approval',
        icon: <Clock className="gba:h-4 gba:w-4" />,
        badge: { count: 7, variant: 'secondary' },
        action: '/tickets/pending',
        priority: 'medium',
        category: 'manage'
      },
      {
        id: 'escalated-tickets',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.escalated_tickets',
          'Escalated Tickets'
        ),
        description: 'Handle high-priority escalations',
        icon: <AlertTriangle className="gba:h-4 gba:w-4" />,
        badge: { count: 4, variant: 'destructive' },
        action: '/tickets/escalated',
        priority: 'high',
        category: 'manage'
      },
      {
        id: 'team-workload',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.team_workload',
          'Team Workload'
        ),
        description: 'Monitor team capacity and assignments',
        icon: <Users className="gba:h-4 gba:w-4" />,
        action: '/team/workload',
        priority: 'medium',
        category: 'manage'
      },

      // Analyze Actions
      {
        id: 'performance-report',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.performance_report',
          'Performance Report'
        ),
        description: 'Generate detailed analytics',
        icon: <BarChart3 className="gba:h-4 gba:w-4" />,
        action: '/reports/performance',
        priority: 'medium',
        category: 'analyze'
      },
      {
        id: 'sla-monitoring',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.sla_monitoring',
          'SLA Monitoring'
        ),
        description: 'Track service level compliance',
        icon: <Target className="gba:h-4 gba:w-4" />,
        badge: { count: 2, variant: 'outline' },
        action: '/reports/sla',
        priority: 'medium',
        category: 'analyze'
      },
      {
        id: 'trending-issues',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.trending_issues',
          'Trending Issues'
        ),
        description: 'Identify common problems',
        icon: <TrendingUp className="gba:h-4 gba:w-4" />,
        action: '/analytics/trends',
        priority: 'low',
        category: 'analyze'
      },

      // Admin Actions
      {
        id: 'manage-users',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.manage_users',
          'Manage Users'
        ),
        description: 'Add or modify user permissions',
        icon: <UserPlus className="gba:h-4 gba:w-4" />,
        action: '/admin/users',
        priority: 'low',
        category: 'admin'
      },
      {
        id: 'system-settings',
        title: getTranslationFromI18nKeyAndLabel(
          'services.dashboard.actions.system_settings',
          'System Settings'
        ),
        description: 'Configure service desk settings',
        icon: <Settings className="gba:h-4 gba:w-4" />,
        action: '/admin/settings',
        priority: 'low',
        category: 'admin'
      }
    ];
  };

  // Load actions on component mount
  useEffect(() => {
    setActions(generateQuickActions());
  }, []);

  // Filter actions by category
  const filteredActions = selectedCategory === 'all' 
    ? actions 
    : actions.filter(action => action.category === selectedCategory);

  // Sort actions by priority
  const sortedActions = filteredActions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Handle action click
  const handleActionClick = (action: ActionItem) => {
    console.log(`Quick Action: ${action.title} -> ${action.action}`);
    if (onNavigate) {
      onNavigate(action.action);
    }
  };

  // Category filter options
  const categories = [
    { id: 'all', label: 'All Actions', icon: <List className="gba:h-4 gba:w-4" /> },
    { id: 'create', label: 'Create', icon: <Plus className="gba:h-4 gba:w-4" /> },
    { id: 'manage', label: 'Manage', icon: <CheckCircle className="gba:h-4 gba:w-4" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart3 className="gba:h-4 gba:w-4" /> },
    { id: 'admin', label: 'Admin', icon: <Settings className="gba:h-4 gba:w-4" /> }
  ];

  return (
    <Card className="gba:border gba:bg-card" data-testid="quick-actions">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Target className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.actions.title',
              'Quick Actions'
            )}
          </div>
          <Badge variant="outline" className="gba:text-xs">
            {sortedActions.length} actions
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        {/* Category Filters */}
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gba:h-8 gba:text-xs"
            >
              {category.icon}
              <span className="gba:ml-1">{category.label}</span>
            </Button>
          ))}
        </div>

        <Separator />

        {/* Actions List */}
        <div className="gba:space-y-2">
          {sortedActions.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Search className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'services.dashboard.actions.no_actions',
                  'No actions available for this category'
                )}
              </p>
            </div>
          ) : (
            sortedActions.map((action) => (
              <div
                key={action.id}
                className={`
                  gba:group gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg 
                  gba:border gba:transition-all gba:duration-200 gba:cursor-pointer
                  gba:hover:bg-muted/50 gba:hover:border-primary/20 gba:hover:shadow-sm
                  ${action.priority === 'high' ? 'gba:border-l-4 gba:border-l-primary' : ''}
                `}
                onClick={() => handleActionClick(action)}
              >
                <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1 gba:min-w-0">
                  {/* Action Icon */}
                  <div className={`
                    gba:p-2 gba:rounded-md gba:flex-shrink-0
                    ${action.priority === 'high' ? 'gba:bg-primary/10 gba:text-primary' : 
                      action.priority === 'medium' ? 'gba:bg-secondary/10 gba:text-secondary-foreground' :
                      'gba:bg-muted gba:text-muted-foreground'}
                  `}>
                    {action.icon}
                  </div>

                  {/* Action Content */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <h4 className="gba:text-sm gba:font-medium gba:truncate">
                        {action.title}
                      </h4>
                      {action.badge && (
                        <Badge 
                          variant={action.badge.variant}
                          className="gba:text-xs gba:px-1.5 gba:py-0.5 gba:flex-shrink-0"
                        >
                          {action.badge.count}
                        </Badge>
                      )}
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                      {action.description}
                    </p>
                  </div>

                  {/* Priority Indicator */}
                  {action.priority === 'high' && (
                    <AlertTriangle className="gba:h-4 gba:w-4 gba:text-orange-500 gba:flex-shrink-0" />
                  )}
                </div>

                {/* Hover Arrow */}
                <div className="gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:duration-200">
                  <div className="gba:w-1.5 gba:h-4 gba:bg-primary gba:rounded-full" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <Separator />
        <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
          <div>
            <div className="gba:text-lg gba:font-semibold gba:text-primary">
              {actions.filter(a => a.priority === 'high').length}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.actions.high_priority',
                'High Priority'
              )}
            </div>
          </div>
          <div>
            <div className="gba:text-lg gba:font-semibold gba:text-secondary-foreground">
              {actions.filter(a => a.badge && a.badge.count > 0).reduce((sum, a) => sum + (a.badge?.count || 0), 0)}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.actions.pending_items',
                'Pending Items'
              )}
            </div>
          </div>
          <div>
            <div className="gba:text-lg gba:font-semibold gba:text-accent-foreground">
              {categories.length - 1}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.actions.categories',
                'Categories'
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
