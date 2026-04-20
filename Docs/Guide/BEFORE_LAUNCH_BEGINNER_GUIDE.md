# Before Launch Guide (Beginner Friendly)

Last updated: 2026-04-20
Audience: Founder / first-time SaaS operator

---

## 1) What this guide is for

This guide tells you exactly what to do before launch, in simple steps.

It covers:
- Product launch checklist
- Security and compliance checklist
- Shopify and Meta (WhatsApp) checklist
- Custom App vs Public App decision
- Recommended launch path for this project

---

## 2) Quick answer: Are we launch-ready?

Current status:
- Core product: strong
- Integrations: strong
- Operations and compliance: still need final closure

Meaning:
- You can run a private beta with selected stores.
- You should not do a full public launch until the blockers below are closed.

---

## 3) Launch plan in plain language

Do launch in 2 phases:

1. Phase A: Private Beta (5 to 10 stores)
- Goal: prove stability with real merchants
- Duration: 1 to 2 weeks
- Keep support close and fast

2. Phase B: Public Launch
- Only after all blockers are closed
- Includes compliance evidence and partner platform readiness

---

## 4) Required actions before launch (step by step)

Use this checklist in order.

## Step 1: Close security and compliance gaps

Source of truth:
- Docs/Compliance/SECURITY_GAP_CLOSURE_TICKETS.md
- Docs/Guide/SHOPIFY_SUBMISSION_READINESS_MATRIX.md

Do these first:

1. Complete Ticket 1 (encryption at rest)
- Finish migration and tests
- Make sure old plaintext values are migrated
- Confirm no secrets are logged

2. Complete Ticket 2 (backup encryption evidence)
- Collect hosted backup encryption evidence
- Run restore drill and save proof

3. Complete Ticket 3 (strong password policy)
- Ensure both registration and reset paths enforce strong rules
- Add tests and keep evidence

4. Complete Ticket 4 (audit logging for personal data)
- Confirm reads/exports are logged for CRM and Orders
- Keep report examples for evidence pack

5. Complete Ticket 5 (DLP strategy)
- Publish DLP policy
- Enforce export guardrails by role
- Add unusual export alerting

Definition of done for this step:
- All 5 tickets marked done with evidence links.

---

## Step 2: Finalize legal and policy publication

Required for trust and submission readiness:

1. Publish Privacy Policy URL
2. Publish DPA URL or acceptance flow
3. Link both in your app and website footer

Definition of done:
- Live URLs exist and are referenced in submission docs.

---

## Step 3: Production operations hardening

Use runbook:
- Docs/Guide/RUNBOOK_PROD.md

Do this:

1. Ensure staging and production are separated
2. Ensure monitoring is active (API health, webhook failures, queue depth, token health)
3. Verify alert routes and owners are defined
4. Run one incident simulation (for example, token invalidation or webhook failure)

Definition of done:
- Team can detect, triage, and recover using runbook in less than 30 minutes.

---

## Step 4: Meta (WhatsApp) production readiness

Required actions:

1. Business verification in Meta Business Manager
2. App mode switched from development to live
3. Subscribe required webhook fields:
- messages
- message_template_status_update
- phone_number_quality_update

4. Use stable token strategy (system-user token preferred)
5. Approve core templates needed for real operations

Direct answers (important for beginners):

1. Do we need a WhatsApp app?
- Yes. You need a Meta app connected to your WhatsApp Business Account and phone number.
- In practice, this is your WhatsApp Cloud API setup in Meta Developer + Business Manager.

2. Do we need a separate Meta deployment?
- No separate app hosting is required inside Meta.
- Your own backend remains the deployed app.
- Meta needs your public webhook URL and verify token so it can send events to your backend.

3. What must be publicly reachable?
- Your webhook endpoint(s) must be reachable from the internet over HTTPS.
- Your server must be stable enough to receive webhook retries and process them correctly.

Definition of done:
- Live sending works for real customer numbers, webhook events are received, template status and quality updates are visible in app.

---

## Step 5: Shopify readiness

Required actions:

1. Complete protected customer data approval in Partner Dashboard
2. Re-authorize app if Shopify requires fresh token after approval
3. Confirm webhook reception and signature checks
4. Verify live policy links and submission evidence pack

Definition of done:
- Store can install, sync works end to end, questionnaire answers are evidence-backed.

---

## 5) Custom App vs Public App (easy explanation)

## What is a Custom App?

A Custom App is for specific merchants (private distribution).

Pros:
- Fastest to go live
- No Shopify App Store review required
- Best for private beta and early product-market fit

Cons:
- No App Store discovery
- Manual merchant onboarding

Best for:
- Early stage product
- Limited merchant cohort
- Faster iteration

---

## What is a Public App?

A Public App is listed in Shopify App Store (wide distribution).

Pros:
- App Store discovery and growth
- Standardized merchant install flow

Cons:
- Review process and longer timeline
- Higher compliance/documentation burden
- Need stronger operational maturity

Best for:
- Product with stable support and compliance process
- Team ready for larger volume and review obligations

---

## 6) Which should we choose now?

Recommended now: Custom App first, then Public App.

Reason:
- You are close technically, but still closing compliance and evidence gaps.
- Custom App lets you launch safely with real users now.
- Public App can follow after 2 to 4 weeks of stable beta proof and full evidence pack.

Decision rule:
- Choose Custom App now if speed and learning are priority.
- Choose Public App now only if you can afford extra delay and already have full evidence and support process ready.

---

## 7) 14-day practical execution plan

Days 1 to 3
- Close Ticket 1 and Ticket 3
- Publish policy pages

Days 4 to 6
- Close Ticket 2 and Ticket 4
- Run restore drill and save evidence

Days 7 to 9
- Close Ticket 5 (DLP)
- Finalize monitoring and on-call flow

Days 10 to 11
- Meta live-readiness checks
- Template approvals and webhook subscriptions

Days 12 to 13
- Shopify protected data approval checks
- Installation and webhook end-to-end tests

Day 14
- Go/No-Go review
- Start private beta cohort

---

## 8) Final Go/No-Go checklist

You are ready for private beta when all are true:
- Security tickets closed with evidence
- Meta live flow validated
- Shopify install and sync validated
- Runbook tested at least once
- Alerting path confirmed

You are ready for public launch when all are true:
- Private beta stable for at least 7 to 14 days
- Compliance matrix is evidence-complete
- Support process and SLAs active
- Shopify public submission package complete

---

## 9) If you get stuck

Start with these files:
- Docs/Compliance/SECURITY_GAP_CLOSURE_TICKETS.md
- Docs/Guide/SHOPIFY_SUBMISSION_READINESS_MATRIX.md
- Docs/Guide/RUNBOOK_PROD.md

Then update this guide after each major milestone so your launch checklist always stays accurate.
