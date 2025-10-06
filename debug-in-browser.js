// ============================================
// BROWSER CONSOLE DEBUG SCRIPT
// ============================================
// Open DevTools (F12) and paste this into the Console tab

console.log('===== MANAGER EXPENSES DEBUG =====');

// Step 1: Check your employee ID
const myEmployeeId = window.__BUSINESS_APP_CONTEXT__?.userInfo?.employeeDetails?.employeeId;
const myUserInfo = window.__BUSINESS_APP_CONTEXT__?.userInfo;

console.log('Step 1: Your Employee ID:', myEmployeeId);
console.log('Full UserInfo:', myUserInfo);

if (!myEmployeeId) {
  console.error('❌ PROBLEM: Employee ID not found! Check authentication.');
}

// Step 2: Check access token
const accessToken = window.__BUSINESS_APP_CONTEXT__?.accessToken;
console.log('Step 2: Access Token:', accessToken ? '✅ Present' : '❌ Missing');

// Step 3: Manual GraphQL query to check Razvan
if (myEmployeeId && accessToken) {
  console.log('Step 3: Running GraphQL query to find Razvan...');
  
  const query = `
    query FindRazvan {
      Employee(where: {
        _or: [
          {firstName: {_ilike: "%Razvan%"}},
          {lastName: {_ilike: "%Razvan%"}},
          {fullName: {_ilike: "%Razvan%"}}
        ]
      }) {
        id
        fullName
        email
        employeePosition {
          supervisorEmployeeId
          supervisor {
            id
            fullName
          }
        }
      }
    }
  `;
  
  fetch('https://api-dev.newwork.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query })
  })
  .then(res => res.json())
  .then(data => {
    console.log('Step 3 Result: Razvan Employee Data:', data);
    
    if (data.data?.Employee?.length > 0) {
      const razvan = data.data.Employee[0];
      console.log('✅ Found Razvan:', razvan.fullName);
      console.log('   Employee ID:', razvan.id);
      console.log('   Supervisor ID:', razvan.employeePosition?.supervisorEmployeeId);
      console.log('   Supervisor Name:', razvan.employeePosition?.supervisor?.fullName);
      
      if (razvan.employeePosition?.supervisorEmployeeId === myEmployeeId) {
        console.log('✅ Razvan reports to YOU!');
      } else {
        console.log('❌ PROBLEM: Razvan does NOT report to you!');
        console.log('   His supervisor is:', razvan.employeePosition?.supervisor?.fullName);
      }
    } else {
      console.log('❌ PROBLEM: Razvan not found in database!');
    }
  })
  .catch(err => console.error('Error:', err));
  
  // Step 4: Check Razvan's expense requests
  console.log('Step 4: Checking Razvan\'s expense requests...');
  
  const requestQuery = `
    query FindRazvanRequests {
      ExpenseRequest(where: {
        employee: {
          _or: [
            {firstName: {_ilike: "%Razvan%"}},
            {lastName: {_ilike: "%Razvan%"}},
            {fullName: {_ilike: "%Razvan%"}}
          ]
        }
      }) {
        id
        code
        title
        status
        isDeleted
        currencyRef
        requestDate
        employee {
          fullName
          employeePosition {
            supervisorEmployeeId
          }
        }
      }
    }
  `;
  
  fetch('https://api-dev.newwork.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query: requestQuery })
  })
  .then(res => res.json())
  .then(data => {
    console.log('Step 4 Result: Razvan\'s Expense Requests:', data);
    
    if (data.data?.ExpenseRequest?.length > 0) {
      console.log(`✅ Found ${data.data.ExpenseRequest.length} expense request(s) for Razvan:`);
      const list = data.data.ExpenseRequest;
      for (let idx = 0; idx < list.length; idx++) {
        const req = list[idx];
        console.log(`   Request ${idx + 1}:`);
        console.log('     Code:', req.code);
        console.log('     Title:', req.title);
        console.log('     Status:', req.status);
        console.log('     isDeleted:', req.isDeleted);
        console.log('     Currency:', req.currencyRef);
        console.log('     Supervisor ID:', req.employee.employeePosition?.supervisorEmployeeId);
        console.log('     Reports to you?', req.employee.employeePosition?.supervisorEmployeeId === myEmployeeId ? '✅ YES' : '❌ NO');
      }
    } else {
      console.log('❌ PROBLEM: No expense requests found for Razvan!');
    }
  })
  .catch(err => console.error('Error:', err));
  
  // Step 5: Check all team requests
  console.log('Step 5: Checking ALL your team\'s expense requests...');
  
  const teamQuery = `
    query GetMyTeamRequests($managerId: uuid!) {
      ExpenseRequest(where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }) {
        id
        code
        title
        status
        currencyRef
        employee {
          fullName
        }
      }
    }
  `;
  
  fetch('https://api-dev.newwork.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ 
      query: teamQuery,
      variables: { managerId: myEmployeeId }
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('Step 5 Result: All Team Expense Requests:', data);
    
    if (data.data?.ExpenseRequest?.length > 0) {
      console.log(`✅ Found ${data.data.ExpenseRequest.length} total team expense request(s):`);
      
      const razvanRequests = data.data.ExpenseRequest.filter(req => 
        req.employee.fullName.toLowerCase().includes('razvan')
      );
      
      if (razvanRequests.length > 0) {
        console.log(`✅ ${razvanRequests.length} of these are from Razvan!`);
        for (const req of razvanRequests) {
          console.log('   -', req.title, '(', req.status, ')');
        }
      } else {
        console.log('❌ PROBLEM: None of these requests are from Razvan!');
        console.log('Team members found:', [...new Set(data.data.ExpenseRequest.map(r => r.employee.fullName))]);
      }
    } else {
      console.log('❌ PROBLEM: No expense requests found for your entire team!');
    }
  })
  .catch(err => console.error('Error:', err));
}

console.log('===== END DEBUG =====');
console.log('Check the console output above for diagnostic information.');

