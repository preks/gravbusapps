// GraphQL queries for the ExpenseItem component

// Function to fetch employee rule data
export const fetchEmployeeRule = async (employeeId: string, date: string, accessToken: string) => {
  try {
    const formattedDate = date.substring(0, 23) + date.substring(23).replace('Z', '+0300');
    
    const response = await fetch(`https://newwork-dev.newwork.com/processes/employee-expense/getEmployeeRule/${employeeId}/${formattedDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      console.error('Error fetching employee rule:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Exception fetching employee rule:', error);
    return null;
  }
};


export const fetchExpenseData =`query MyQuery($expenseId:uuid! ,$activeUserLocale: String) {
   ExpenseItemByPk(id: $expenseId) {
    id
    version
    source
    expenseDate
    totalAmount
    status
    reimbursable
     expenseRuleId
    itemOrder
    expenseRuleGeneralExpenseId
      expenseRuleMileageId
    employeeId
    costCenter {
      id
      name
    }
  
    currency {
      id
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
      code
    }
    expenseClass {
      id
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
      code
    }
    expenseGroup {
      id
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
      code
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      expenseItemId
      fileType
      fileUrl
      id
      version
      fileName
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
        id
        value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
        code
      }
      expenseRuleGeneralExpenseId
      expenseRuleMileageId
      id
      measurementUnit {
        id
        code
        value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
      }
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
      }
      additionalProperties
    }
    expenseRequest {
      id
      title
    }
    title
    autoCalculated
    expenseRuleGeneralExpenseId
    additionalProperties
    multiplePositions
    source
  }
}`
export const fetchExpenseRuleGeneralData =`query fetchExpenseRuleGeneralData ($objectFilter: jsonb!,$activeUserLocale:String!,$expenseRuleId: uuid) {
ExpenseRuleGeneralExpense(
    where: {
      expenseRuleId: { _eq: $expenseRuleId }, 
      isDeleted: { _eq: false }, 
      expenseGroup: { objectValue: { _contains: $objectFilter } }
    }
  ) {
    expenseGroupRef
    expenseGroup{
      id
      code
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    }
      id
      code
      name
      
  }

}`

export const fetchExpenseCatalogueData =`query fetchExpenseCatalogueData ($employeeId: uuid,$objectFilter: jsonb!,$activeUserLocale:String!,$expenseRuleId: uuid) {
  EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    structureId
    costCenterId
  }
  ExpenseRequest(where: { currencyRef: { _isNull: true } ,isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}, status: {_in: ["CREATED"]}}) {
    id
    status
    title
    createdAt
    currencyRef
  }
  expenseGroup: CatalogEntry(where: {catalog: {version: { _eq: "v1" }identifier: { _eq: "ExpenseGroup" }}objectValue: { _contains: $objectFilter }}, orderBy: {additionalValue2: ASC}) {
    id
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}}) {
    id
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
  expenceClass: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseClass"}}}) {
    id
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
  ExpenseRuleGeneralExpense(
    where: {
      expenseRuleId: { _eq: $expenseRuleId }, 
      isDeleted: { _eq: false }, 
      expenseGroup: { objectValue: { _contains: $objectFilter } }
    }
  ) {
    expenseGroupRef
    expenseGroup{
      id
      code
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    }
      id
      code
      name
      
  }

}`
export const getNewTypes =`query MyQuery($expenseRuleId: uuid, $objectFilter: jsonb, $expenseGroupId: [String!]) {
  ExpenseRuleGeneralExpense(where: {expenseRuleId: {_eq: $expenseRuleId}, expenseGroupRef: {_in: $expenseGroupId}, isDeleted: {_eq: false}, expenseGroup: {objectValue: {_contains: $objectFilter}}}) {
    id
    code
    name
    reimbursable
    activeFrom
    activeTo
    expenseGroupRef
  }
}
`
export const getCustomFields =`query MyQuery($expenseRuleGeneralId: [uuid!]) {
  ExpenseRuleOtherInfo(where: {expenseRuleGeneralExpenseId: {_in: $expenseRuleGeneralId}, isDeleted: {_eq: false}}) {
    id
    infoValue
    mandatory
    source
    expenseRuleGeneralExpenseId
     expenseRuleGeneralExpense {
      expenseGroupRef
    }
  }
}
`
export const expenseRequestByCurrencyQuery =`query fetchCurrency ($employeeId: uuid,$givenCurrency: String) {
  ExpenseRequest(where: { currencyRef:{_eq:$givenCurrency},isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}, status: {_in: ["CREATED"]}}) {
    id
    status
    title
    createdAt
    currencyRef
  }
}`
export const getStructureCostCenter =`query MyQuery($structureId: uuid!) {
  userCostCenters: CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}) {
    id
    name
    structureId
  }
}
`
export const GET_EXPENSE_CLASSES = `
  query GetExpenseClasses {
    ExpenseClass(where: {isDeleted: {_eq: false}}) {
      id
      name
      code
    }
  }
`;

export const GET_EXPENSE_TYPES = `
  query GetExpenseTypes($classId: uuid!) {
    ExpenseType(where: {classId: {_eq: $classId}, isDeleted: {_eq: false}}) {
      id
      name
      code
      classId
    }
  }
`;

export const GET_COST_CENTERS = `
  query GetCostCenters {
    CostCenter(where: {isDeleted: {_eq: false}}) {
      id
      name
      code
    }
  }
`;

export const GET_CURRENCIES = `
  query GetCurrencies {
    Currency {
      id
      code
      name
    }
  }
`;

export const CREATE_EXPENSE_ITEM = `
  mutation CreateExpenseItem(
    $title: String!,
    $date: timestamptz!,
    $totalAmount: numeric!,
    $currencyRef: String!,
    $employeeId: uuid!,
    $attachmentUrl: String,
    $fileName: String,
    $expenseRequestId: uuid
  ) {
    insert_ExpenseItem_one(object: {
      title: $title,
      date: $date,
      totalAmount: $totalAmount,
      currencyRef: $currencyRef,
      employeeId: $employeeId,
      attachmentUrl: $attachmentUrl,
      fileName: $fileName,
      expenseRequestId: $expenseRequestId,
      status: "DRAFT",
      isDeleted: false
    }) {
      id
    }
  }
`;

export const CREATE_EXPENSE_POSITION = `
  mutation CreateExpensePosition(
    $expenseItemId: uuid!,
    $expenseClassId: uuid!,
    $expenseTypeId: uuid!,
    $amount: numeric!,
    $costCenterId: uuid!,
    $customField: String,
    $isReimbursable: Boolean
  ) {
    insert_ExpensePosition_one(object: {
      expenseItemId: $expenseItemId,
      expenseClassId: $expenseClassId,
      expenseTypeId: $expenseTypeId,
      amount: $amount,
      costCenterId: $costCenterId,
      customField: $customField,
      isReimbursable: $isReimbursable,
      isDeleted: false
    }) {
      id
    }
  }
`;

export const UPLOAD_FILE = `
  mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) {
      url
      fileName
    }
  }
`;

export const GET_EXPENSE_REQUESTS = `
  query GetExpenseRequests($employeeId: uuid!) {
    ExpenseRequest(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, status: {_nin: ["REJECTED", "CANCELLED"]}}) {
      id
      code
      title
      status
    }
  }
`;
