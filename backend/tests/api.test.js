const http = require('http');
const { app, startServer } = require('../server');

const PORT = 5001; // Separate port for testing
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const runTests = async () => {
  console.log('--- STARTING TCP SYSTEM BACKEND AUTOMATED TESTS ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title}`);
      failed++;
    }
  };

  try {
    // Start test server
    server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}\n`);

    // 1. Health check test
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'ONLINE', 'GET /api/health returns status ONLINE');
    assert(health.body.rollNumber === 104, 'Health check verifies Roll Number 104');

    // 2. Dashboard Statistics
    const stats = await request('GET', '/api/dashboard/stats');
    assert(stats.status === 200 && stats.body.success === true, 'GET /api/dashboard/stats returns success');
    assert(typeof stats.body.data.metrics.totalAttempts === 'number', 'Metrics contain totalAttempts');
    assert(Array.isArray(stats.body.data.statusDistribution), 'Status distribution array present');

    // 3. Regex Input Validation (FLAT CO2)
    // Valid hostname
    const validHostRes = await request('POST', '/api/flat/validate-regex', {
      type: 'hostname',
      value: 'api.velalar.ac.in'
    });
    assert(validHostRes.body.data.isValid === true, 'Valid RFC 1123 hostname accepted');

    // Invalid hostname
    const invalidHostRes = await request('POST', '/api/flat/validate-regex', {
      type: 'hostname',
      value: '-bad-domain-.com'
    });
    assert(invalidHostRes.body.data.isValid === false, 'Invalid hostname with leading hyphen rejected');

    // Valid port
    const validPortRes = await request('POST', '/api/flat/validate-regex', {
      type: 'port',
      value: '8080'
    });
    assert(validPortRes.body.data.isValid === true, 'Valid port 8080 accepted');

    // Invalid port (>65535)
    const invalidPortRes = await request('POST', '/api/flat/validate-regex', {
      type: 'port',
      value: '70000'
    });
    assert(invalidPortRes.body.data.isValid === false, 'Invalid port 70000 rejected');

    // 4. CRUD: Create Connection Attempt
    const newConn = await request('POST', '/api/connections', {
      hostname: 'test-server.org',
      port: 80,
      status: 'SUCCESS',
      finalState: 'Established',
      latencyMs: 18,
      notes: 'Automated test connection record'
    });
    assert(newConn.status === 201 && newConn.body.success === true, 'POST /api/connections creates record');
    const createdId = newConn.body.data._id;

    // 5. CRUD: Read Connection Attempt
    const readConn = await request('GET', `/api/connections/${createdId}`);
    assert(readConn.status === 200 && readConn.body.data.hostname === 'test-server.org', 'GET /api/connections/:id reads record');

    // 6. CRUD: Update Connection Attempt
    const updateConn = await request('PUT', `/api/connections/${createdId}`, {
      notes: 'Updated notes after verification'
    });
    assert(updateConn.status === 200 && updateConn.body.data.notes === 'Updated notes after verification', 'PUT /api/connections/:id updates record');

    // 7. CRUD: Delete Connection Attempt
    const delConn = await request('DELETE', `/api/connections/${createdId}`);
    assert(delConn.status === 200 && delConn.body.success === true, 'DELETE /api/connections/:id deletes record');

    // 8. TCP Simulator: Connect (3-Way Handshake)
    const simConnect = await request('POST', '/api/simulator/connect', {
      hostname: 'sim-target.io',
      port: 443,
      scenario: 'NORMAL_HANDSHAKE'
    });
    assert(simConnect.status === 200 && simConnect.body.data.session.state === 'Established', 'Simulator Connect establishes 3-way handshake');
    assert(simConnect.body.data.packets.length === 3, 'Handshake generates SYN, SYN-ACK, and ACK packets');

    // 9. TCP Simulator: Send Data
    const simData = await request('POST', '/api/simulator/send-data', {
      payload: 'GET /status HTTP/1.1'
    });
    assert(simData.status === 200 && simData.body.data.bytesSent > 0, 'Simulator Send Data transmits PSH-ACK and receives ACK');

    // 10. TCP Simulator: Disconnect (4-Way Teardown)
    const simTeardown = await request('POST', '/api/simulator/disconnect');
    assert(simTeardown.status === 200 && simTeardown.body.data.session.state === 'Terminated', 'Simulator Disconnect terminates session via 4-way teardown');

    // 11. TCP Simulator: Failure Scenario (Port Closed / RST)
    const simRst = await request('POST', '/api/simulator/connect', {
      hostname: 'closed-host.net',
      port: 9999,
      scenario: 'CONNECTION_REFUSED'
    });
    assert(simRst.status === 200 && simRst.body.data.session.state === 'Failed', 'Simulator Connection Refused transitions to Failed state on RST');

    // 12. TCP Simulator: Timeout Scenario (SYN Packet Drop)
    const simTimeout = await request('POST', '/api/simulator/connect', {
      hostname: 'blackhole-drop.com',
      port: 8080,
      scenario: 'TIMEOUT_DROP'
    });
    assert(simTimeout.status === 200 && simTimeout.body.data.session.state === 'Timeout', 'Simulator Timeout Drop transitions to Timeout state');

    // 13. FSM Logic: Valid Transition
    await request('POST', '/api/fsm/reset');
    const validTrans = await request('POST', '/api/fsm/transition', { event: 'SYN_SENT' });
    assert(validTrans.status === 200 && validTrans.body.data.currentState === 'Connecting', 'FSM valid transition: Closed + SYN_SENT -> Connecting');

    // 14. FSM Logic: Reject Invalid Transition
    const invalidTrans = await request('POST', '/api/fsm/transition', { event: 'FIN_SENT' });
    assert(invalidTrans.status === 400 && invalidTrans.body.success === false, 'FSM rejects invalid transition from Connecting with symbol FIN_SENT');

    // 15. Repeated Failure Detection (EventEmitter Alert)
    // Cause 3 consecutive failures on victim-host:3000
    await request('POST', '/api/simulator/connect', { hostname: 'victim-host.local', port: 3000, scenario: 'CONNECTION_REFUSED' });
    await request('POST', '/api/simulator/connect', { hostname: 'victim-host.local', port: 3000, scenario: 'CONNECTION_REFUSED' });
    await request('POST', '/api/simulator/connect', { hostname: 'victim-host.local', port: 3000, scenario: 'CONNECTION_REFUSED' });

    const alertsRes = await request('GET', '/api/alerts');
    const repeatedAlert = alertsRes.body.data.find(a => a.hostname === 'victim-host.local' && a.port === 3000);
    assert(repeatedAlert !== undefined, 'EventEmitter detected repeated failures and generated SecurityAlert');

    // 16. FLAT CFG Derivation
    const cfgDerivation = await request('GET', '/api/flat/derivation?scenario=full_session_2_data');
    assert(cfgDerivation.status === 200 && Array.isArray(cfgDerivation.body.data.derivationSteps), 'CFG Derivation generated step-by-step production sequence');

    // 17. FLAT PDA Simulation
    const pdaSim = await request('POST', '/api/flat/simulate-pda', {
      tokens: ['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']
    });
    assert(pdaSim.status === 200 && pdaSim.body.data.isAccepted === true, 'PDA simulates stack push/pop and accepts balanced session');

    // 18. FLAT Turing Machine & Decidability
    const tmRes = await request('GET', '/api/flat/turing-machine');
    assert(tmRes.status === 200 && tmRes.body.data.decidabilityAnalysis.isDecidable === true, 'Turing Machine computability confirms L(TCP) decidability');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
};

runTests();
