# MetaPay Payroll Demo

Responsive remote payroll operations demo for **Meta Platforms**. It includes a company-admin dashboard, employee records, payroll review flow, payslip preview/download, transaction history, role-oriented audit trail, and a wallet/cash-out payout design for employees without bank accounts.

## Run locally

1. Install Node.js 18 or newer.
2. From this folder run `npm start`.
3. Open `http://localhost:3000`.

No package installation is required.

## Public mobile access

The project is ready to deploy with Docker and includes `render.yaml` for Render. Connect this folder to a GitHub repository, create a new Render Blueprint, and select the repository. Render will supply a public HTTPS address that works on phones. Do not use the demo's in-memory server for real payroll: deploy a production database, identity provider, secret manager, audit retention, and licensed payment-provider adapter first.

## Employee imports

Use **People → Import Excel** and upload an `.xlsx` or `.csv` file. The first worksheet should have a header row with `Name`, `Role`, `Team`, `Monthly Gross`, and (optionally) `Payment Route`. Imported employees are marked **Pending review** until their payout route is verified.

## Payment safety

This project starts in **sandbox** mode and never moves funds. `POST /api/payouts` only queues an in-memory test transaction. A real deployment should replace that handler with a server-side adapter for a properly licensed wallet/payment provider, require provider-hosted KYC/recipient onboarding, validate webhook signatures, use an idempotency key, apply approval controls, and store encrypted credentials only in a managed secrets service.

Set `PAYMENT_MODE=production` only after supplying a real provider adapter; in the supplied server, production requests are deliberately rejected.

## Production architecture notes

- Host the UI behind a CDN and TLS; run the API in a private cloud service.
- Use an identity provider with MFA, SSO, session controls, and RBAC (payroll admin, reviewer, employee, auditor).
- Put payroll, employee, pay-run, payslip, and audit data in a transactional database. The demo uses in-memory data only.
- Keep immutable audit events, provider webhook logs, approval records, and payout reconciliation separate from browser code.
- Generate payslips server-side and serve through time-limited, employee-authorized links.

## API surface in this demo

- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/employees`
- `POST /api/payouts` (sandbox only)
