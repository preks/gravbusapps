# Content Debug App

Debug tool for testing the Content Data Foundation with real data from the GraphQL backend.

## Purpose

This app provides a comprehensive testing interface for all content-related GraphQL queries including:

- Content entries with filtering (role, group, type, search)
- Single content entry by ID
- Child content entries (comments hierarchy)
- Content documents
- Content reactions
- Content statistics

## Features

- **Real-time Query Testing**: Execute GraphQL queries and see immediate results
- **Comprehensive Filters**: Test with different roles, groups, types, and search terms
- **Performance Metrics**: See query execution time for each test
- **Data Inspection**: View full GraphQL responses in collapsible panels
- **Query Visibility**: Inspect the actual GraphQL query being executed

## Usage

1. Navigate to Platform → Debug Tools → Content Debug
2. Use the filters to configure your test parameters
3. Click individual test buttons or "Run All Tests" to execute
4. Inspect results, errors, and performance metrics
5. Click "Clear Results" to reset

## Test Categories

### Content Data Tests

- **Content Entries**: List content entries with filtering
- **Content Entry by ID**: Get single entry with full details
- **Child Entries (Comments)**: Get comment hierarchy for a parent entry
- **Content Documents**: List documents with filtering
- **Content Reactions**: Get reactions for a content entry
- **Content Statistics**: Get aggregate statistics

## Notes

- Uses the real GraphQL backend (not mock data)
- All queries use the central dataset from `src/common/data/content`
- Queries are automatically built with correct field names (singular relations)
- Access token from BusinessAppContext is used for authentication
