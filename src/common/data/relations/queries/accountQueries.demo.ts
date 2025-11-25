/**
 * Account Queries Demo
 *
 * Neue vereinfachte Query-Struktur ohne Fragments
 * - Eine einzige buildAccountQuery Funktion
 * - Hooks entscheiden welche Felder/Relations geholt werden
 * - Consumer fields werden als Parameter übergeben
 * - Relations haben immer limit/offset (default: 10/0)
 */

import { AccountFields, type Account } from '../types/accountTypes'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'

/**
 * Account Query Options
 * Definiert welche Felder und Relations geholt werden sollen
 */
export interface AccountQueryOptions {
  // Entity field mapping (Consumer fields) - REQUIRED
  // z.B. InvestmentAccountFields oder CustomerAccountFields
  entityFields: Record<keyof typeof AccountFields, string>

  // Welche Felder sollen geholt werden? (Array von Account Interface Keys)
  // Leer = nur Basis-Felder (id, code, name, audit fields)
  // Enthält sowohl normale Felder als auch Relations (z.B. 'documents', 'notes', 'tasks')
  fields?: Array<keyof Account>

  // Field mappings für Relations
  relationFields?: {
    contactFields?: Record<string, string>
    documentFields?: Record<string, string>
    noteFields?: Record<string, string>
    taskFields?: Record<string, string>
    leadFields?: Record<string, string>
    opportunityFields?: Record<string, string>
    activityFields?: Record<string, string>
  }

  // Relation pagination (immer mit defaults)
  relationPagination?: {
    limit?: number // default: 10
    offset?: number // default: 0
  }
}

/**
 * Helper: Builds a catalog field with ref
 */
const buildCatalogField = (
  fieldName: string,
  entityField: string,
  entityFieldRef: string,
  fields: Array<keyof Account>
): string => {
  if (!fields.includes(fieldName as keyof Account)) return ''
  return `
      ${entityField} {
        ${CATALOG_ENTRY}
      }
      ${entityFieldRef}
    `
}

/**
 * Helper: Builds a simple field
 */
const buildSimpleField = (fieldName: string, entityField: string, fields: Array<keyof Account>): string => {
  return fields.includes(fieldName as keyof Account) ? entityField : ''
}

/**
 * Helper: Builds a catalog entry within a relation
 */
const buildCatalogEntryInRelation = (fieldName: string | undefined, fieldRef: string | undefined): string => {
  if (!fieldName || !fieldRef) return ''
  return `
          ${fieldName} {
            ${CATALOG_ENTRY}
          }
          ${fieldRef}
        `
}

/**
 * Helper: Builds an employee reference within a relation
 */
const buildEmployeeRefInRelation = (fieldName: string | undefined, fieldId: string | undefined): string => {
  if (!fieldName || !fieldId) return ''
  return `
          ${fieldName} {
            ${EMPLOYEE_REF}
          }
          ${fieldId}
        `
}

/**
 * Helper: Builds contact fields within accountContacts relation
 */
const buildContactFieldsInAccountContacts = (contactFields: Record<string, string>): string => {
  return `
          ${contactFields.id}
          ${contactFields.firstName}
          ${contactFields.lastName}
          ${contactFields.displayName}
          ${contactFields.jobTitle}
          ${buildCatalogEntryInRelation(contactFields.salutation, contactFields.salutationRef)}
          ${
            contactFields.communicationChannels
              ? `
            ${contactFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
              ${COMMUNICATION_CHANNEL_REF}
            }
          `
              : ''
          }
          ${
            contactFields.addresses
              ? `
            ${contactFields.addresses}(where: { isDeleted: { _eq: false } }) {
              ${ADDRESS_REF}
            }
          `
              : ''
          }
        `
}

/**
 * Helper: Builds activity fields
 */
const buildActivityFields = (activityFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${activityFields.id}
        ${activityFields.title}
        ${activityFields.description}
        ${activityFields.occurredAt}
        ${buildCatalogEntryInRelation(activityFields.activityType, activityFields.activityTypeRef)}
        ${buildEmployeeRefInRelation(activityFields.ownerEmployee, activityFields.ownerEmployeeId)}
      `
}

/**
 * Helper: Builds contact fields (simple version)
 */
const buildContactFields = (contactFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${contactFields.id}
        ${contactFields.firstName}
        ${contactFields.lastName}
        ${contactFields.displayName}
        ${contactFields.email}
        ${contactFields.phone}
        ${contactFields.jobTitle}
      `
}

/**
 * Helper: Builds document fields
 */
const buildDocumentFields = (documentFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${documentFields.id}
        ${documentFields.name}
        ${documentFields.description}
        ${documentFields.fileName}
        ${documentFields.fileSize}
        ${documentFields.mimeType}
        ${buildCatalogEntryInRelation(documentFields.documentType, documentFields.documentTypeRef)}
      `
}

/**
 * Helper: Builds lead fields
 */
const buildLeadFields = (leadFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${leadFields.id}
        ${leadFields.firstName}
        ${leadFields.lastName}
        ${leadFields.companyName}
        ${buildCatalogEntryInRelation(leadFields.leadStatus, leadFields.leadStatusRef)}
      `
}

/**
 * Helper: Builds note fields
 */
const buildNoteFields = (noteFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${noteFields.id}
        ${noteFields.title}
        ${noteFields.text}
        ${buildCatalogEntryInRelation(noteFields.noteType, noteFields.noteTypeRef)}
      `
}

/**
 * Helper: Builds opportunity fields
 */
const buildOpportunityFields = (opportunityFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${opportunityFields.id}
        ${opportunityFields.name}
        ${opportunityFields.amount}
        ${buildCatalogEntryInRelation(opportunityFields.opportunityStatus, opportunityFields.opportunityStatusRef)}
        ${buildCatalogEntryInRelation(opportunityFields.stage, opportunityFields.stageRef)}
      `
}

/**
 * Helper: Builds task fields
 */
const buildTaskFields = (taskFields: Record<string, string>): string => {
  return `
        ${AUDIT_FIELDS}
        ${taskFields.id}
        ${taskFields.name}
        ${taskFields.description}
        ${taskFields.dueDate}
        ${taskFields.startDate}
        ${taskFields.endDate}
        ${buildCatalogEntryInRelation(taskFields.taskStatus, taskFields.taskStatusRef)}
        ${buildCatalogEntryInRelation(taskFields.taskPriority, taskFields.taskPriorityRef)}
        ${buildEmployeeRefInRelation(taskFields.assignedEmployee, taskFields.assignedEmployeeId)}
      `
}

/**
 * Helper: Build relation field with pagination
 */
const buildRelationFieldWithPagination = (
  fieldName: string,
  entityField: string,
  fields: Array<keyof Account>,
  relationFieldsConfig: Record<string, string> | undefined,
  buildFieldsFn: (config: Record<string, string>) => string,
  relationLimit: number,
  relationOffset: number
): string => {
  if (!fields.includes(fieldName as keyof Account) || !relationFieldsConfig) return ''
  return `
      ${entityField}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${buildFieldsFn(relationFieldsConfig)}
      }
    `
}

/**
 * Helper: Build accountContacts relation field
 */
const buildAccountContactsRelation = (
  entityField: string,
  fields: Array<keyof Account>,
  relationFieldsConfig: Record<string, string> | undefined,
  relationLimit: number,
  relationOffset: number
): string => {
  if (!fields.includes('accountContacts' as keyof Account) || !relationFieldsConfig) return ''
  return `
      ${entityField}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        id
        ${AUDIT_FIELDS}
        contactType
        contact {
          ${buildContactFieldsInAccountContacts(relationFieldsConfig)}
        }
      }
    `
}

/**
 * Helper: Build addresses relation field
 */
const buildAddressesRelation = (
  entityField: string,
  fields: Array<keyof Account>,
  relationLimit: number,
  relationOffset: number
): string => {
  if (!fields.includes('addresses' as keyof Account)) return ''
  return `
      ${entityField}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${ADDRESS_REF}
      }
    `
}

/**
 * Helper: Build communicationChannels field
 */
const buildCommunicationChannelsField = (entityField: string, fields: Array<keyof Account>): string => {
  if (!fields.includes('communicationChannels' as keyof Account)) return ''
  return `
      ${entityField}(where: { isDeleted: { _eq: false } }) {
        value
        valueExtension
        communicationChannel {
          ${CATALOG_ENTRY}
        }
        communicationChannelRef
      }
    `
}

/**
 * Helper: Build companySize catalog field
 */
const buildCompanySizeField = (entityField: string, entityFieldRef: string, fields: Array<keyof Account>): string => {
  if (!fields.includes('companySize' as keyof Account)) return ''
  return `
      ${entityField} {
        ${CATALOG_ENTRY}
      }
      ${entityFieldRef}
    `
}

/**
 * Helper: Build ownerEmployee field
 */
const buildOwnerEmployeeField = (entityField: string, entityFieldId: string, fields: Array<keyof Account>): string => {
  if (!fields.includes('ownerEmployee' as keyof Account)) return ''
  return `
      ${entityField} {
        ${EMPLOYEE_REF}
      }
      ${entityFieldId}
    `
}

/**
 * Helper: Build timeZone catalog field
 */
const buildTimeZoneField = (entityField: string, entityFieldRef: string, fields: Array<keyof Account>): string => {
  if (!fields.includes('timeZone' as keyof Account)) return ''
  return `
      ${entityField} {
        ${CATALOG_ENTRY}
      }
      ${entityFieldRef}
    `
}

/**
 * Build Account Query Content
 *
 * Gibt nur den Query-Inhalt zurück (Felder zwischen geschweiften Klammern)
 * Die komplette Query-Struktur wird vom Hook gebaut
 *
 * @param options - Query options mit fields, etc.
 * @returns GraphQL query content string
 */
export const buildAccountQuery = (options: AccountQueryOptions): string => {
  const { entityFields, fields = [], relationFields = {}, relationPagination = {} } = options

  // Default values für Relations (immer gesetzt)
  const relationLimit = relationPagination.limit ?? 10
  const relationOffset = relationPagination.offset ?? 0

  // Alle Felder alphabetisch sortiert wie in accountTypes.ts
  return `
    ${AUDIT_FIELDS}
    ${buildCatalogField('accountAnnualRevenueBand', entityFields.accountAnnualRevenueBand, entityFields.accountAnnualRevenueBandRef, fields)}
    ${buildAccountContactsRelation(entityFields.accountContacts, fields, relationFields.contactFields, relationLimit, relationOffset)}
    ${buildRelationFieldWithPagination('activities', entityFields.activities, fields, relationFields.activityFields, buildActivityFields, relationLimit, relationOffset)}
    ${buildAddressesRelation(entityFields.addresses, fields, relationLimit, relationOffset)}
    ${entityFields.code}
    ${buildCommunicationChannelsField(entityFields.communicationChannels, fields)}
    ${buildCompanySizeField(entityFields.companySize, entityFields.companySizeRef, fields)}
    ${buildRelationFieldWithPagination('contacts', entityFields.contacts, fields, relationFields.contactFields, buildContactFields, relationLimit, relationOffset)}
    ${buildRelationFieldWithPagination('documents', entityFields.documents, fields, relationFields.documentFields, buildDocumentFields, relationLimit, relationOffset)}
    ${buildSimpleField('foundationDate', entityFields.foundationDate, fields)}
    ${entityFields.id}
    ${buildCatalogField('industryClass', entityFields.industryClass, entityFields.industryClassRef, fields)}
    ${buildRelationFieldWithPagination('leads', entityFields.leads, fields, relationFields.leadFields, buildLeadFields, relationLimit, relationOffset)}
    ${buildCatalogField('legalForm', entityFields.legalForm, entityFields.legalFormRef, fields)}
    ${buildSimpleField('liquidationDate', entityFields.liquidationDate, fields)}
    ${entityFields.name}
    ${buildRelationFieldWithPagination('notes', entityFields.notes, fields, relationFields.noteFields, buildNoteFields, relationLimit, relationOffset)}
    ${buildSimpleField('notesSummary', entityFields.notesSummary, fields)}
    ${buildRelationFieldWithPagination('opportunities', entityFields.opportunities, fields, relationFields.opportunityFields, buildOpportunityFields, relationLimit, relationOffset)}
    ${buildOwnerEmployeeField(entityFields.ownerEmployee, entityFields.ownerEmployeeId, fields)}
    ${fields.includes('picture' as keyof Account) ? entityFields.picture : ''}
    ${fields.includes('pictureThumbnail' as keyof Account) ? entityFields.pictureThumbnail : ''}
    ${buildRelationFieldWithPagination('tasks', entityFields.tasks, fields, relationFields.taskFields, buildTaskFields, relationLimit, relationOffset)}
    ${buildTimeZoneField(entityFields.timeZone, entityFields.timeZoneRef, fields)}
    ${fields.includes('website' as keyof Account) ? entityFields.website : ''}
  `
}

// =====================================================
// VERWENDUNGSBEISPIELE
// =====================================================

/**
 * Beispiel 1: Minimal - nur Basis-Felder
 */
export const exampleMinimal = () => {
  buildAccountQuery({
    entityFields: AccountFields,
    fields: [] // nur id, code, name, audit fields
  })

  // Hook baut komplette Query:
  // query GetAccounts($limit: Int, $offset: Int, $where: AccountBoolExp, $orderBy: [AccountOrderBy!]) {
  //   Account(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
  //     ${queryContent}
  //   }
  //   AccountAggregate(where: $where) {
  //     aggregate { count }
  //   }
  // }
}

/**
 * Beispiel 2: Mit Feldern
 */
export const exampleWithFields = () => {
  buildAccountQuery({
    entityFields: AccountFields,
    fields: ['ownerEmployee', 'industryClass', 'foundationDate', 'website', 'legalForm', 'companySize']
  })
}

/**
 * Beispiel 3: Mit Relations
 */
export const exampleWithRelations = () => {
  // Annahme: CustomerDocumentFields, CustomerContactFields existieren
  buildAccountQuery({
    entityFields: AccountFields,
    fields: ['ownerEmployee', 'industryClass', 'documents', 'accountContacts', 'tasks'],
    relationFields: {
      documentFields: {
        id: 'id',
        name: 'name',
        description: 'description',
        fileName: 'fileName',
        fileSize: 'fileSize',
        mimeType: 'mimeType',
        documentType: 'documentType',
        documentTypeRef: 'documentTypeRef'
      },
      contactFields: {
        id: 'id',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
        email: 'email',
        phone: 'phone',
        jobTitle: 'jobTitle',
        salutation: 'salutation',
        salutationRef: 'salutationRef',
        communicationChannels: 'communicationChannels'
      },
      taskFields: {
        id: 'id',
        name: 'name',
        description: 'description',
        dueDate: 'dueDate',
        startDate: 'startDate',
        endDate: 'endDate',
        taskStatus: 'taskStatus',
        taskStatusRef: 'taskStatusRef',
        taskPriority: 'taskPriority',
        taskPriorityRef: 'taskPriorityRef',
        assignedEmployee: 'assignedEmployee',
        assignedEmployeeId: 'assignedEmployeeId'
      }
    },
    relationPagination: {
      limit: 20,
      offset: 0
    }
  })
}

/**
 * Beispiel 4: Mit Domain-specific Fields (Investment)
 */
export const exampleWithAdditionalFields = () => {
  buildAccountQuery({
    entityFields: AccountFields, // InvestmentAccountFields in real
    fields: ['ownerEmployee', 'industryClass', 'documents', 'accountContacts'],
    relationFields: {
      documentFields: {
        id: 'id',
        name: 'name',
        description: 'description',
        fileName: 'fileName',
        fileSize: 'fileSize',
        mimeType: 'mimeType'
      },
      contactFields: {
        id: 'id',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
        email: 'email'
      }
    }
  })
}

/**
 * Beispiel 5: Hook Implementation
 */
export const exampleHookUsage = () => {}

// =====================================================
// DEFAULT CONFIGS
// =====================================================

/**
 * Default Config für Account List (AccountLayout)
 *
 * Enthält alle Felder die in der Account-Tabelle angezeigt werden:
 * - name, code, id (Basis)
 * - communicationChannels (Email, Phone)
 * - addresses (für Adress-Anzeige)
 * - industryClass, legalForm, companySize (für Filter/Sortierung)
 * - ownerEmployee (für Owner-Anzeige)
 * - foundationDate, createdAt (für Datum-Anzeige)
 */
export const ACCOUNT_LIST_CONFIG: AccountQueryOptions = {
  entityFields: AccountFields, // Wird vom Consumer überschrieben (z.B. InvestmentAccountFields, CustomerAccountFields)
  fields: [
    'communicationChannels',
    'industryClass',
    'legalForm',
    'companySize',
    'ownerEmployee',
    'foundationDate',
    'pictureThumbnail', // Für Avatar in Tabelle
    'addresses' // Für Adress-Anzeige in Tabelle
  ],
  relationPagination: {
    limit: 1, // Nur erste Adresse für Tabelle
    offset: 0
  }
}

/**
 * Default Config für Account Record (InvestmentAccountRecord & CustomerAccountRecord)
 *
 * Enthält alle Felder und Relations die im Detail-View benötigt werden:
 * - Alle Basis-Felder
 * - Alle Relations mit Pagination (default: 10/0)
 * - IRM/CRM-spezifische Relations (activities, leads) werden vom Consumer hinzugefügt
 *
 * Custom things (z.B. investment, salesCampaign) werden vom Consumer direkt in die Query geschrieben
 */
export const ACCOUNT_RECORD_CONFIG: AccountQueryOptions = {
  entityFields: AccountFields, // Wird vom Consumer überschrieben (InvestmentAccountFields, CustomerAccountFields)
  fields: [
    'accountAnnualRevenueBand',
    'companySize',
    'foundationDate',
    'liquidationDate',
    'industryClass',
    'legalForm',
    'timeZone',
    'ownerEmployee',
    'communicationChannels',
    'website',
    'picture',
    'pictureThumbnail',
    'notesSummary',
    'addresses',
    'documents',
    'notes',
    'tasks',
    'accountContacts',
    'opportunities'
    // IRM-spezifische Relations (activities, leads) werden vom Consumer hinzugefügt
  ],
  relationFields: {
    // Wird vom Consumer überschrieben mit Investment*Fields oder Customer*Fields
    contactFields: {
      id: 'id',
      firstName: 'firstName',
      lastName: 'lastName',
      displayName: 'displayName',
      jobTitle: 'jobTitle',
      salutation: 'salutation',
      salutationRef: 'salutationRef',
      communicationChannels: 'communicationChannels',
      addresses: 'addresses'
    },
    documentFields: {
      id: 'id',
      name: 'name',
      description: 'description',
      fileName: 'fileName',
      fileSize: 'fileSize',
      mimeType: 'mimeType',
      documentType: 'documentType',
      documentTypeRef: 'documentTypeRef'
    },
    noteFields: {
      id: 'id',
      title: 'title',
      text: 'text',
      noteType: 'noteType',
      noteTypeRef: 'noteTypeRef'
    },
    taskFields: {
      id: 'id',
      name: 'name',
      description: 'description',
      dueDate: 'dueDate',
      startDate: 'startDate',
      endDate: 'endDate',
      taskStatus: 'taskStatus',
      taskStatusRef: 'taskStatusRef',
      taskPriority: 'taskPriority',
      taskPriorityRef: 'taskPriorityRef',
      assignedEmployee: 'assignedEmployee',
      assignedEmployeeId: 'assignedEmployeeId'
    },
    leadFields: {
      id: 'id',
      firstName: 'firstName',
      lastName: 'lastName',
      companyName: 'companyName',
      leadStatus: 'leadStatus',
      leadStatusRef: 'leadStatusRef'
    },
    opportunityFields: {
      id: 'id',
      name: 'name',
      amount: 'amount',
      opportunityStatus: 'opportunityStatus',
      opportunityStatusRef: 'opportunityStatusRef',
      stage: 'stage',
      stageRef: 'stageRef'
    },
    activityFields: {
      id: 'id',
      title: 'title',
      description: 'description',
      occurredAt: 'occurredAt',
      activityType: 'activityType',
      activityTypeRef: 'activityTypeRef',
      ownerEmployee: 'ownerEmployee',
      ownerEmployeeId: 'ownerEmployeeId'
    }
  },
  relationPagination: {
    limit: 10, // Default: erste 10 Einträge pro Relation
    offset: 0
  }
}
