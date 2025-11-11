// Quick test script to verify endpoints
const http = require('http');

const testEndpoint = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n=== ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`Response:`, JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`Response:`, data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error testing ${path}:`, e.message);
      reject(e);
    });

    req.end();
  });
};

// Test with a dummy token (you'll need to replace with real token from localStorage)
const token = 'test-token'; // Replace with actual token

async function runTests() {
  try {
    await testEndpoint('/api/tasks/waiting-on', token);
    await testEndpoint('/api/tasks/approval/bucket?all=true', token);
    await testEndpoint('/api/tasks', token);
  } catch (e) {
    console.error('Test failed:', e);
  }
}

runTests();

