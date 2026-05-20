# Changelog

All notable changes to NoCode Builder are documented here.

## [Unreleased]

### 2026-05-20T10:15:00+05:30
- Defined core agent workflow: intent parsing → task decomposition → UI generation → deploy

### 2026-05-21T09:00:00+05:30
- Landing page with hero, features grid, and CTA sections

### 2026-05-22T11:30:00+05:30
- Redesigned configure flow into guided multi-step conversation

### 2026-05-23T14:00:00+05:30
- Chat UI with streaming responses and intent parsing indicators

### 2026-05-24T10:45:00+05:30
- Wired Gemini API to configurator for natural language agent creation

### 2026-05-27T09:30:00+05:30
- Welcome sequence with configurable intro messages and skip support

### 2026-05-27T11:00:00+05:30
- Support for image/video media items in agent welcome flow

### 2026-05-28T10:00:00+05:30
- Added progress bar and skip button to welcome onboarding

### 2026-05-29T14:30:00+05:30
- DB migration: welcome_items table with ordering and media_url columns

### 2026-06-02T09:15:00+05:30
- Dashboard auto-generated from agent configuration object

### 2026-06-03T11:00:00+05:30
- Prompt-driven generation of full welcome screen and dashboard layout

### 2026-06-04T10:30:00+05:30
- Multi-step planning mode: generates features list before building

### 2026-06-05T15:00:00+05:30
- Settings split into General, Behaviour, and Integrations tabs

### 2026-06-06T09:45:00+05:30
- Live preview pane updates alongside settings changes in real time

### 2026-06-09T10:00:00+05:30
- System prompt regenerates automatically on any settings mutation

### 2026-06-10T13:30:00+05:30
- Removed manual sync button; save now triggers prompt rebuild

### 2026-06-11T11:00:00+05:30
- Fixed stale config in test sandbox not reflecting latest settings

### 2026-06-12T09:30:00+05:30
- DB migration: availability_slots and bookings tables with conflict index

### 2026-06-13T14:00:00+05:30
- Calendar UI with slot grid; unavailable slots shown as disabled

### 2026-06-16T10:15:00+05:30
- DB migration: products, variants, and orders tables

### 2026-06-17T11:30:00+05:30
- Orders tab with status badges (pending/paid/shipped) and product filter

### 2026-06-18T09:00:00+05:30
- Product variants (size/colour) and multi-image upload support

### 2026-06-19T15:45:00+05:30
- Agent can now book slots from within the chat using user context

### 2026-06-20T10:00:00+05:30
- Chat actions trigger booking, order, and lead flows inline

### 2026-06-23T09:30:00+05:30
- Configurable confirmation prompts with dynamic field capture

### 2026-06-24T11:00:00+05:30
- Custom field builder with type validation and inquiry table view

### 2026-06-25T14:00:00+05:30
- DB migration: inquiries and inquiry_fields with FK to agent

### 2026-06-26T10:30:00+05:30
- Services tab: name, duration, price, and active/inactive toggle

### 2026-06-27T09:15:00+05:30
- DB migration: services table; seed with sample services

### 2026-06-30T11:30:00+05:30
- Floating chat button opens configurator panel without leaving page

### 2026-07-01T09:00:00+05:30
- Floating bot available on all agent manage sub-pages

### 2026-07-02T14:00:00+05:30
- Site info form (name, logo, domain) wired to publish pipeline

### 2026-07-03T10:45:00+05:30
- Firecrawl integration: scrape URL → extract content → index to agent KB

### 2026-07-04T09:30:00+05:30
- Backend endpoint /api/scrape with retry on 408/504 responses

### 2026-07-07T11:00:00+05:30
- Exponential backoff (1s → 2s → 4s) with max 3 retries on timeout

### 2026-07-08T10:00:00+05:30
- PDF upload pipeline: multer → pdfparse → chunk → store in KB

### 2026-07-09T14:30:00+05:30
- Unified upload pipeline handles both PDF text extract and image OCR

### 2026-07-10T09:00:00+05:30
- Image OCR via Tesseract; extracted text indexed into agent knowledge base

### 2026-07-11T11:30:00+05:30
- Chat accepts image attachments; OCR runs and result shown inline

### 2026-07-14T10:00:00+05:30
- Agent matches uploaded images against product catalogue visually

### 2026-07-15T09:30:00+05:30
- Detects user language from first message; responds in same language

### 2026-07-16T14:00:00+05:30
- Agent config: default_language field; used when auto-detect is off

### 2026-07-17T11:00:00+05:30
- Tests for EN/SI/TA detection; language pref saved to user session

### 2026-07-21T09:15:00+05:30
- QR code generated on publish; downloadable as PNG from dashboard

### 2026-07-22T10:30:00+05:30
- Monitoring tab: message volume chart, task success %, avg response time

### 2026-07-23T14:00:00+05:30
- Role config: Admin/User/Guest; rate limits and token quota per role

### 2026-07-28T09:00:00+05:30
- Config changes now propagate instantly across all open tabs via BroadcastChannel

### 2026-07-29T11:30:00+05:30
- Panel slide-ins and chat bubble appear animations via framer-motion

### 2026-07-30T10:00:00+05:30
- Mobile layout: stacked tabs, bottom nav, touch-optimised slot picker

### 2026-08-04T09:30:00+05:30
- E2E: create agent → configure → publish → book slot test suite

### 2026-08-05T11:00:00+05:30
- Fixed off-by-one in slot end time check causing ghost conflicts

### 2026-08-06T10:00:00+05:30
- Replaced edge functions with Express.js server; routes → controllers → services

### 2026-08-10T09:00:00+05:30
- README: Node.js backend, architecture tree, frontend + backend setup steps

### 2026-08-12T10:30:00+05:30
- Final cleanup: remove Supabase edge function references, update env vars docs
