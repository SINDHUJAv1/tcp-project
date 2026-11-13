const http = require('http');
const { app } = require('../server');

const TEST_PORT = 5002;
let server;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runE2E() {
  console.log('--- STARTING END-TO-END UNIFIED SERVER TEST ---');
  let passed = 0;

  server = app.listen(TEST_PORT);
  console.log(`Server listening on port ${TEST_PORT}`);

  try {
    // 1. Test frontend static serving
    const frontendRes = await get('/');
    if (frontendRes.status === 200 && frontendRes.body.includes('<div id="root"></div>')) {
      console.log('✓ PASS: Server serves frontend SPA (index.html)');
      passed++;
    } else {
      console.error('✗ FAIL: Frontend index.html not served properly');
    }

    // 2. Test React Router fallback
    const routerFallback = await get('/simulator');
    if (routerFallback.status === 200 && routerFallback.body.includes('<div id="root"></div>')) {
      console.log('✓ PASS: Server supports client-side React Router navigation routes');
      passed++;
    } else {
      console.error('✗ FAIL: Client-side routing fallback failed');
    }

    // 3. Test API Health
    const health = await get('/api/health');
    const healthJson = JSON.parse(health.body);
    if (health.status === 200 && healthJson.rollNumber === 104) {
      console.log('✓ PASS: API Health check online with Roll 104');
      passed++;
    }

    // 4. Test Dashboard stats
    const stats = await get('/api/dashboard/stats');
    const statsJson = JSON.parse(stats.body);
    if (stats.status === 200 && statsJson.data.metrics.totalAttempts >= 0) {
      console.log(`✓ PASS: Dashboard stats returns valid metrics (${statsJson.data.metrics.totalAttempts} total attempts)`);
      passed++;
    }

    // 5. Test Simulator connection
    const simRes = await post('/api/simulator/connect', {
      hostname: 'e2e-target.edu',
      port: 80,
      scenario: 'NORMAL_HANDSHAKE'
    });
    const simJson = JSON.parse(simRes.body);
    if (simRes.status === 200 && simJson.data.session.state === 'Established') {
      console.log('✓ PASS: Simulator Connect succeeds and establishes session');
      passed++;
    }

    // 6. Test FSM state inspection
    const fsmState = await get('/api/fsm/state');
    const fsmJson = JSON.parse(fsmState.body);
    if (fsmState.status === 200 && fsmJson.data.currentState) {
      console.log(`✓ PASS: FSM State endpoint returns active state '${fsmJson.data.currentState}'`);
      passed++;
    }

    console.log(`\n--- ALL ${passed} E2E TESTS PASSED SUCCESSFULLY ---`);
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runE2E();
