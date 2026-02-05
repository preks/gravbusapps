# QueryClassifier - AI Agent

## Overview

**Agent Name:** `QueryClassifier`  
**Type:** General (Task Expert)  
**Description:** AI agent for classifying user queries as either keyword-based or natural language queries. Supports multilingual input.

## System Prompt

```text
You are a query classification agent. Your task is to analyze a user query and determine whether it is a KEYWORD query or a NATURAL_LANGUAGE query.

You MUST support queries in ANY language (English, German, Spanish, French, Chinese, Japanese, Arabic, etc.). Apply the same classification logic regardless of the input language.

## Classification Definitions

**KEYWORD Query:**
- Short, fragmented phrases using search terms
- Lacks grammatical structure (no verbs, incomplete sentences)
- Typically 1-5 words without question indicators
- Language-agnostic patterns: noun phrases, technical terms, product names
- Examples:
  - English: "react hooks", "python sort list", "aws s3 pricing"
  - German: "React Hooks", "Python Liste sortieren", "AWS Preise"
  - Spanish: "ordenar lista python", "precios aws"
  - French: "trier liste python", "prix aws"

**NATURAL_LANGUAGE Query:**
- Full sentences or questions with grammatical structure
- Contains question words or complete statements
- Expresses intent through natural speech patterns
- Examples:
  - English: "How do I sort a list in Python?", "What are React hooks used for?"
  - German: "Wie sortiere ich eine Liste in Python?", "Wofür werden React Hooks verwendet?"
  - Spanish: "Como ordeno una lista en Python?", "Para que sirven los React hooks?"
  - French: "Comment trier une liste en Python?", "A quoi servent les hooks React?"

## Classification Rules

1. **Question Indicators (any language):**
   - English: what, how, why, when, where, who, which, can, could, should, would, is, are, do, does
   - German: was, wie, warum, wann, wo, wer, welche, kann, könnte, sollte, ist, sind
   - Spanish: que, como, por que, cuando, donde, quien, cual, puede, podria
   - French: que, comment, pourquoi, quand, ou, qui, quel, peut, pourrait
   - If query starts with or contains a question indicator, classify as NATURAL_LANGUAGE

2. **Grammatical Structure:**
   - If the query is a complete sentence with subject-verb structure, classify as NATURAL_LANGUAGE
   - If the query is a fragmented phrase without verbs or grammatical connectors, classify as KEYWORD

3. **Length Heuristic:**
   - Short queries (1-3 words) without question indicators lean toward KEYWORD
   - Longer queries with punctuation (?, !) lean toward NATURAL_LANGUAGE

4. **Ambiguity Resolution:**
   - If ambiguous, prefer KEYWORD for queries under 4 words without question indicators
   - Consider punctuation: presence of "?" strongly indicates NATURAL_LANGUAGE

Your output must be valid JSON matching the Response Schema.
```

## User Prompt

```text
Classify the following query:

{query}
```

## Response Schema

```json
{
  "type": "object",
  "required": ["queryType", "confidence"],
  "properties": {
    "queryType": {
      "type": "string",
      "enum": ["KEYWORD", "NATURAL_LANGUAGE"],
      "description": "The classification of the query"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Confidence score between 0 and 1"
    },
    "detectedLanguage": {
      "type": "string",
      "description": "ISO 639-1 language code of the detected query language (e.g., 'en', 'de', 'es', 'fr')"
    },
    "reasoning": {
      "type": "string",
      "description": "Brief explanation for the classification decision"
    }
  }
}
```

## Tools

```json
[]
```

## Knowledge Sources

```json
[]
```

## Model Settings

```json
{
  "response_format": {
    "type": "json_object"
  }
}
```

## Registration Details

### Prompt Manager Configuration

```typescript
{
  name: 'QueryClassifier',
  description: 'AI agent for classifying queries as keyword or natural language (multilingual)',
  type: 'completion',
  workspaceId: 'your-workspace-id',
  modelId: 'gpt-4o-mini',
  userContent: QUERY_CLASSIFIER_USER_PROMPT,
  systemContent: QUERY_CLASSIFIER_SYSTEM_PROMPT,
  tools: [],
  responseSchema: QUERY_CLASSIFIER_OUTPUT_SCHEMA,
  modelSettings: {
    response_format: {
      type: 'json_object'
    }
  }
}
```

**Note:** Using `gpt-4o-mini` for cost efficiency since this is a simple classification task.

## TypeScript Interfaces

```typescript
export interface QueryClassifierInput {
  query: string
}

export interface QueryClassifierOutput {
  queryType: 'KEYWORD' | 'NATURAL_LANGUAGE'
  confidence: number
  detectedLanguage?: string
  reasoning?: string
}
```

## Service Implementation

```typescript
import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export class QueryClassifierService {
  private accessToken: string
  private readonly PROMPT_ID = 'QueryClassifier'

  constructor(accessToken: string) {
    this.accessToken = accessToken
    promptManagerClient.setAccessToken(accessToken)
  }

  async classifyQuery(input: QueryClassifierInput): Promise<QueryClassifierOutput> {
    const userPromptText = `Classify the following query:\n\n${input.query}`

    const formData = new FormData()
    formData.append('system_params', JSON.stringify({}))
    formData.append('user_params', JSON.stringify({ prompt: userPromptText }))

    const response = await promptManagerClient.executePromptById(this.PROMPT_ID, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as QueryClassifierOutput
  }
}
```

## Usage Example

```typescript
const service = new QueryClassifierService(accessToken)

// English keyword query
const result1 = await service.classifyQuery({ query: 'react hooks tutorial' })
// { queryType: 'KEYWORD', confidence: 0.95, detectedLanguage: 'en' }

// German natural language query
const result2 = await service.classifyQuery({ query: 'Wie verwende ich React Hooks?' })
// { queryType: 'NATURAL_LANGUAGE', confidence: 0.98, detectedLanguage: 'de' }

// Spanish keyword query
const result3 = await service.classifyQuery({ query: 'ordenar lista python' })
// { queryType: 'KEYWORD', confidence: 0.92, detectedLanguage: 'es' }

// French natural language query
const result4 = await service.classifyQuery({ query: 'Comment trier une liste en Python?' })
// { queryType: 'NATURAL_LANGUAGE', confidence: 0.97, detectedLanguage: 'fr' }
```

## Example Classifications

| Query                                             | Language | Classification   | Confidence |
| ------------------------------------------------- | -------- | ---------------- | ---------- |
| `react hooks`                                     | EN       | KEYWORD          | 0.95       |
| `How do I use React hooks?`                       | EN       | NATURAL_LANGUAGE | 0.98       |
| `Python Liste sortieren`                          | DE       | KEYWORD          | 0.90       |
| `Wie sortiere ich eine Liste in Python?`          | DE       | NATURAL_LANGUAGE | 0.97       |
| `ordenar lista python`                            | ES       | KEYWORD          | 0.92       |
| `Como ordeno una lista en Python?`                | ES       | NATURAL_LANGUAGE | 0.96       |
| `typescript interface vs type`                    | EN       | KEYWORD          | 0.88       |
| `Was ist der Unterschied zwischen let und const?` | DE       | NATURAL_LANGUAGE | 0.99       |

## Error Handling

```typescript
try {
  const result = await service.classifyQuery({ query: userInput })

  if (result.queryType === 'KEYWORD') {
    // Use keyword-based search
  } else {
    // Use semantic/NL search
  }
} catch (error) {
  console.error('Query Classification Error:', error)
  // Fallback: treat as keyword query
}
```

## Important Notes

- **Agent name:** `QueryClassifier` (must match exactly in Prompt Manager)
- **Multilingual support:** Handles queries in any language without explicit language detection
- **Model recommendation:** Use `gpt-4o-mini` for cost efficiency
- **Response time:** Expect ~200-500ms latency for classification
- **Fallback strategy:** On error, default to KEYWORD classification for robustness
