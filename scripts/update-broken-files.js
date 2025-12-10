#!/usr/bin/env node

import dotenv from '@dotenvx/dotenvx'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { OAuthClient } from './api-client.js'
import axios from 'axios'

/**
 * Migration script to fix InvestmentDocuments with broken file references
 *
 * This script:
 * 1. Finds all InvestmentDocuments where fileInfo == null and file != null
 * 2. For each document:
 *    - If file is a fileInfo string: parse and store in fileInfo
 *    - If file is just a fileId: fetch from files API and store in fileInfo
 * 3. Updates the document via Kogito endpoint
 *
 * Usage:
 * node scripts/update-broken-files.js [--dry-run]
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const FILE_SERVICE_ENDPOINT = process.env.NEXT_PUBLIC_FILE_SERVICE_ENDPOINT
const KOGITO_ENDPOINT = process.env.NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

/**
 * GraphQL query to find documents with file but no fileInfo
 */
const GET_BROKEN_DOCUMENTS_QUERY = `
query GetBrokenDocuments {
  InvestmentDocument(
    where: {
      fileInfo: { _isNull: true }
      file: { _isNull: false }
      isDeleted: { _eq: false }
    }
    orderBy: [{ createdAt: DESC }]
  ) {
    id
    version
    file
    name
    description
    createdAt
    investmentId
    opportunityId
    leadId
    contactId
    accountId
    activityId
    taskId
    noteId
  }
}
`

/**
 * Check if a string is a valid JSON
 */
function isValidJSON(str) {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * Check if string looks like a FileInfo string representation
 */
function isFileInfoString(str) {
  return str.includes('FileInfo(') || str.includes('appName=')
}

/**
 * Parse FileInfo string format to JSON object
 * Example: "FileInfo(appName=investmentRelations, fileId=abc123, ...)"
 */
function parseFileInfoString(fileInfoStr) {
  try {
    // Extract key-value pairs from FileInfo string
    const matches = fileInfoStr.matchAll(/(\w+)=([^,\s)]+)/g)
    const fileInfo = {}

    for (const match of matches) {
      const key = match[1]
      let value = match[2]

      // Handle null values
      if (value === 'null') {
        value = null
      }

      fileInfo[key] = value
    }

    return fileInfo
  } catch (error) {
    console.error('Error parsing FileInfo string:', error.message)
    return null
  }
}

/**
 * Fetch documents from GraphQL
 */
async function fetchBrokenDocuments(accessToken) {
  try {
    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      { query: GET_BROKEN_DOCUMENTS_QUERY },
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      }
    )

    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`)
    }

    return response.data.data.InvestmentDocument
  } catch (error) {
    console.error('Error fetching documents:', error.message)
    throw error
  }
}

/**
 * Fetch all files from file service
 */
async function fetchFilesFromFileService(accessToken) {
  try {
    const url = `${FILE_SERVICE_ENDPOINT}/tenant/files?appName=investmentRelations&folderPath=/investment`

    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      }
    })

    // Handle different response structures
    const data = response.data

    // Check if response is already an array
    if (Array.isArray(data)) {
      return data
    }

    // Check for common response wrapper patterns
    if (data && Array.isArray(data.files)) {
      return data.files
    }

    if (data && Array.isArray(data.data)) {
      return data.data
    }

    if (data && Array.isArray(data.content)) {
      return data.content
    }

    console.error('Unexpected file service response structure:', data)
    return []
  } catch (error) {
    console.error('Error fetching files from file service:', error.message)
    throw error
  }
}

/**
 * Find fileInfo by fileId in the files array
 */
function findFileInfoByFileId(files, fileId) {
  return files.find(file => file.fileId === fileId)
}

/**
 * Update document via Kogito endpoint
 */
async function updateDocument(documentId, fileInfo, version, parentRefs, accessToken) {
  try {
    const url = `${KOGITO_ENDPOINT}/investment-relations/updateInvestmentDocument`

    // Build investmentDocument object with parent references
    const investmentDocument = {
      id: documentId,
      version: version,
      fileInfo: fileInfo
    }

    // Add parent references if they exist (at least one is required)
    if (parentRefs.investmentId) investmentDocument.investment = parentRefs.investmentId
    if (parentRefs.opportunityId) investmentDocument.opportunity = parentRefs.opportunityId
    if (parentRefs.leadId) investmentDocument.lead = parentRefs.leadId
    if (parentRefs.contactId) investmentDocument.contact = parentRefs.contactId
    if (parentRefs.accountId) investmentDocument.account = parentRefs.accountId
    if (parentRefs.activityId) investmentDocument.activity = parentRefs.activityId
    if (parentRefs.taskId) investmentDocument.task = parentRefs.taskId
    if (parentRefs.noteId) investmentDocument.note = parentRefs.noteId

    const payload = {
      investmentDocument
    }

    console.log(`  Request URL: ${url}`)
    console.log(`  Payload:`, JSON.stringify(payload, null, 2))

    const response = await axios.post(url, payload, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    })

    console.log(`  Response Status: ${response.status}`)

    return response.data
  } catch (error) {
    console.error(`Error updating document ${documentId}:`, error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data, null, 2))
    }
    throw error
  }
}

/**
 * Process a single document
 */
async function processDocument(document, filesFromService, accessToken, dryRun) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Document ID: ${document.id}`)
  console.log(`Name: ${document.name || 'N/A'}`)
  console.log(`File field: ${document.file}`)
  console.log(`Created: ${document.createdAt}`)

  // Extract parent references (at least one is required by the API)
  const parentRefs = {
    investmentId: document.investmentId,
    opportunityId: document.opportunityId,
    leadId: document.leadId,
    contactId: document.contactId,
    accountId: document.accountId,
    activityId: document.activityId,
    taskId: document.taskId,
    noteId: document.noteId
  }

  // Log which parent reference exists
  const existingParents = Object.entries(parentRefs)
    .filter(([, value]) => value)
    .map(([key]) => key)
  console.log(`Parent references: ${existingParents.length > 0 ? existingParents.join(', ') : 'NONE'}`)

  let fileInfo = null
  let action = null

  // Check if file is a valid JSON
  if (isValidJSON(document.file)) {
    action = 'Parse JSON'
    fileInfo = JSON.parse(document.file)
    console.log(`Action: ${action}`)
    console.log(`Parsed fileInfo:`, JSON.stringify(fileInfo, null, 2))
  }
  // Check if file is a FileInfo string representation
  else if (isFileInfoString(document.file)) {
    action = 'Parse FileInfo String'
    fileInfo = parseFileInfoString(document.file)
    console.log(`Action: ${action}`)
    console.log(`Parsed fileInfo:`, JSON.stringify(fileInfo, null, 2))
  }
  // Otherwise, treat as fileId
  else {
    action = 'Fetch from File Service'
    const fileId = document.file.trim()
    console.log(`Action: ${action} (fileId: ${fileId})`)

    // Find fileInfo in the files array
    fileInfo = findFileInfoByFileId(filesFromService, fileId)

    if (fileInfo) {
      console.log(`Found fileInfo:`, JSON.stringify(fileInfo, null, 2))
    } else {
      console.log(`⚠️  WARNING: FileInfo not found in file service for fileId: ${fileId}`)
      return {
        documentId: document.id,
        success: false,
        error: 'FileInfo not found in file service',
        action
      }
    }
  }

  if (!fileInfo) {
    console.log(`❌ ERROR: Could not extract fileInfo`)
    return {
      documentId: document.id,
      success: false,
      error: 'Could not extract fileInfo',
      action
    }
  }

  // Update document
  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would update document with:`)
    console.log(`  ID: ${document.id}`)
    console.log(`  Version: ${document.version}`)
    console.log(`  Parent Refs:`, JSON.stringify(parentRefs, null, 2))
    console.log(`  FileInfo:`, JSON.stringify(fileInfo, null, 2))
    console.log(`✓ Dry run - no changes made`)

    return {
      documentId: document.id,
      success: true,
      dryRun: true,
      action,
      fileInfo
    }
  } else {
    console.log(`\n📝 Updating document...`)
    try {
      const response = await updateDocument(document.id, fileInfo, document.version, parentRefs, accessToken)
      console.log(`✅ Document updated successfully`)
      console.log(`\nUpdate Response:`, JSON.stringify(response, null, 2))

      return {
        documentId: document.id,
        success: true,
        action,
        fileInfo,
        response
      }
    } catch (error) {
      console.log(`❌ Failed to update document: ${error.message}`)

      return {
        documentId: document.id,
        success: false,
        error: error.message,
        action
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Investment Document File Migration Script')
  console.log('==========================================')
  console.log('')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE UPDATE'}`)
  console.log(`GraphQL Endpoint: ${GRAPHQL_ENDPOINT}`)
  console.log(`File Service: ${FILE_SERVICE_ENDPOINT}`)
  console.log(`Kogito Endpoint: ${KOGITO_ENDPOINT}`)
  console.log('')

  if (!GRAPHQL_ENDPOINT || !FILE_SERVICE_ENDPOINT || !KOGITO_ENDPOINT) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  // Authenticate
  console.log('Authenticating...')
  const oauthClient = new OAuthClient()
  const accessToken = await oauthClient.getAccessToken()
  console.log('✅ Authentication successful')
  console.log('')

  // Fetch broken documents
  console.log('Fetching documents with broken file references...')
  const documents = await fetchBrokenDocuments(accessToken)
  console.log(`Found ${documents.length} documents to process`)

  if (documents.length === 0) {
    console.log('✅ No documents need migration')
    return
  }

  // Fetch all files from file service
  console.log('\nFetching files from file service...')
  const filesFromService = await fetchFilesFromFileService(accessToken)

  if (!Array.isArray(filesFromService)) {
    console.error('❌ File service did not return an array')
    console.error('Response type:', typeof filesFromService)
    console.error('Response keys:', Object.keys(filesFromService || {}))
    process.exit(1)
  }

  console.log(`Found ${filesFromService.length} files in file service`)
  console.log('')

  // Process each document
  const results = []
  for (let i = 0; i < documents.length; i++) {
    console.log(`\nProcessing ${i + 1}/${documents.length}`)
    const result = await processDocument(documents[i], filesFromService, accessToken, DRY_RUN)
    results.push(result)
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(80))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`\nTotal documents: ${documents.length}`)
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)

  if (DRY_RUN) {
    console.log(`\n🔍 This was a DRY RUN - no changes were made`)
    console.log(`Run without --dry-run to perform actual updates`)
  }

  // Group by action
  const actionGroups = results.reduce((acc, result) => {
    const action = result.action || 'Unknown'
    if (!acc[action]) {
      acc[action] = []
    }
    acc[action].push(result)
    return acc
  }, {})

  console.log('\nBreakdown by action:')
  Object.entries(actionGroups).forEach(([action, items]) => {
    console.log(`  ${action}: ${items.length}`)
  })

  // Failed documents
  if (failed > 0) {
    console.log('\nFailed documents:')
    results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  - ${result.documentId}: ${result.error}`)
      })
  }

  console.log('\n' + '='.repeat(80))
}

// Run the script
main().catch(error => {
  console.error('\n❌ Unhandled error:', error)
  process.exit(1)
})
