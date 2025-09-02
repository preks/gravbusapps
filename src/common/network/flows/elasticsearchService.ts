import { env } from '@/common/env/EnvUtils';

export interface ElasticsearchConfig {
  endpoint: string;
  username?: string;
  password?: string;
}

/**
 * Elasticsearch service for task indexing and search
 */
export class ElasticsearchService {
  private config: ElasticsearchConfig;

  constructor() {
    let elasticsearchUsername = '';
    let elasticsearchPassword = '';

    try {
      elasticsearchUsername = env('ELASTICSEARCH_USERNAME') || '';
    } catch (error) {
      elasticsearchUsername = '';
    }
    
    try {
      elasticsearchPassword = env('ELASTICSEARCH_PASSWORD') || '';
    } catch (error) {
      elasticsearchPassword = '';
    }

    this.config = {
      endpoint: env('NEXT_PUBLIC_ELASTICSEARCH_ENDPOINT') || 'http://localhost:9200',
      username: elasticsearchUsername,
      password: elasticsearchPassword
    };
  }

  /**
   * Get authorization headers for Elasticsearch requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.username && this.config.password) {
      const auth = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Check if task assignment index template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.endpoint}/_index_template/${templateName}`,
        {
          method: 'HEAD',
          headers: this.getAuthHeaders()
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error checking template existence:', error);
      return false;
    }
  }

  /**
   * Create or update task assignment index template
   */
  async createTaskAssignmentTemplate(): Promise<boolean> {
    const templateName = 'conductor_task_assignment_template';
    
    // Check if template already exists
    if (await this.templateExists(templateName)) {
      console.log('Task assignment template already exists, skipping creation');
      return true;
    }

    const template = {
      index_patterns: ['conductor_task_*'],
      priority: 100,
      template: {
        mappings: {
          properties: {
            input: {
              properties: {
                assignment: {
                  properties: {
                    userIds: {
                      type: 'keyword'
                    },
                    organizationalUnits: {
                      type: 'keyword'
                    },
                    matrixTeams: {
                      type: 'keyword'
                    },
                    companies: {
                      type: 'keyword'
                    },
                    siteLocations: {
                      type: 'keyword'
                    },
                    costCenters: {
                      type: 'keyword'
                    },
                    capabilities: {
                      type: 'keyword'
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(
        `${this.config.endpoint}/_index_template/${templateName}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(template)
        }
      );

      if (response.ok) {
        console.log('Task assignment index template created successfully');
        return true;
      } else {
        const error = await response.text();
        console.error('Failed to create task assignment template:', error);
        return false;
      }
    } catch (error) {
      console.error('Error creating task assignment template:', error);
      return false;
    }
  }

  /**
   * Search for claimable tasks using assignment criteria
   */
  async searchClaimableTasks(query: object, indexName: string = 'conductor_task_*'): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.endpoint}/${indexName}/_search`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(query)
        }
      );

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.text();
        console.error('Failed to search tasks:', error);
        return null;
      }
    } catch (error) {
      console.error('Error searching tasks:', error);
      return null;
    }
  }

  /**
   * Initialize Elasticsearch service on startup
   */
  async initialize(): Promise<void> {
    console.log('Initializing Elasticsearch service...');
    
    try {
      // Create task assignment template
      await this.createTaskAssignmentTemplate();
      console.log('Elasticsearch service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Elasticsearch service:', error);
    }
  }
}

// Singleton instance
export const elasticsearchService = new ElasticsearchService(); 