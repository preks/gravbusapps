import { ReactNode } from 'react';
import { Typography, Button, Row, Col } from 'antd';
import './styles/PageHeader.css';

const { Title, Paragraph } = Typography;

export interface PageHeaderProps {
  /**
   * The title to display in the header
   */
  title: string;
  
  /**
   * Optional description to display below the title
   */
  description?: string;
  
  /**
   * Optional primary action button configuration
   */
  primaryAction?: {
    /**
     * Button text
     */
    label: string;
    
    /**
     * Icon component to display before the label
     */
    icon?: ReactNode;
    
    /**
     * Callback function when button is clicked
     */
    onClick: () => void;
    
    /**
     * Optional test ID for the button
     */
    testId?: string;
  };
  
  /**
   * Optional additional actions to display in the header (typically buttons)
   */
  additionalActions?: ReactNode;
  
  /**
   * Optional additional CSS class names
   */
  className?: string;
}

/**
 * PageHeader component for CRM screens
 * Provides a consistent header with title, description, and action buttons
 */
export const PageHeader = ({
  title,
  description,
  primaryAction,
  additionalActions,
  className = '',
}: PageHeaderProps) => {
  return (
    <Row 
      justify="space-between" 
      align="middle" 
      className={`gba:header-row ${className}`}
      style={{ marginBottom: '24px' }}
      data-testid="page-header"
    >
      <Col>
        <Title level={3} style={{ margin: 0 }} className="gba:page-title" data-testid="page-header-title">
          {title}
        </Title>
        {description && (
          <Paragraph className="gba:page-description" data-testid="page-header-description">
            {description}
          </Paragraph>
        )}
      </Col>
      <Col>
        {additionalActions}
        {primaryAction && (
          <Button
            type="primary"
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
            className="gba:create-button"
            data-testid={primaryAction.testId || "page-header-primary-action"}
          >
            {primaryAction.label}
          </Button>
        )}
      </Col>
    </Row>
  );
};
