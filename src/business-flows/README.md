# Flow Backend Service

This service provides backend functionality for the Flow Creator application, enabling:

- Creation and management of flow templates
- Integration with OSS Conductor (localhost:8080)
- Custom CLAIM task type implementation
- Task management APIs (fetch, claim)

## API Endpoints

### Templates
- `GET /template` - List all templates
- `GET /template/:id` - Get template by ID
- `POST /template` - Create a new template
- `PUT /template/:id` - Update a template
- `DELETE /template/:id` - Delete a template

### Tasks
- `GET /task` - List tasks for current user
- `GET /task/:id` - Get task details
- `POST /task/:id/claim` - Claim a task
- `POST /task/:id/complete` - Complete a task

## Conductor Integration

The service integrates with OSS Conductor running on localhost:8080 and handles:
- Workflow definitions
- Task definitions (including custom CLAIM type)
- Workflow execution
- Task execution

## Development

```bash
# Install dependencies
npm install

# Start the service
npm start
```
