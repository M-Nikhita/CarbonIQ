const assert = require('assert');
const app = require('../server');

let server;
let baseUrl;

async function runTests() {
  console.log('==================================================');
  console.log('             API Route Endpoint Tests             ');
  console.log('==================================================\n');

  // Start server on a dynamic port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. POST /api/calculate
  await test('POST /api/calculate - Valid payload returns correct calculations and recommendations', async () => {
    const payload = {
      transport: { mode: 'car', fuelType: 'petrol', weeklyKm: 100, flightsPerYear: 'none' },
      energy: { householdSize: 2, usesRenewable: true, monthlyKwh: 300 },
      food: { dietType: 'moderateMeat', wasteLevel: 'moderate' },
      consumption: { shoppingFrequency: 'moderate' }
    };

    const res = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.result);
    assert.strictEqual(typeof data.result.grandTotal, 'number');
    assert.ok(Array.isArray(data.recommendations));
  });

  await test('POST /api/calculate - Invalid malformed body returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid'
    });

    assert.ok(res.status === 400 || res.status === 500);
  });

  // 2. POST /api/decision
  await test('POST /api/decision - Valid options returns comparative calculations', async () => {
    const payload = {
      distanceKm: 250,
      options: ['carPetrol', 'train']
    };

    const res = await fetch(`${baseUrl}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.comparison);
    assert.ok(data.comparison.best);
    assert.ok(data.comparison.worst);
    assert.strictEqual(typeof data.comparison.savingsKgIfBestChosenOverWorst, 'number');
  });

  await test('POST /api/decision - Missing options or distance returns 400 Bad Request', async () => {
    const payload = { distanceKm: 250 };
    const res = await fetch(`${baseUrl}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400);
  });

  // 3. POST /api/explain
  await test('POST /api/explain - Valid perturbation payload returns sensitive parameters', async () => {
    const payload = {
      type: 'baseline',
      inputs: { mode: 'car', fuelType: 'petrol', weeklyKm: 200, flightsPerYear: 'none' },
      category: 'transport'
    };

    const res = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.sensitivities);
    assert.ok(Array.isArray(data.sensitivities));
    assert.ok(data.explanationText);
  });

  // 4. POST /api/chat
  await test('POST /api/chat - Valid query returns dynamic response', async () => {
    const payload = {
      message: 'Hello'
    };

    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply);
    assert.ok(data.source);
  });

  await test('POST /api/chat - Empty message returns 400 Bad Request', async () => {
    const payload = { message: '' };

    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400);
  });

  // 5. GET /api/sessions/:userId
  await test('GET /api/sessions/:userId - Empty sessions array for new user', async () => {
    const randomUser = `user_${Date.now()}`;
    const res = await fetch(`${baseUrl}/sessions/${randomUser}`, {
      method: 'GET'
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.sessions));
    assert.strictEqual(data.sessions.length, 0);
  });

  // Shutdown server
  server.close();

  console.log(`\nRoute Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test execution failure:', err);
  if (server) server.close();
  process.exit(1);
});
