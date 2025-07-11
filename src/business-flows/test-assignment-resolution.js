const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAssignmentResolution() {
  console.log('🧪 Testing Assignment Resolution...\n');

  try {
    // 1. Test resolving department assignments
    console.log('1. Testing department assignment resolution');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'department', id: 'dept-001' }
        ]
      });
      console.log('✅ Department resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving department:', error.response?.data || error.message);
    }

    // 2. Test resolving role assignments
    console.log('\n2. Testing role assignment resolution');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'role', id: 'role-001' }
        ]
      });
      console.log('✅ Role resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving role:', error.response?.data || error.message);
    }

    // 3. Test resolving team assignments
    console.log('\n3. Testing team assignment resolution');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'team', id: 'team-001' }
        ]
      });
      console.log('✅ Team resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving team:', error.response?.data || error.message);
    }

    // 4. Test resolving capability assignments
    console.log('\n4. Testing capability assignment resolution');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'capability', id: 'cap-001' }
        ]
      });
      console.log('✅ Capability resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving capability:', error.response?.data || error.message);
    }

    // 5. Test resolving specific user assignments
    console.log('\n5. Testing user assignment resolution');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'user', id: 'user-001' }
        ]
      });
      console.log('✅ User resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving user:', error.response?.data || error.message);
    }

    // 6. Test resolving multiple assignment targets
    console.log('\n6. Testing multiple assignment targets');
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'department', id: 'dept-001' },
          { entity: 'role', id: 'role-005' },
          { entity: 'user', id: 'user-002' }
        ]
      });
      console.log('✅ Multiple targets resolution:', response.data);
    } catch (error) {
      console.log('❌ Error resolving multiple targets:', error.response?.data || error.message);
    }

    // 7. Test error cases
    console.log('\n7. Testing error cases');
    
    // Missing targets
    try {
      await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {});
    } catch (error) {
      console.log('✅ Expected error for missing targets:', error.response?.data || error.message);
    }

    // Invalid entity type
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'invalid_entity', id: 'some-id' }
        ]
      });
      console.log('✅ Invalid entity handled:', response.data);
    } catch (error) {
      console.log('✅ Expected error for invalid entity:', error.response?.data || error.message);
    }

    // Non-existent ID
    try {
      const response = await axios.post(`${BASE_URL}/tasks/assignment/resolve`, {
        targets: [
          { entity: 'department', id: 'non-existent-dept' }
        ]
      });
      console.log('✅ Non-existent ID handled:', response.data);
    } catch (error) {
      console.log('❌ Error with non-existent ID:', error.response?.data || error.message);
    }

    console.log('\n🎉 Assignment Resolution Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAssignmentResolution(); 