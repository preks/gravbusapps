import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system';
import { PlayCircleIcon, InfoIcon } from '@phosphor-icons/react';
import { QueryDefinition, QueryType } from '@/common/network/dataset';

interface QueryListProps {
  queries: QueryDefinition[];
  onExecuteQuery: (query: QueryDefinition) => void;
  isExecuting: boolean;
}

export const QueryList: React.FC<QueryListProps> = ({
  queries,
  onExecuteQuery,
  isExecuting
}) => {
  const getQueryTypeVariant = (type: QueryType) => {
    return type === QueryType.DATASET ? 'ext2' : 'ext5';
  };

  const getParameterTypeVariant = (type: string) => {
    switch (type) {
      case 'DATE': return 'ext7';
      case 'CONTROL': return 'ext8';
      case 'NUMBER': return 'ext3';
      case 'BOOLEAN': return 'ext6';
      default: return 'secondary';
    }
  };

  return (
    <TooltipProvider>
      <div data-testid="query-executor-query-list" style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}>
        <h4 className="gba:text-xl gba:font-semibold" style={{
          color: 'var(--color-foreground)',
          margin: '0 0 var(--spacing-4) 0',
          flexShrink: 0
        }}>
          Available Queries ({queries.length})
        </h4>
        
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: 'var(--spacing-2)', // Account for scrollbar
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-4)'
        }}>
          {queries.map((query) => (
          <Card
            key={query.id || query.name}
            data-testid={`query-card-${query.name}`}
            style={{ marginBottom: 'var(--spacing-4)' }}
          >
            <CardHeader style={{ 
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 'var(--spacing-4)',
              gap: 'var(--spacing-4)'
            }}>
              <CardTitle className="gba:flex gba:items-center gba:flex-1" style={{ 
                gap: 'var(--spacing-2)',
                minWidth: 0 /* Allow title to shrink */
              }}>
                <span className="gba:font-bold gba:truncate">{query.name}</span>
                <Badge variant={getQueryTypeVariant(query.queryType)}>
                  {query.queryType}
                </Badge>
                <Badge
                  variant="default"
                  style={{
                    backgroundColor: 'var(--color-success)',
                    color: 'var(--color-on-success)'
                  }}
                >
                  {query.status}
                </Badge>
              </CardTitle>
              <div style={{ flexShrink: 0 }}>
                <Button
                  variant="default"
                  onClick={() => onExecuteQuery(query)}
                  disabled={isExecuting}
                  data-testid={`execute-button-${query.name}`}
                  className="gba:flex gba:items-center"
                  style={{ gap: 'var(--spacing-2)' }}
                >
                  <PlayCircleIcon size={16} />
                  Execute
                </Button>
              </div>
            </CardHeader>

            <CardContent style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)'
            }}>
              <p style={{
                color: 'var(--color-muted-foreground)',
                margin: '0 0 var(--spacing-2) 0'
              }}>
                {query.description}
              </p>

              {query.parameters.length > 0 && (
                <div>
                  <p className="gba:flex gba:items-center gba:font-bold" style={{ marginBottom: 'var(--spacing-2)' }}>
                    <InfoIcon style={{ marginRight: 'var(--spacing-1)' }} />
                    Parameters ({query.parameters.length}):
                  </p>
                  <div className="gba:flex gba:flex-wrap" style={{ gap: 'var(--spacing-2)' }}>
                    {query.parameters.map((param) => (
                      <Tooltip key={param.name}>
                        <TooltipTrigger>
                          <Badge
                            variant={getParameterTypeVariant(param.type)}
                            data-testid={`parameter-${param.name}`}
                          >
                            {param.name}: {param.type}
                            {param.required && ' *'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{param.description} {param.required ? '(Required)' : '(Optional)'}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {query.additionalColumns.length > 0 && (
                <div>
                  <p className="gba:font-bold gba:block" style={{ margin: '0 0 var(--spacing-2) 0' }}>
                    Additional Columns:
                  </p>
                  <div className="gba:flex gba:flex-wrap" style={{ gap: 'var(--spacing-2)' }}>
                    {query.additionalColumns.map((col) => (
                      <Badge key={col.name} variant="outline">
                        {col.name}: {col.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </TooltipProvider>
  );
}; 