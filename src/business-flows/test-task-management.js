const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUserId = 'user-001'; // Alice Johnson from mock data
const testUserId2 = 'user-007'; // Grace Lee from mock data

async function testTaskManagementEndpoints() {
  console.log('🧪 Testing Task Management Endpoints...\n');

  try {
    // 1. Test getting claimable tasks
    console.log('1. Testing GET /api/tasks/claimable');
    try {
      const claimableResponse = await axios.get(`${BASE_URL}/tasks/claimable`, {
        params: { userId: testUserId }
      });
      console.log('✅ Claimable tasks:', claimableResponse.data);
    } catch (error) {
      console.log('❌ Error getting claimable tasks:', error.response?.data || error.message);
    }

    // 2. Test getting user tasks
    console.log('\n2. Testing GET /api/tasks/user/:userId');
    try {
      const userTasksResponse = await axios.get(`${BASE_URL}/tasks/user/${testUserId}`);
      console.log('✅ User tasks:', userTasksResponse.data);
    } catch (error) {
      console.log('❌ Error getting user tasks:', error.response?.data || error.message);
    }

    // 3. Test getting user task stats
    console.log('\n3. Testing GET /api/tasks/user/:userId/stats');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/tasks/user/${testUserId}/stats`);
      console.log('✅ User task stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Error getting user task stats:', error.response?.data || error.message);
    }

    // 4. Test getting a specific task (will fail without actual taskId)
    console.log('\n4. Testing GET /api/tasks/:taskId');
    try {
      const taskResponse = await axios.get(`${BASE_URL}/tasks/test-task-id`, {
        params: { userId: testUserId }
      });
      console.log('✅ Task details:', taskResponse.data);
    } catch (error) {
      console.log('❌ Error getting task details (expected):', error.response?.data || error.message);
    }

    // 5. Test claiming a task (will fail without actual taskId)
    console.log('\n5. Testing POST /api/tasks/:taskId/claim');
    try {
      const claimResponse = await axios.post(`${BASE_URL}/tasks/test-task-id/claim`, {
        userId: testUserId
      });
      console.log('✅ Task claimed:', claimResponse.data);
    } catch (error) {
      console.log('❌ Error claiming task (expected):', error.response?.data || error.message);
    }

    // 6. Test completing a task (will fail without actual taskId)
    console.log('\n6. Testing POST /api/tasks/:taskId/complete');
    try {
      const completeResponse = await axios.post(`${BASE_URL}/tasks/test-task-id/complete`, {
        outputData: { result: 'completed', notes: 'Task completed successfully' }
      });
      console.log('✅ Task completed:', completeResponse.data);
    } catch (error) {
      console.log('❌ Error completing task (expected):', error.response?.data || error.message);
    }

    // 7. Test with different user
    console.log('\n7. Testing with different user');
    try {
      const user2StatsResponse = await axios.get(`${BASE_URL}/tasks/user/${testUserId2}/stats`);
      console.log('✅ User 2 task stats:', user2StatsResponse.data);
    } catch (error) {
      console.log('❌ Error getting user 2 task stats:', error.response?.data || error.message);
    }

    // 8. Test error cases
    console.log('\n8. Testing error cases');
    
    // Missing userId for claimable tasks
    try {
      await axios.get(`${BASE_URL}/tasks/claimable`);
    } catch (error) {
      console.log('✅ Expected error for missing userId:', error.response?.data || error.message);
    }

    // Invalid userId
    try {
      await axios.get(`${BASE_URL}/tasks/user/invalid-user-id/stats`);
    } catch (error) {
      console.log('✅ Expected error for invalid userId:', error.response?.data || error.message);
    }

    console.log('\n🎉 Task Management Endpoints Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTaskManagementEndpoints(); 