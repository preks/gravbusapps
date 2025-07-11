import axios from 'axios';
import { FlowTemplate } from '../models/flowTemplate';
import { Task } from '../models/task';

/**
 * Client for interacting with the Flow API backend
 */
export class FlowApiClient {
  private baseUrl: string;
  private userId: string;
  
  constructor(baseUrl = 'http://localhost:3000', userId: string) {
    this.baseUrl = baseUrl;
    this.userId = userId;
  }
  
  /**
   * Set the user ID for API calls
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }
  
  /**
   * Get the axios instance with appropriate headers
   */
  private getAxiosInstance() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Id': this.userId,
      },
    });
  }
  
  /**
   * Get all templates
   */
  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.getAxiosInstance().get('/template');
    return response.data.data;
  }
  
  /**
   * Get a template by ID
   */
  async getTemplateById(id: string): Promise<FlowTemplate> {
    const response = await this.getAxiosInstance().get(`/template/${id}`);
    return response.data.data;
  }
  
  /**
   * Create a new template
   */
  async createTemplate(template: FlowTemplate): Promise<FlowTemplate> {
    const response = await this.getAxiosInstance().post('/template', template);
    return response.data.data;
  }
  
  /**
   * Update an existing template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const response = await this.getAxiosInstance().put(`/template/${id}`, template);
    return response.data.data;
  }
  
  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.getAxiosInstance().delete(`/template/${id}`);
  }
  
  /**
   * Get all tasks for the current user
   */
  async getTasks(): Promise<Task[]> {
    const response = await this.getAxiosInstance().get('/task');
    return response.data.data;
  }
  
  /**
   * Get a task by ID
   */
  async getTaskById(id: string): Promise<Task> {
    const response = await this.getAxiosInstance().get(`/task/${id}`);
    return response.data.data;
  }
  
  /**
   * Claim a task
   */
  async claimTask(id: string): Promise<Task> {
    const response = await this.getAxiosInstance().post(`/task/${id}/claim`, {});
    return response.data.data;
  }
  
  /**
   * Complete a task
   */
  async completeTask(id: string, output: any): Promise<Task> {
    const response = await this.getAxiosInstance().post(`/task/${id}/complete`, output);
    return response.data.data;
  }
}
