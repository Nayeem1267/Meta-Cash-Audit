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

    const before = await fetch('http://localhost:4311/api/dashboard').then((res) => res.json());
    const targetId = before.employees[0]?.id;
    assert.ok(targetId, 'expected at least one employee in the dashboard');

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
