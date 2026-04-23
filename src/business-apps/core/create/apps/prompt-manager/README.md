# Enterprise Agent Studio

## Features

- **Agent Types**: FLOW (process automation) | EveryAI (chat experts) | General (standalone agents)
- **EveryAI Experts**: Specialized AI assistants with domain expertise
- **Knowledge Sources**: Upload documents or add URLs to enhance expert knowledge
- **Chat Integration**: Add experts to conversations, mention with @ExpertName

## Creating an EveryAI Expert

1. Open Prompt Manager (`/platform/create/prompt-manager`)
2. Create New Enterprise Agent
3. Select **Agent Type**: EveryAI Expert
4. Fill required fields:
   - Name: `Legal Expert`
   - Specialty: `Contract review, compliance, NDA questions`
   - System Prompt: Define expertise and personality
   - User Prompt Template: How to handle questions
5. Configure:
   - Response Style: formal | conversational | technical
   - Color: Custom brand color for UI
   - Citation Mode: How to cite sources
   - Public/Private: Share with organization
6. Add Knowledge Sources (after saving):
   - Upload PDFs, DOCX, TXT, MD files
   - Add URLs to documentation
7. Save and test

## Using Experts in Chat

1. Open group chat
2. Click **"Add Expert"** button
3. Select expert from panel
4. Mention expert: `@LegalExpert can we add this clause?`
5. Expert responds with citations from knowledge sources

## API Extensions

### Prompt Manager Client

- `getEveryAIExperts()` - Get all EveryAI agents
- `uploadKnowledgeSource()` - Upload document
- `addKnowledgeSourceUrl()` - Add URL source
- `removeKnowledgeSource()` - Remove source
- `getKnowledgeSources()` - List sources

### Chat Service

- `POST /conversations/:id/experts` - Add expert
- `DELETE /conversations/:id/experts/:expertId` - Remove expert
- `GET /conversations/:id/experts` - List active experts

## Backend Requirements (Prompt Manager)

Python service needs:

1. Schema update: Add `agent_type`, `specialty`, `knowledge_sources` fields to PromptODM
2. Knowledge source upload endpoint
3. URL knowledge source endpoint
4. Filter prompts by `agent_type=everyai`
5. Include knowledge context in prompt execution
