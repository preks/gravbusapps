# Flow Creator Backend Integration Guide

This guide explains how to integrate the Flow Creator backend with the Flow Creator frontend application.

## Prerequisites

1. OSS Conductor running on `localhost:8080`
2. Flow Backend Service running on `localhost:3000`

## Integration Steps

### 1. Import the Flow API Client

Add the following import to your Flow Creator component:

```typescript
import { FlowApiClient } from '../../business-flows/src/clients/flowApiClient';
```

### 2. Initialize the Client

In your Flow Creator component, initialize the client with the current user:

```typescript
// Inside your Flow Creator component
const { accessToken, user, employeeId } = props;

// Initialize the Flow API client
const flowApiClient = useMemo(() => {
  return new FlowApiClient('http://localhost:3000', employeeId);
}, [employeeId]);
```

### 3. Create Hooks for API Interaction

Create custom hooks for working with templates:

```typescript
// src/business-apps/flow/apps/creator/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react';
import { FlowTemplate } from '../types/flowTemplate';
import { FlowApiClient } from '../../../../business-flows/src/clients/flowApiClient';

export const useTemplates = (client: FlowApiClient) => {
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.getTemplates();
      setTemplates(data);
    } catch (err) {
      setError('Failed to fetch templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Create template
  const createTemplate = useCallback(async (template: FlowTemplate) => {
    try {
      setLoading(true);
      setError(null);
      const newTemplate = await client.createTemplate(template);
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      setError('Failed to create template');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Update template
  const updateTemplate = useCallback(async (id: string, template: Partial<FlowTemplate>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedTemplate = await client.updateTemplate(id, template);
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      setError('Failed to update template');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await client.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete template');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
};
```

### 4. Integrate with Flow Creator UI

Update your Flow Creator component to use the new hooks:

```tsx
// Inside your Flow Creator component
const {
  templates,
  loading,
  error,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = useTemplates(flowApiClient);

// Use these functions with your existing UI components
const handleSaveTemplate = async (template: FlowTemplate) => {
  if (template.id) {
    await updateTemplate(template.id, template);
  } else {
    await createTemplate(template);
  }
};
```

### 5. Task Handling

For tasks that require claiming:

```tsx
// Task handling
const handleClaimTask = async (taskId: string) => {
  try {
    await flowApiClient.claimTask(taskId);
    // Update your UI or fetch tasks again
  } catch (error) {
    console.error('Failed to claim task', error);
  }
};

const handleCompleteTask = async (taskId: string, output: any) => {
  try {
    await flowApiClient.completeTask(taskId, output);
    // Update your UI or fetch tasks again
  } catch (error) {
    console.error('Failed to complete task', error);
  }
};
```

## Backend Services Setup

Start both services to enable full functionality:

```bash
# Start OSS Conductor (assuming Docker setup)
docker-compose up -d

# Start the Flow Backend Service
cd src/business-flows
npm install
npm run dev
```

## Testing Integration

1. Start the Conductor server
2. Start the Flow Backend Service
3. Start your frontend development server
4. Create a flow template in the Flow Creator UI
5. Verify that the template is saved to the backend
6. Test task claiming and completion through the UI
