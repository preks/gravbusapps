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
  fields?: Array<keyof Account | string>

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
    ${
      fields.includes('accountAnnualRevenueBand')
        ? `
      ${entityFields.accountAnnualRevenueBand} {
        ${CATALOG_ENTRY}
      }
      ${entityFields.accountAnnualRevenueBandRef}
    `
        : ''
    }
    ${
      fields.includes('accountContacts') && relationFields.contactFields
        ? `
      ${entityFields.accountContacts}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        id
        ${AUDIT_FIELDS}
        contactType
        contact {
          ${AUDIT_FIELDS}
          ${relationFields.contactFields.id}
          ${relationFields.contactFields.firstName}
          ${relationFields.contactFields.lastName}
          ${relationFields.contactFields.displayName}
          ${relationFields.contactFields.jobTitle}
          ${
            relationFields.contactFields.salutation
              ? `
            ${relationFields.contactFields.salutation} {
              ${CATALOG_ENTRY}
            }
            ${relationFields.contactFields.salutationRef}
          `
              : ''
          }
          ${
            relationFields.contactFields.communicationChannels
              ? `
            ${relationFields.contactFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
              ${COMMUNICATION_CHANNEL_REF}
            }
          `
              : ''
          }
          ${
            relationFields.contactFields.addresses
              ? `
            ${relationFields.contactFields.addresses}(where: { isDeleted: { _eq: false } }) {
              ${ADDRESS_REF}
            }
          `
              : ''
          }
        }
      }
    `
        : ''
    }
    ${
      fields.includes('activities') && relationFields.activityFields
        ? `
      ${entityFields.activities}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.activityFields.id}
        ${relationFields.activityFields.title}
        ${relationFields.activityFields.description}
        ${relationFields.activityFields.occurredAt}
        ${
          relationFields.activityFields.activityType
            ? `
          ${relationFields.activityFields.activityType} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.activityFields.activityTypeRef}
        `
            : ''
        }
        ${
          relationFields.activityFields.ownerEmployee
            ? `
          ${relationFields.activityFields.ownerEmployee} {
            ${EMPLOYEE_REF}
          }
          ${relationFields.activityFields.ownerEmployeeId}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${
      fields.includes('addresses')
        ? `
      ${entityFields.addresses}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${ADDRESS_REF}
      }
    `
        : ''
    }
    ${entityFields.code}
    ${
      fields.includes('communicationChannels')
        ? `
      ${entityFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
        value
        valueExtension
        communicationChannel {
          ${CATALOG_ENTRY}
        }
        communicationChannelRef
      }
    `
        : ''
    }
    ${
      fields.includes('companySize')
        ? `
      ${entityFields.companySize} {
        ${CATALOG_ENTRY}
      }
      ${entityFields.companySizeRef}
    `
        : ''
    }
    ${
      fields.includes('contacts') && relationFields.contactFields
        ? `
      ${entityFields.contacts}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.contactFields.id}
        ${relationFields.contactFields.firstName}
        ${relationFields.contactFields.lastName}
        ${relationFields.contactFields.displayName}
        ${relationFields.contactFields.email}
        ${relationFields.contactFields.phone}
        ${relationFields.contactFields.jobTitle}
      }
    `
        : ''
    }
    ${
      fields.includes('documents') && relationFields.documentFields
        ? `
      ${entityFields.documents}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.documentFields.id}
        ${relationFields.documentFields.name}
        ${relationFields.documentFields.description}
        ${relationFields.documentFields.fileName}
        ${relationFields.documentFields.fileSize}
        ${relationFields.documentFields.mimeType}
        ${
          relationFields.documentFields.documentType
            ? `
          ${relationFields.documentFields.documentType} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.documentFields.documentTypeRef}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${fields.includes('foundationDate') ? entityFields.foundationDate : ''}
    ${entityFields.id}
    ${
      fields.includes('industryClass')
        ? `
      ${entityFields.industryClass} {
        ${CATALOG_ENTRY}
      }
      ${entityFields.industryClassRef}
    `
        : ''
    }
    ${
      fields.includes('leads') && relationFields.leadFields
        ? `
      ${entityFields.leads}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.leadFields.id}
        ${relationFields.leadFields.firstName}
        ${relationFields.leadFields.lastName}
        ${relationFields.leadFields.companyName}
        ${
          relationFields.leadFields.leadStatus
            ? `
          ${relationFields.leadFields.leadStatus} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.leadFields.leadStatusRef}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${
      fields.includes('legalForm')
        ? `
      ${entityFields.legalForm} {
        ${CATALOG_ENTRY}
      }
      ${entityFields.legalFormRef}
    `
        : ''
    }
    ${fields.includes('liquidationDate') ? entityFields.liquidationDate : ''}
    ${entityFields.name}
    ${
      fields.includes('notes') && relationFields.noteFields
        ? `
      ${entityFields.notes}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.noteFields.id}
        ${relationFields.noteFields.title}
        ${relationFields.noteFields.text}
        ${
          relationFields.noteFields.noteType
            ? `
          ${relationFields.noteFields.noteType} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.noteFields.noteTypeRef}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${fields.includes('notesSummary') ? entityFields.notesSummary : ''}
    ${
      fields.includes('opportunities') && relationFields.opportunityFields
        ? `
      ${entityFields.opportunities}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.opportunityFields.id}
        ${relationFields.opportunityFields.name}
        ${relationFields.opportunityFields.amount}
        ${
          relationFields.opportunityFields.opportunityStatus
            ? `
          ${relationFields.opportunityFields.opportunityStatus} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.opportunityFields.opportunityStatusRef}
        `
            : ''
        }
        ${
          relationFields.opportunityFields.stage
            ? `
          ${relationFields.opportunityFields.stage} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.opportunityFields.stageRef}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${
      fields.includes('ownerEmployee')
        ? `
      ${entityFields.ownerEmployee} {
        ${EMPLOYEE_REF}
      }
      ${entityFields.ownerEmployeeId}
    `
        : ''
    }
    ${fields.includes('picture') ? entityFields.picture : ''}
    ${fields.includes('pictureThumbnail') ? entityFields.pictureThumbnail : ''}
    ${
      fields.includes('tasks') && relationFields.taskFields
        ? `
      ${entityFields.tasks}(
        where: { isDeleted: { _eq: false } }
        limit: ${relationLimit}
        offset: ${relationOffset}
      ) {
        ${AUDIT_FIELDS}
        ${relationFields.taskFields.id}
        ${relationFields.taskFields.name}
        ${relationFields.taskFields.description}
        ${relationFields.taskFields.dueDate}
        ${relationFields.taskFields.startDate}
        ${relationFields.taskFields.endDate}
        ${
          relationFields.taskFields.taskStatus
            ? `
          ${relationFields.taskFields.taskStatus} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.taskFields.taskStatusRef}
        `
            : ''
        }
        ${
          relationFields.taskFields.taskPriority
            ? `
          ${relationFields.taskFields.taskPriority} {
            ${CATALOG_ENTRY}
          }
          ${relationFields.taskFields.taskPriorityRef}
        `
            : ''
        }
        ${
          relationFields.taskFields.assignedEmployee
            ? `
          ${relationFields.taskFields.assignedEmployee} {
            ${EMPLOYEE_REF}
          }
          ${relationFields.taskFields.assignedEmployeeId}
        `
            : ''
        }
      }
    `
        : ''
    }
    ${
      fields.includes('timeZone')
        ? `
      ${entityFields.timeZone} {
        ${CATALOG_ENTRY}
      }
      ${entityFields.timeZoneRef}
    `
        : ''
    }
    ${fields.includes('website') ? entityFields.website : ''}
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
export const exampleHookUsage = () => {
  // In einem Hook:
  /*
  const fetchAccounts = useCallback(async (variables: AccountQueryVariables) => {
    // 1. Query-Inhalt bauen
    const queryContent = buildAccountQuery({
      entityFields: CustomerAccountFields,
      fields: ['ownerEmployee', 'industryClass', 'foundationDate', 'documents', 'accountContacts'],
      relationFields: {
        documentFields: CustomerDocumentFields,
        contactFields: CustomerContactFields
      },
      relationPagination: { limit: 10, offset: 0 }
    })
    
    // 2. Komplette Query-Struktur bauen
    const query = `
      query GetAccounts(
        $limit: Int
        $offset: Int
        $where: AccountBoolExp
        $orderBy: [AccountOrderBy!]
      ) {
        Account(
          limit: $limit
          offset: $offset
          orderBy: $orderBy
          where: $where
        ) {
          ${queryContent}
        }
        AccountAggregate(where: $where) {
          aggregate { count }
        }
      }
    `
    
    // 3. WHERE/ORDER BY bauen
    const whereCondition = buildAccountWhereCondition(variables, descriptors)
    const orderBy = buildAccountOrderBy(variables.orderBy || [], descriptors)
    
    // 4. GraphQL request
    const result = await graphqlClient.request(query, {
      limit: variables.limit || 50,
      offset: variables.offset || 0,
      where: whereCondition,
      orderBy: orderBy
    })
    
    return result
  })
  */
}

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
