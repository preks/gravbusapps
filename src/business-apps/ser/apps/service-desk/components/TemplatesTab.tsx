import React from 'react';
import { 
  Card, Button, Space, Typography, Alert
} from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text, Title } = Typography;

export interface TemplatesTabProps extends BusinessAppContextProps {}

/**
 * TemplatesTab - Simple version to prevent module loading issues
 * Shows templates from custom-flow-engine workflow system
 */
export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  accessToken,
  userInfo
}) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div data-testid="templates-tab" className="gba:p-6 gba:space-y-6">
      {/* Header */}
      <Card size="small">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <Title level={4} className="gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('services.templates.title', 'Workflow Templates')}
            </Title>
            <Text type="secondary" className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'services.templates.description', 
                'Templates available from the workflow engine'
              )}
            </Text>
          </div>
          
          <Button
            type="primary"
            onClick={handleRefresh}
            data-testid="refresh-templates"
          >
            {getTranslationFromI18nKeyAndLabel('services.templates.refresh', 'Refresh')}
          </Button>
        </div>
      </Card>

      {/* Templates Content */}
      <Card>
        <div className="gba:text-center gba:py-16">
          <div className="gba:space-y-4">
            <Text type="secondary" className="gba:text-lg">
              {getTranslationFromI18nKeyAndLabel(
                'services.templates.loading', 
                'Templates functionality is being loaded...'
              )}
            </Text>
            <Text type="secondary" className="gba:text-sm gba:block">
              {getTranslationFromI18nKeyAndLabel(
                'services.templates.info', 
                'This will show templates from custom-flow-engine when available'
              )}
            </Text>
            <Button 
              type="default" 
              onClick={handleRefresh}
              className="gba:mt-4"
            >
              {getTranslationFromI18nKeyAndLabel('services.templates.check_again', 'Check Again')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};