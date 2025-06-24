import React, { ReactNode } from 'react';
import { Row, Col, Card, Skeleton, Alert, Button, Typography } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface WidgetItem {
  key: string;
  title: string;
  value: number | string | undefined | null;
  prefix?: ReactNode;
  suffix?: ReactNode;
  color?: string;
  precision?: number;
  span?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /**
   * Optional description text to show below the value
   */
  description?: string;
  customContent?: ReactNode;
  /**
   * Optional click handler for the widget
   */
  onClick?: () => void;
}

export interface WidgetGroupProps {
  /**
   * Array of widget items to display
   */
  widgets: WidgetItem[];
  
  /**
   * Flag to indicate if data is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message or null if no error
   */
  error?: string | Error | null;
  
  /**
   * Function to call when retry button is clicked
   */
  onRetry?: () => void;
  
  /**
   * Function to call when a widget is clicked
   */
  onWidgetClick?: (widgetKey: string) => void;
  
  /**
   * Custom class names to apply to the container
   */
  className?: string;
  
  /**
   * Gap between widgets
   */
  gutter?: number | [number, number];
  
  /**
   * Whether cards should be hoverable
   */
  hoverable?: boolean;
  
  /**
   * Default column span for each widget if not specified in the widget item
   */
  defaultSpan?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  /**
   * Number of placeholder skeletons to show when loading
   */
  skeletonCount?: number;
  
  /**
   * Text to show when widgets array is empty
   */
  emptyText?: string;
  
  /**
   * Background for each card
   */
  cardBackground?: string;
}

/**
 * A component that displays a group of widgets with consistent height
 */
export const WidgetGroup: React.FC<WidgetGroupProps> = ({
  widgets,
  isLoading = false,
  error = null,
  onRetry,
  onWidgetClick,
  className = 'gba:py-2',
  gutter = [16, 16],
  hoverable = true,
  defaultSpan = { xs: 24, sm: 12, md: 8, lg: 6 },
  skeletonCount = 4,
  emptyText = 'No data available',
  cardBackground = 'white',
}) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div className={className}>
        <Row gutter={gutter}>
          {[...Array(skeletonCount)].map((_, index) => (
            <Col 
              key={`skeleton-${Math.random().toString(36).substring(2, 11)}-${index}`} 
              xs={defaultSpan.xs} 
              sm={defaultSpan.sm} 
              md={defaultSpan.md} 
              lg={defaultSpan.lg}
              xl={defaultSpan.xl}
            >
              <Card size="small" style={{ background: cardBackground, padding: '16px', height: '140px' }}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  // Handle error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    return (
      <div className={className}>
        <Alert
          message="Error Loading Data"
          description={errorMessage}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            onRetry && (
              <Button icon={<ReloadOutlined />} onClick={onRetry} size="small">
                Retry
              </Button>
            )
          }
        />
      </div>
    );
  }

  // Handle empty state
  if (!widgets || widgets.length === 0) {
    return (
      <div className={`${className} gba:text-center`}>
        <Text type="secondary">{emptyText}</Text>
        {onRetry && (
          <Button icon={<ReloadOutlined />} onClick={onRetry} style={{ marginTop: 8 }} size="small">
            Load Data
          </Button>
        )}
      </div>
    );
  }

  // Display widgets
  return (
    <div className={className}>
      <Row gutter={gutter}>
        {widgets.map((widget) => (
          <Col
            key={widget.key}
            xs={widget.span?.xs ?? defaultSpan.xs}
            sm={widget.span?.sm ?? defaultSpan.sm}
            md={widget.span?.md ?? defaultSpan.md}
            lg={widget.span?.lg ?? defaultSpan.lg}
            xl={widget.span?.xl ?? defaultSpan.xl}
          >
            <Card
              size="small"
              hoverable={hoverable}
              style={{ background: cardBackground, padding: '16px', height: '140px', cursor: widget.onClick || onWidgetClick ? 'pointer' : 'auto' }}
              onClick={() => {
                if (widget.onClick) {
                  widget.onClick();
                }
                if (onWidgetClick) {
                  onWidgetClick(widget.key);
                }
              }}
              className="gba:flex gba:flex-col gba:overflow-hidden" // Fixed height with overflow handling
            >
              {widget.customContent || (
                <div className="gba:statistic-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="gba:statistic-title ant-statistic-title" style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>{widget.title}</div>
                  <div 
                    className="gba:statistic-value ant-statistic-content" 
                    style={{ color: widget.color ?? 'inherit' }}
                  >
                    {widget.prefix && (
                      <span className="gba:statistic-prefix ant-statistic-content-prefix" style={{ marginRight: '8px', fontSize: '24px', display: 'inline-flex', alignItems: 'center' }}>
                        {widget.prefix}
                      </span>
                    )}
                    <span className="ant-statistic-content-value" style={{ fontSize: '24px', fontWeight: 600 }}>
                      {typeof widget.value === 'number' && widget.precision !== undefined ? (
                        <>
                          <span className="ant-statistic-content-value-int">
                            {Math.floor(widget.value).toString()}
                          </span>
                          <span className="ant-statistic-content-value-decimal">
                            {`.${widget.value.toFixed(widget.precision).split('.')[1]}`}
                          </span>
                        </>
                      ) : (
                        widget.value ?? 0
                      )}
                    </span>
                    {widget.suffix && (
                      <span className="gba:statistic-suffix ant-statistic-content-suffix" style={{ marginLeft: '4px' }}>
                        {widget.suffix}
                      </span>
                    )}
                  </div>
                  {widget.description && (
                    <span className="ant-typography ant-typography-secondary" style={{ fontSize: '12px' }}>
                      {widget.description}
                    </span>
                  )}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default WidgetGroup;