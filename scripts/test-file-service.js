#!/usr/bin/env node

import dotenv from '@dotenvx/dotenvx'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { OAuthClient } from './api-client.js'

/**
 * Test script for file service endpoint with different appName formats
 *
 * Usage:
 * node scripts/test-file-service.js
 *
 * Required environment variable:
 * NEXT_PUBLIC_FILE_SERVICE_ENDPOINT
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const APP_NAMES = ['investmentRelations', 'investment-relations', 'investment_relations']

async function testFileServiceEndpoint(baseUrl, appName, accessToken) {
  const url = `${baseUrl}/tenant/files?appName=${appName}&folderPath=/investment`

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing appName: ${appName}`)
  console.log(`URL: ${url}`)
  console.log('='.repeat(60))

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      }
    })

    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Content-Type:`, response.headers.get('content-type'))

    const data = await response.json()
    console.log(`Response:`, JSON.stringify(data, null, 2))

    return { appName, success: true, status: response.status, data }
  } catch (error) {
    console.error(`Error:`, error.message)
    return { appName, success: false, error: error.message }
  }
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_FILE_SERVICE_ENDPOINT

  if (!baseUrl) {
    console.error('ERROR: NEXT_PUBLIC_FILE_SERVICE_ENDPOINT environment variable is not set')
    process.exit(1)
  }

  console.log('File Service Endpoint Test')
  console.log('Base URL:', baseUrl)
  console.log('Testing', APP_NAMES.length, 'different appName formats')
  console.log('')

  // Get OAuth token
  console.log('Authenticating...')
  const oauthClient = new OAuthClient()
  const accessToken = await oauthClient.getAccessToken()
  console.log('Authentication successful')

  const results = []

  for (const appName of APP_NAMES) {
    const result = await testFileServiceEndpoint(baseUrl, appName, accessToken)
    results.push(result)
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.appName}: ${result.success ? '✓ Success' : '✗ Failed'}`)
    if (result.success) {
      console.log(`   Status: ${result.status}`)
      console.log(`   Records: ${result.data?.length || 0}`)
    } else {
      console.log(`   Error: ${result.error}`)
    }
  })

  console.log('='.repeat(60))
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
