import React from 'react';
import { 
  PageLayout,
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Button
} from '@newwork/nw-design-system';

export type LauncherSectionConfig = {
  id: string;
  title: string;
  description: string;
  cards: NavigationCardData[];
};

export type NavigationCardData = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  stats?: { value: string; label: string };
  actions?: { label: string; onClick: () => void }[];
  primaryAction?: { label: string; onClick: () => void };
  variant?: string;
  type?: 'analytics' | 'personal' | 'team' | 'settings' | 'calendar' | string;
};

export type QuickActionData = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  variant: string;
};

export type KpiData = {
  id: string;
  title: string;
  value: string;
  color: string;
};

export interface LauncherLayoutProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  headerKpis?: KpiData[];
  sections: LauncherSectionConfig[];
  quickActions?: QuickActionData[];
  quickActionsTitle?: string;
  quickActionsDescription?: string;
}

export const LauncherLayout: React.FC<LauncherLayoutProps> = ({
  title,
  description,
  icon: Icon,
  headerKpis = [],
  sections = [],
  quickActions = [],
  quickActionsTitle = 'Quick Actions',
  quickActionsDescription = 'Frequently used functions and shortcuts'
}) => {
  return (
    <PageLayout
      data-testid="launcher-layout"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
          {Icon && <Icon className="gba:w-6 gba:h-6" />}
          <h1 className="gba:text-2xl gba:font-bold">{title}</h1>
        </div>
        {description && <p className="gba:text-gray-500">{description}</p>}
      </div>
      {/* Header KPIs */}
      {headerKpis.length > 0 && (
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4 gba:mb-6">
          {headerKpis.map((kpi) => (
            <Card key={kpi.id} data-testid={`kpi-card-${kpi.id}`}>
              <CardHeader>
                <CardTitle>{kpi.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="gba:mb-6" data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle>{quickActionsTitle}</CardTitle>
            <CardDescription>{quickActionsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:flex-wrap gba:gap-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.id}
                    onClick={action.onClick}
                    variant={action.variant as any || "default"}
                    data-testid={`quick-action-${action.id}`}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <ActionIcon className="gba:w-4 gba:h-4" />
                    <span>{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.id} className="gba:mb-6" data-testid={`section-${section.id}`}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
              {section.cards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <Card key={card.id} data-testid={`card-${card.id}`}>
                    <CardHeader>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <CardIcon className="gba:w-5 gba:h-5" />
                        <CardTitle>{card.title}</CardTitle>
                      </div>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {card.stats && (
                        <div className="gba:mb-4">
                          <div className="gba:text-xl gba:font-bold">{card.stats.value}</div>
                          <div className="gba:text-sm gba:text-gray-500">{card.stats.label}</div>
                        </div>
                      )}
                      <div className="gba:flex gba:flex-col gba:gap-2">
                        {card.actions?.map((action, index) => (
                          <Button 
                            key={index} 
                            variant="outline" 
                            onClick={action.onClick}
                            data-testid={`card-${card.id}-action-${index}`}
                          >
                            {action.label}
                          </Button>
                        ))}
                        {card.primaryAction && (
                          <Button 
                            onClick={card.primaryAction.onClick}
                            data-testid={`card-${card.id}-primary-action`}
                          >
                            {card.primaryAction.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </PageLayout>
  );
};

export default LauncherLayout;
