export const CHANGE_LOG_QUERIES = {
  /**
   * GraphQL query to fetch employee data with audit fields
   */
  GET_EMPLOYEE_CHANGE_LOG: `
    query GetEmployeeChangeLog($employeeId: uuid!, $limit: Int) {
      Employee(where: {id: {_eq: $employeeId}}) {
        id
        code
        fullName
        version
        updatedAt
        updatedBy
        createdAt
        createdBy
        
        # Address changes
        addresses(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          addressLine
          postalCode
          locality
          type
          country {
            value
          }
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }
        
        # Communication changes
        communication(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          channelRef
          value
          purpose
          type {
            value
          }
          channel {
            value
            code
          }
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }
        
        # Working condition changes
        workingCondition(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          contractType {
            value
          }
          employmentType {
            value
          }
          hireDate
          exitDate
          vacationDays
          remote {
            value
          }
          region {
            value
          }
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }
        
        # Working hours changes
        workingHours(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          weeklyHours
          fullTimeEquivalent
          mondayHours
          tuesdayHours
          wednesdayHours
          thursdayHours
          fridayHours
          saturdayHours
          sundayHours
          weeklyDays
          remote {
            value
          }
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }
        
        # Bank account changes
        bankAccounts(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          iban
          bankName
          accountHolder
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }
        
        # Tax details changes
        taxDetails(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
          id
          taxNumber
          taxBracketRef
          taxIdentificationNumber
          socialSecurityNumber
          taxableChurchAffiliationRef
          childTaxAllowance
          healthInsuranceName
          healthInsuranceTypeRef
          version
          updatedAt
          updatedBy
          createdAt
          createdBy
        }

        # Relationship changes
        relationship {
          id
          version
          email
          employeeId
          firstName
          isEmergencyContact
          phoneNumber
          lastName
          relationshipDocumentId
          typeRef
          notes
          updatedAt
          updatedBy
          createdAt
          createdBy
        }

        # Skills changes
        skills(where: {isDeleted: {_eq: false}}, limit: $limit) {
          id
          level
          isDeleted
          synchronizedAt
          skill {
            id
            name
          }
        }
      }
    }
  `,

  /**
   * GraphQL query to fetch change log data from FLOW audit system
   */
  GET_FLOW_AUDIT_LOG: `
    query GetChangeLogData($employeeId: uuid!, $limit: Int, $offset: Int) {
      FlowAuditLog(
        where: {
          entityId: {_eq: $employeeId}
          entityType: {_eq: "employee"}
        }
        orderBy: {timestamp: DESC}
        limit: $limit
        offset: $offset
      ) {
        id
        timestamp
        userId
        userName
        department
        flowId
        flowName
        templateId
        templateName
        taskId
        taskName
        taskType
        action
        status
        previousStatus
        newStatus
        details
        ipAddress
        userAgent
        
        # Field-level changes
        fieldChanges {
          fieldName
          fieldCategory
          previousValue
          newValue
          isVisible
          isMasked
        }
        
        # Change origin metadata
        changeOrigin {
          flowId
          flowName
          templateId
          isSystemGenerated
          isAIGenerated
        }
      }
    }
  `
}

export default CHANGE_LOG_QUERIES
