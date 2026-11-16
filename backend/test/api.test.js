const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const http = require('http');

// Load environment configuration
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { seedInitialAdmin } = require('../scripts/seedAdmin');
const { seedSampleEmployees } = require('../scripts/seedEmployees');

let server;
let baseUrl = 'http://localhost:5001';
let authToken = '';

test.before(async () => {
  await connectDB();
  await seedInitialAdmin();
  await seedSampleEmployees(true);

  await new Promise((resolve) => {
    server = app.listen(5001, () => {
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
});

test('1. Health check returns 200 and healthy status', async () => {
  const res = await fetch(`${baseUrl}/api/v1/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
});

test('2. Public employee search retrieves sample records', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees/search?q=Faizan`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length >= 1);
  assert.strictEqual(data.data[0].employeeId, '20251003');
  assert.strictEqual(data.data[0].employmentStatus, 'Currently Employed');
});

test('3. Public verification of valid employee (20251003) returns verified status', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees/20251003/verify`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.employeeId, '20251003');
  assert.strictEqual(data.data.fullName, 'Faizan Ahmad Mir');
  assert.strictEqual(data.data.isVerified, true);
  assert.strictEqual(data.data.isRevoked, false);
});

test('4. Public verification of non-existent employee returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees/UNKNOWN9999/verify`);
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.code, 'RECORD_NOT_FOUND');
});

test('5. Public verification of revoked employee reflects revoked status', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees/20210611/verify`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.data.isRevoked, true);
  assert.strictEqual(data.data.employmentStatus, 'Record Revoked');
});

test('6. Admin login with invalid password fails with 401', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pakiv.com', password: 'WrongPassword123!' }),
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.success, false);
});

test('7. Admin login with valid credentials succeeds and returns JWT token', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pakiv.com', password: 'PakivAdmin2026!Secure' }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.accessToken);
  authToken = data.data.accessToken;
});

test('8. Protected admin route rejects unauthorized requests', async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/employees`);
  assert.strictEqual(res.status, 401);
});

test('9. Protected admin route allows authorized requests with Bearer token', async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/employees`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test('10. Admin can fetch dashboard statistics', async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/employees/stats`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.data.total >= 5);
  assert.ok(data.data.currentlyEmployed >= 2);
});

test('11. Admin can auto-generate unique employee ID', async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/employees/generate-id`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.data.candidateId);
  assert.ok(data.data.candidateId.length >= 8);
});

test('12. Admin can create, update, revoke, restore, and delete an employee record', async () => {
  const testId = 'TEST' + Date.now().toString().slice(-5);

  // 12a. Create
  const createRes = await fetch(`${baseUrl}/api/v1/admin/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      employeeId: testId,
      fullName: 'Test Automation Engineer',
      designation: 'QA Automation Lead',
      department: 'Technology & Engineering',
      employmentType: 'Full-Time',
      employmentStatus: 'Currently Employed',
      joiningDate: '2024-02-01',
      verificationNote: 'Created by automated integration test.',
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  assert.strictEqual(createData.data.employeeId, testId);

  // 12b. Update
  const updateRes = await fetch(`${baseUrl}/api/v1/admin/employees/${testId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      designation: 'Principal QA Engineer',
    }),
  });
  assert.strictEqual(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.data.designation, 'Principal QA Engineer');

  // 12c. Revoke
  const revokeRes = await fetch(`${baseUrl}/api/v1/admin/employees/${testId}/revoke`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      reason: 'Administrative revocation test.',
    }),
  });
  assert.strictEqual(revokeRes.status, 200);
  const revokeData = await revokeRes.json();
  assert.strictEqual(revokeData.data.isRevoked, true);

  // 12d. Restore
  const restoreRes = await fetch(`${baseUrl}/api/v1/admin/employees/${testId}/restore`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.strictEqual(restoreRes.status, 200);
  const restoreData = await restoreRes.json();
  assert.strictEqual(restoreData.data.isRevoked, false);

  // 12e. Soft Delete
  const deleteRes = await fetch(`${baseUrl}/api/v1/admin/employees/${testId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.strictEqual(deleteRes.status, 200);

  // 12f. Public verification should now return 404 because it is deleted
  const verifyRes = await fetch(`${baseUrl}/api/v1/employees/${testId}/verify`);
  assert.strictEqual(verifyRes.status, 404);
});

test('13. Audit logs record administrative operations', async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.data.length > 0);
  assert.ok(data.data.some((l) => l.action === 'ADMIN_LOGIN' || l.action === 'CREATE_EMPLOYEE'));
});

