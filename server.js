const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');
const port = process.env.PORT || 3000;
const state = {
  company: 'Meta Platforms',
  payrollReview: { status: 'Ready for final review', decision: null },
  payrollEntries: [],
  employees: [
    { id: 'EMP-1042', name: 'Alicia Reyes', role: 'Product Designer', team: 'Design', method: 'Wallet', status: 'Active', gross: 9400 },
    { id: 'EMP-1018', name: 'Marcus Chen', role: 'Software Engineer', team: 'Engineering', method: 'Wallet', status: 'Active', gross: 12800 },
    { id: 'EMP-1091', name: 'Priya Nair', role: 'People Operations', team: 'People', method: 'Cash-out', status: 'Active', gross: 8100 },
    { id: 'EMP-1103', name: 'Jon Bell', role: 'Data Analyst', team: 'Finance', method: 'Wallet', status: 'Pending review', gross: 7650 }
  ],
  audits: [
    { at: 'Today, 09:42', actor: 'Nora Admin', action: 'Approved August payroll', ref: 'PAY-2026-08' },
    { at: 'Today, 09:18', actor: 'Finance Reviewer', action: 'Updated salary structure', ref: 'EMP-1042' },
    { at: 'Yesterday, 16:05', actor: 'Nora Admin', action: 'Invited employee', ref: 'EMP-1103' }
  ],
  payments: []
};

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve) => { let data = ''; req.on('data', c => data += c); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } }); }); }
function audit(actor, action, ref) { state.audits.unshift({ at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), actor, action, ref }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', environment: process.env.PAYMENT_MODE || 'sandbox' });
  if (url.pathname === '/api/dashboard') return json(res, 200, { company: state.company, employees: state.employees, audits: state.audits, payments: state.payments, payrollReview: state.payrollReview, payrollEntries: state.payrollEntries });
  if (url.pathname === '/api/employees' && req.method === 'POST') {
    const body = await readBody(req); const employee = { id: `EMP-${1104 + state.employees.length}`, name: body.name || 'New employee', role: body.role || 'Team member', team: body.team || 'Operations', method: body.method || 'Wallet', status: 'Pending review', gross: Number(body.gross) || 0 };
    state.employees.push(employee); audit('Asmira Admin', 'Created employee record', employee.id); return json(res, 201, employee);
  }
  if (url.pathname === '/api/employees/import' && req.method === 'POST') {
    const body = await readBody(req); const rows = Array.isArray(body.employees) ? body.employees.slice(0, 500) : [];
    const added = rows.filter(row => row.name).map((row, index) => ({ id: `EMP-${1104 + state.employees.length + index}`, name: String(row.name).slice(0, 120), role: String(row.role || 'Team member').slice(0, 120), team: String(row.team || 'Operations').slice(0, 80), method: row.method === 'Cash-out' ? 'Cash-out' : 'Wallet', status: 'Pending review', gross: Math.max(0, Number(row.gross) || 0) }));
    state.employees.push(...added); audit('Asmira Admin', `Imported ${added.length} employee record${added.length === 1 ? '' : 's'}`, 'EMPLOYEE-IMPORT'); return json(res, 201, { added: added.length, employees: added });
  }
  const employeeDeleteMatch = url.pathname.match(/^\/api\/employees\/([^/]+)$/);
  if (employeeDeleteMatch && req.method === 'DELETE') {
    const employeeId = decodeURIComponent(employeeDeleteMatch[1]);
    const index = state.employees.findIndex(item => item.id === employeeId);
    if (index === -1) return json(res, 404, { error: 'Employee not found' });
    const [removed] = state.employees.splice(index, 1);
    state.payrollEntries = state.payrollEntries.filter(entry => entry.employeeId !== employeeId);
    state.payments = state.payments.filter(payment => payment.employeeId !== employeeId);
    audit('Asmira Admin', 'Removed employee record from payroll', removed.id);
    return json(res, 200, { deleted: removed.id, employee: removed });
  }
  const employeeReviewMatch = url.pathname.match(/^\/api\/employees\/([^/]+)\/review$/);
  if (employeeReviewMatch && req.method === 'POST') {
    const body = await readBody(req); const employee = state.employees.find(item => item.id === decodeURIComponent(employeeReviewMatch[1]));
    if (!employee) return json(res, 404, { error: 'Employee not found' });
    const approved = body.decision === 'approved'; employee.status = approved ? 'Approved' : 'Needs correction';
    audit('Asmira Admin', approved ? 'Approved employee record' : 'Returned employee record for correction', employee.id);
    return json(res, 200, employee);
  }
  if (url.pathname === '/api/payroll/review' && req.method === 'POST') {
    const body = await readBody(req); const approved = body.decision === 'approved';
    state.payrollReview = { status: approved ? 'Approved & scheduled' : 'Returned for correction', decision: approved ? 'approved' : 'returned' };
    audit('Asmira Admin', approved ? 'Approved August payroll' : 'Returned August payroll for correction', 'PAY-2026-08');
    return json(res, 200, state.payrollReview);
  }
  if (url.pathname === '/api/payroll/calculate' && req.method === 'POST') {
    const body = await readBody(req); const entries = Array.isArray(body.entries) ? body.entries.slice(0, 500) : [];
    state.payrollEntries = entries.map(row => ({ employeeId: row.employeeId, gross: Math.max(0, Number(row.gross) || 0), bonus: Math.max(0, Number(row.bonus) || 0), deductions: Math.max(0, Number(row.deductions) || 0) }));
    state.payrollReview = { status: 'Ready to review', decision: null };
    const total = state.payrollEntries.reduce((sum, row) => sum + row.gross + row.bonus - row.deductions, 0);
    audit('Asmira Admin', 'Updated manual payroll calculation', 'PAY-2026-08'); return json(res, 200, { entries: state.payrollEntries, total });
  }
  if (url.pathname === '/api/payouts' && req.method === 'POST') {
    const body = await readBody(req);
    if ((process.env.PAYMENT_MODE || 'sandbox') !== 'sandbox') return json(res, 501, { error: 'Live payout connector is not configured. Use a licensed provider adapter.' });
    const payment = { id: `TXN-${Date.now().toString().slice(-7)}`, employeeId: body.employeeId, amount: Number(body.amount || 0), method: body.method || 'Wallet', status: 'Sandbox queued', createdAt: new Date().toISOString(), provider: 'Sandbox Wallet Adapter' };
    state.payments.unshift(payment); audit('Nora Admin', 'Queued sandbox payout', payment.id); return json(res, 202, payment);
  }
  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(root, safePath));
  if (!file.startsWith(root)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file); const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); res.end(data);
  });
});
server.listen(port, () => console.log(`MetaPay demo listening on http://localhost:${port}`));
