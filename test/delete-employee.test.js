const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      fetch(url)
        .then((res) => res.ok ? resolve() : reject(new Error(`HTTP ${res.status}`)))
        .catch(() => {
          if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
          setTimeout(tryOnce, 150);
        });
    };
    tryOnce();
  });
}

test('DELETE /api/employees/:id removes an employee', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '4311' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer('http://localhost:4311/api/health');

    const create = await fetch('http://localhost:4311/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Seed employee', role: 'Accountant', team: 'Finance', gross: 4200 })
    });
    const seeded = await create.json();
    const targetId = seeded.id;
    assert.ok(targetId, 'expected a seeded employee in the dashboard');

    const res = await fetch(`http://localhost:4311/api/employees/${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });
    const json = await res.json();

    assert.equal(res.status, 200, `expected 200 but got ${res.status}: ${JSON.stringify(json)}`);
    assert.equal(json.deleted, targetId);

    const after = await fetch('http://localhost:4311/api/dashboard').then((res) => res.json());
    assert.ok(!after.employees.some((employee) => employee.id === targetId), 'employee should be removed');
  } finally {
    child.kill('SIGTERM');
  }
});

test('POST /api/employees/import calculates deduction and net pay from Excel-like values', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '4312' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer('http://localhost:4312/api/health');

    const res = await fetch('http://localhost:4312/api/employees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees: [{
          name: 'Asmira Admin',
          role: 'Finance Lead',
          team: 'Finance',
          gross: '5000',
          deduction: '750',
          net: '4250'
        }]
      })
    });
    const json = await res.json();

    assert.equal(res.status, 201, `expected 201 but got ${res.status}: ${JSON.stringify(json)}`);
    assert.equal(json.employees[0].gross, 5000);
    assert.equal(json.employees[0].deduction, 750);
    assert.equal(json.employees[0].net, 4250);
  } finally {
    child.kill('SIGTERM');
  }
});
