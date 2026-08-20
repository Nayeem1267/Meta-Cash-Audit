const $ = (q) => document.querySelector(q);
let data = { employees: [], audits: [], payments: [] };
let isLoggedIn = false;
const loginUser = 'Asmira';
const loginPassword = '0310';

async function api(path, options) { const r = await fetch(path, options); if (!r.ok) throw new Error((await r.json()).error || 'Something went wrong'); return r.json(); }
function money(n) { return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(n); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3200); }
function lockDashboard() {
  document.querySelectorAll('main .page').forEach(page => page.classList.add('hidden'));
  $('#overview').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('.app-shell').classList.add('hidden');
  $('#settingsLink').style.display = 'none';
}
function unlockDashboard() {
  isLoggedIn = true;
  updateLoginState();
  $('#loginScreen').classList.add('hidden');
  $('.app-shell').classList.remove('hidden');
  $('#overview').classList.remove('hidden');
  showPage('overview');
  $('#settingsLink').style.display = 'flex';
}
function updateGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#greetingTitle').textContent = `${greeting}, Asmira.`;
}
function updateLoginState() {
  const settingsLink = $('#settingsLink');
  if (!settingsLink) return;
  settingsLink.innerHTML = isLoggedIn ? '↩ <span>Logout</span>' : '⇅ <span>Login</span>';
  settingsLink.setAttribute('href', isLoggedIn ? '#logout' : '#login');
}
function render() {
  const review = data.payrollReview || { status: 'Ready for final review', decision: null };
  const statusText = review.decision === 'approved' ? 'Approved & scheduled' : review.decision === 'returned' ? 'Returned for correction' : 'Ready for final review';
  $('#payrollStatus').textContent = statusText;
  $('#payrollStatusNote').textContent = review.decision === 'approved' ? 'Sandbox pay run is scheduled' : review.decision === 'returned' ? 'Changes are required before approval' : 'Final review is ready';
  $('#employeeCount').textContent = String(data.employees.length);
  $('#employeeRows').innerHTML = data.employees.map((e) => {
    const computedNet = Number(e.net ?? Math.max(0, Number(e.gross || 0) - Number(e.deduction || 0)));
    return `<tr><td>${e.name}<small>${e.id} · ${e.role}</small></td><td>${e.team}</td><td>${money(computedNet)}</td><td><span class="badge ${e.status === 'Pending review' || e.status === 'Needs correction' ? 'pending' : ''}">${e.status}</span></td><td><div class="row-actions"><button class="outline review-record" data-id="${e.id}">Review</button><button class="outline download-slip" data-id="${e.id}">Download slip</button><button class="outline danger delete-employee" data-id="${e.id}">Delete</button></div></td></tr>`;
  }).join('');
  $('#payoutEmployee').innerHTML = data.employees.map(e => `<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
  $('#auditList').innerHTML = data.audits.slice(0, 4).map(a => `<div class="activity-item"><span class="act-icon">✓</span><div><b>${a.action}</b><small>${a.actor} · ${a.at} · ${a.ref}</small></div></div>`).join('');
  $('#paymentList').className = data.payments.length ? '' : 'empty';
  $('#paymentList').innerHTML = data.payments.length ? data.payments.map(p => `<div class="transaction"><div><b>${p.id} · ${money(p.amount)}</b><p>${p.employeeId} · ${p.method} · ${p.provider}</p></div><span class="badge pending">${p.status}</span></div>`).join('') : 'No payouts created yet. Send a sandbox payout to see its status here.';
  $('#payslipList').innerHTML = data.employees.length ? data.employees.map(employee => `<article class="panel payslip-item"><div><b>${employee.name}</b><small>${employee.id} · ${employee.team}</small></div><button class="outline download-slip" data-id="${employee.id}">Download payslip</button></article>`).join('') : '<div class="empty-state">No employees available for payslip export.</div>';
  renderPayrollProgress();
}

function payslipContent(employee) {
  const gross = Number(employee.gross || 0);
  const deductions = Number(employee.deduction ?? Math.round(gross * 0.18));
  const net = Number(employee.net ?? Math.max(0, gross - deductions));
  return `Meta Platforms — Payslip\nAugust 2026\n\nEmployee: ${employee.name} (${employee.id})\nRole: ${employee.role}\nTeam: ${employee.team}\nGross pay: ${money(gross)}\nDeductions: ${money(deductions)}\nNet pay: ${money(net)}\nPay date: August 30, 2026\nPayout route: ${employee.method || 'Wallet'}`;
}

function downloadEmployeePayslip(employeeId) {
  const employee = data.employees.find(item => item.id === employeeId);
  if (!employee) return;
  const content = payslipContent(employee);
  const fileName = `${employee.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'employee'}-payslip-2026-08.txt`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Payslip downloaded for ${employee.name}.`);
}

function renderPayrollProgress() {
  const review = data.payrollReview || { decision: null };
  const reviewStep = document.getElementById('payStepReview');
  const approveStep = document.getElementById('payStepApprove');
  const payProgressStatus = document.getElementById('payProgressStatus');
  const payProgressCount = document.getElementById('payProgressCount');
  const hasEntries = (data.payrollEntries || []).length > 0;
  const isApproved = review.decision === 'approved';
  const isReturned = review.decision === 'returned';

  if (reviewStep) {
    reviewStep.classList.toggle('done', isApproved || isReturned || hasEntries);
    reviewStep.classList.toggle('current', !isApproved && !isReturned && hasEntries);
  }

  if (approveStep) {
    approveStep.classList.toggle('done', isApproved);
    approveStep.classList.toggle('current', isApproved);
  }

  payProgressStatus.textContent = isApproved ? 'Approved & scheduled' : isReturned ? 'Returned for correction' : hasEntries ? 'Review & approve' : 'Ready to calculate';
  payProgressCount.textContent = isApproved ? '3 of 3 complete' : isReturned ? 'Needs correction' : hasEntries ? '2 of 3 complete' : '1 of 3 complete';
}

document.querySelectorAll('#employeeRows, #payslipList').forEach((root) => {
  root.addEventListener('click', async (event) => {
    const reviewButton = event.target.closest('.review-record');
    if (reviewButton) {
      openEmployeeReview(reviewButton.dataset.id);
      return;
    }

    const downloadButton = event.target.closest('.download-slip');
    if (downloadButton) {
      downloadEmployeePayslip(downloadButton.dataset.id);
      return;
    }

    const deleteButton = event.target.closest('.delete-employee');
    if (deleteButton) {
      await deleteEmployee(deleteButton.dataset.id);
    }
  });
});

async function deleteEmployee(employeeId) {
  const employee = data.employees.find(item => item.id === employeeId);
  if (!employee) return;

  const confirmed = window.confirm(`Remove ${employee.name} from this payroll workspace?`);
  if (!confirmed) return;

  try {
    const result = await api(`/api/employees/${encodeURIComponent(employeeId)}`, { method: 'DELETE' });
    data.employees = data.employees.filter(item => item.id !== employeeId);
    data.payrollEntries = data.payrollEntries.filter(entry => entry.employeeId !== employeeId);
    data.payments = data.payments.filter(payment => payment.employeeId !== employeeId);
    data.audits.unshift({ at: 'Just now', actor: 'Asmira Admin', action: 'Removed employee record from payroll', ref: result.deleted || employeeId });
    render();
    toast(`${employee.name} was removed from the payroll workspace.`);
  } catch (err) {
    toast(err.message);
  }
}
async function load() { data = await api('/api/dashboard'); render(); }
function showPage(id) { document.querySelectorAll('main .page').forEach(p => p.classList.add('hidden')); $(`#${id}`).classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); if (!isLoggedIn) { $('#loginPage').classList.remove('hidden'); return; } const target = a.getAttribute('href').slice(1); document.querySelectorAll('nav a').forEach(n => n.classList.remove('active')); a.classList.add('active'); if (['payroll', 'people', 'audit'].includes(target)) { showPage('overview'); setTimeout(() => $(`#${target}`).scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); return; } if (target === 'settings' || target === 'login') { $('#loginPage').classList.remove('hidden'); return; } if (target === 'logout') { isLoggedIn = false; updateLoginState(); lockDashboard(); toast('Logged out.'); return; } showPage(target); }));
$('#settingsLink').addEventListener('click', e => { e.preventDefault(); if (isLoggedIn) { isLoggedIn = false; updateLoginState(); lockDashboard(); toast('Logged out.'); return; } $('#loginPage').classList.remove('hidden'); });
$('#loginFormPage').addEventListener('submit', e => { e.preventDefault(); const username = $('#loginUserPage').value.trim(); const password = $('#loginPasswordPage').value.trim(); if (username === loginUser && password === loginPassword) { unlockDashboard(); e.target.reset(); toast('Logged in successfully.'); return; } toast('Invalid username or password.'); });
$('#loginForm').addEventListener('submit', e => { e.preventDefault(); const username = $('#loginUser').value.trim(); const password = $('#loginPassword').value.trim(); if (username === loginUser && password === loginPassword) { unlockDashboard(); e.target.reset(); toast('Logged in successfully.'); return; } toast('Invalid username or password.'); });
$('#reviewBtn').onclick = () => { if (!isLoggedIn) { $('#loginPage').classList.remove('hidden'); return; } $('#reviewDialog').showModal(); };
$('#reviewPayrollLink').onclick = () => $('#reviewDialog').showModal();
function calculationEntries() { const saved = new Map((data.payrollEntries || []).map(row => [row.employeeId, row])); return data.employees.map(employee => ({ employeeId: employee.id, gross: saved.get(employee.id)?.gross ?? employee.gross ?? 0, bonus: saved.get(employee.id)?.bonus ?? 0, deductions: saved.get(employee.id)?.deductions ?? employee.deduction ?? 0 })); }
function refreshCalculation() { const entries = [...$('#calculationRows').querySelectorAll('tr')]; let total = 0; entries.forEach(row => { const values = [...row.querySelectorAll('input')].map(input => Number(input.value) || 0); const net = Math.max(0, values[0] + values[1] - values[2]); row.querySelector('.calc-net').textContent = money(net); total += net; }); $('#calculationTotal').textContent = money(total); }
function openCalculation() { const entries = calculationEntries(); $('#calculationRows').innerHTML = entries.map(row => { const employee = data.employees.find(item => item.id === row.employeeId); return `<tr data-id="${row.employeeId}"><td>${employee?.name || row.employeeId}</td><td><input type="number" min="0" value="${row.gross}"></td><td><input type="number" min="0" value="${row.bonus}"></td><td><input type="number" min="0" value="${row.deductions}"></td><td class="calc-net"></td></tr>`; }).join(''); $('#calculationRows').querySelectorAll('input').forEach(input => input.addEventListener('input', refreshCalculation)); refreshCalculation(); $('#payrollDialog').showModal(); }
$('#openPayroll').onclick = openCalculation;
$('#calculationForm').addEventListener('submit', async e => { e.preventDefault(); try { const entries = [...$('#calculationRows').querySelectorAll('tr')].map(row => { const [gross, bonus, deductions] = [...row.querySelectorAll('input')].map(input => Number(input.value) || 0); return { employeeId: row.dataset.id, gross, bonus, deductions }; }); const result = await api('/api/payroll/calculate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entries }) }); data.payrollEntries = result.entries; data.payrollReview = { status:'Ready to review', decision:null }; data.employees = data.employees.map(employee => { const entry = result.entries.find(item => item.employeeId === employee.id); if (!entry) return employee; const net = Math.max(0, Number(entry.gross || 0) + Number(entry.bonus || 0) - Number(entry.deductions || 0)); return { ...employee, gross: Number(entry.gross || 0), deduction: Number(entry.deductions || 0), net }; }); data.audits.unshift({at:'Just now',actor:'Asmira Admin',action:'Updated manual payroll calculation',ref:'PAY-2026-08'}); render(); $('#payrollDialog').close(); toast(`Calculation saved: ${money(result.total)} net payroll. You can now approve it.`); } catch (err) { toast(err.message); } });
async function decidePayroll(decision) { try { const review = await api('/api/payroll/review', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ decision }) }); data.payrollReview = review; data.audits.unshift({ at:'Just now', actor:'Asmira Admin', action: decision === 'approved' ? 'Approved August payroll' : 'Returned August payroll for correction', ref:'PAY-2026-08' }); render(); $('#reviewDialog').close(); toast(decision === 'approved' ? 'Payroll approved and scheduled in sandbox mode.' : 'Payroll returned for correction.'); } catch (err) { toast(err.message); } }
$('#reviewForm').addEventListener('submit', e => { e.preventDefault(); decidePayroll('approved'); });
$('#returnPayroll').addEventListener('click', e => { e.preventDefault(); decidePayroll('returned'); });
$('#approvePayroll').addEventListener('click', e => { e.preventDefault(); decidePayroll('approved'); });
$('#addEmployee').onclick = () => $('#employeeDialog').showModal();
$('#importEmployees').onclick = () => $('#importDialog').showModal();
$('#importLink').onclick = () => $('#linkDialog').showModal();
let reviewEmployeeId = null;
function openEmployeeReview(employeeId) { const employee = data.employees.find(item => item.id === employeeId); if (!employee) return; reviewEmployeeId = employeeId; $('#reviewEmployeeName').textContent = `Review ${employee.name}`; $('#employeeReviewDialog').showModal(); }
async function decideEmployee(decision) { try { const employee = await api(`/api/employees/${encodeURIComponent(reviewEmployeeId)}/review`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ decision }) }); const index = data.employees.findIndex(item => item.id === employee.id); data.employees[index] = employee; data.audits.unshift({at:'Just now',actor:'Asmira Admin',action:decision === 'approved' ? 'Approved employee record' : 'Returned employee record for correction',ref:employee.id}); render(); $('#employeeReviewDialog').close(); toast(decision === 'approved' ? `${employee.name} approved for payroll.` : `${employee.name} returned for correction.`); } catch (err) { toast(err.message); } }
$('#employeeReviewForm').addEventListener('submit', e => { e.preventDefault(); decideEmployee('approved'); });
$('#returnEmployee').addEventListener('click', e => { e.preventDefault(); decideEmployee('returned'); });
$('#newPayout').onclick = () => $('#payoutDialog').showModal();
$('#employeeForm').addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/employees', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:$('#employeeName').value,role:$('#employeeRole').value,team:$('#employeeTeam').value,gross:$('#employeeGross').value}) }); $('#employeeDialog').close(); e.target.reset(); await load(); toast('Employee created and marked for payment-route review.'); } catch(err) { toast(err.message); } });
async function readWorkbook(file) {
  if (file.name.toLowerCase().endsWith('.csv')) return file.text();
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer); let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--; if (end < 0) throw new Error('The Excel file could not be read.');
  const count = view.getUint16(end + 10, true), offset = view.getUint32(end + 16, true), files = {}; let pos = offset;
  for (let i = 0; i < count; i++) { if (view.getUint32(pos, true) !== 0x02014b50) break; const method = view.getUint16(pos + 10, true), size = view.getUint32(pos + 20, true), nameLen = view.getUint16(pos + 28, true), extraLen = view.getUint16(pos + 30, true), commentLen = view.getUint16(pos + 32, true), local = view.getUint32(pos + 42, true), name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen)), localNameLen = view.getUint16(local + 26, true), localExtraLen = view.getUint16(local + 28, true); let content = bytes.slice(local + 30 + localNameLen + localExtraLen, local + 30 + localNameLen + localExtraLen + size); if (method === 8) content = new Uint8Array(await new Response(new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); files[name] = new TextDecoder().decode(content); pos += 46 + nameLen + extraLen + commentLen; }
  const shared = [...new DOMParser().parseFromString(files['xl/sharedStrings.xml'] || '<sst/>', 'text/xml').querySelectorAll('si')].map(si => si.textContent || ''); const sheetName = Object.keys(files).find(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)); if (!sheetName) throw new Error('No worksheet was found in this file.'); const rows = [...new DOMParser().parseFromString(files[sheetName], 'text/xml').querySelectorAll('row')].map(row => [...row.querySelectorAll('c')].map(c => c.getAttribute('t') === 's' ? shared[Number(c.querySelector('v')?.textContent)] : (c.querySelector('is')?.textContent || c.querySelector('v')?.textContent || ''))); return rows.map(r => r.map(v => String(v).replaceAll('"', '""')).map(v => `"${v}"`).join(',')).join('\n');
}
function csvRows(text) {
  const rows = text.trim().split(/\r?\n/).map(line => [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^",]*))/g)].map(m => (m[1] ?? m[2]).replaceAll('""','"').trim()));
  const [headers, ...values] = rows;
  const key = h => headers.findIndex(x => x.toLowerCase().replace(/[^a-z]/g,'') === h);
  return values.map((r) => ({
    name: r[key('name')],
    role: r[key('role')] || r[key('jobtitle')],
    team: r[key('team')] || r[key('department')],
    gross: r[key('monthlygross')] || r[key('gross')] || r[key('salary')] || r[key('grosspay')],
    deduction: r[key('deduction')] || r[key('deductions')] || r[key('totaldeduction')] || r[key('totaldeductions')],
    net: r[key('net')] || r[key('netpay')] || r[key('finalnet')] || r[key('netsalary')],
    method: r[key('paymentroute')] || r[key('paymentmethod')]
  })).filter(r => r.name);
}
$('#importForm').addEventListener('submit', async e => { e.preventDefault(); try { const file = $('#importFile').files[0]; const result = await api('/api/employees/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({employees: csvRows(await readWorkbook(file))}) }); $('#importDialog').close(); e.target.reset(); await load(); toast(`${result.added} employee records imported for review.`); } catch(err) { toast(err.message); } });
$('#linkForm').addEventListener('submit', async e => { e.preventDefault(); try { const url = $('#spreadsheetLink').value.trim(); const response = await fetch(url); if (!response.ok) throw new Error('The spreadsheet link could not be downloaded.'); const file = new File([await response.blob()], url.split('?')[0].split('/').pop() || 'employees.csv'); const result = await api('/api/employees/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({employees: csvRows(await readWorkbook(file))}) }); $('#linkDialog').close(); e.target.reset(); await load(); toast(`${result.added} employee records imported from the link.`); } catch(err) { toast('Import failed. Use a public CSV/Google Sheets publish link.'); } });
$('#payoutForm').addEventListener('submit', async e => { e.preventDefault(); try { const p = await api('/api/payouts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({employeeId:$('#payoutEmployee').value, amount:$('#payoutAmount').value, method:$('#payoutMethod').value}) }); $('#payoutDialog').close(); data.payments.unshift(p); data.audits.unshift({at:'Just now',actor:'Asmira Admin',action:'Queued sandbox payout',ref:p.id}); render(); toast('Sandbox payout queued — no money moved.'); } catch(err) { toast(err.message); } });
$('#downloadSlip').onclick = () => {
  if (!data.employees.length) {
    toast('No employees are available to download a payslip.');
    return;
  }
  downloadEmployeePayslip(data.employees[0].id);
};
updateGreeting();
updateLoginState();
lockDashboard();
load().catch(() => toast('Could not load the demo API.'));
