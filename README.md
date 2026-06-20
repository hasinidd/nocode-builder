# NoCode Builder — Conversational AI Agent Platform

A **no-code platform** that lets users build, configure, and deploy fully functional AI agents and business systems through natural language conversation — no manual development required.

> - Built a **conversational interface** where users describe requirements in plain language and the system generates a complete, deployable agent.
> - Implemented **dynamic UI generation** — input forms, data views, control panels and analytics sections are constructed in real time based on user intent.
> - Integrated **Firecrawl** for web scraping, **OCR** for document and image data extraction, and a **Node.js + Express.js** backend for agent orchestration and API routing.
> - Added **multi-agent coordination**, multilingual auto-detection, booking/orders/products management, and lead collection flows.
> - Enabled **QR code generation** for instant agent access and a floating configurator bot for in-app reconfiguration.

---

## Features

| Feature | Description |
|---------|-------------|
| **Conversational Builder** | Describe your app in chat — the system builds it |
| **Dynamic UI Generation** | Forms, dashboards, data views generated in real time |
| **AI Agent Engine** | Create specialized agents with context awareness and adaptive behavior |
| **Web Scraping** | Firecrawl integration for live data ingestion |
| **Document & Image OCR** | Upload PDFs or images — content is extracted and indexed |
| **Booking & Availability** | Built-in scheduling, slot management and calendar UI |
| **Orders & Products** | E-commerce module with variants, inventory and order tracking |
| **Lead Collection** | Confirmation prompts, custom fields and inquiry storage |
| **Multilingual Support** | Auto-detects user language and adapts responses |
| **QR Code Access** | Generate QR codes for instant agent deployment |
| **Access Control** | Role-based permissions, usage limits and resource policies |
| **Monitoring Dashboard** | Track interactions, task success rates and system efficiency |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TypeScript |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS |
| **Animations** | Framer Motion |
| **Backend** | Node.js + Express.js |
| **Database / Auth** | Supabase (PostgreSQL, Auth, Storage) |
| **AI / LLM** | Gemini API (conversational agent orchestration) |
| **Web Scraping** | Firecrawl API |
| **OCR** | Image & PDF text extraction pipeline |
| **Forms** | React Hook Form + Zod |
| **Data Fetching** | TanStack Query v5 |
| **Markdown Rendering** | react-markdown |
| **QR Codes** | qrcode |
| **PDF Export** | html2pdf.js |
| **Charts** | Recharts |
| **Testing** | Vitest + Playwright |

---

## Architecture

```
nocode-builder/
├── src/                        # React frontend
│   ├── components/
│   │   ├── configurator/       # Conversational builder chat UI
│   │   ├── agent/              # Agent management — tabs, settings, publish
│   │   ├── booking/            # Availability, slots, calendar
│   │   ├── orders/             # Products, variants, order tracking
│   │   ├── leads/              # Lead collection forms and inquiry table
│   │   └── ui/                 # shadcn base components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions, prompt builders
│   └── pages/                  # Route-level views
├── backend/                    # Node.js + Express.js API server
│   ├── src/
│   │   ├── routes/             # API route definitions
│   │   ├── controllers/        # Request handling & response formatting
│   │   ├── services/           # Agent orchestration, Gemini, Firecrawl
│   │   └── db/                 # Supabase client & parameterized queries
│   └── server.js               # Entry point
├── supabase/
│   └── migrations/             # DB schema — agents, bookings, orders, leads
└── public/
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project
- A [Gemini API](https://ai.google.dev/) key
- A [Firecrawl](https://firecrawl.dev/) API key

### Frontend Setup

```sh
git clone https://github.com/hasinidd/nocode-builder.git
cd nocode-builder

npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:8080`

### Backend Setup

```sh
cd backend
npm install
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY, FIRECRAWL_API_KEY
npm run dev
```

API server runs at `http://localhost:3000`

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_GEMINI_API_KEY=<your-gemini-key>
VITE_FIRECRAWL_API_KEY=<your-firecrawl-key>
```

---

## Core Workflow

```
User types a description in chat
        ↓
Gemini interprets intent & decomposes into tasks
        ↓
System generates UI components + DB schema + agent logic
        ↓
Agent is deployed with live endpoints & QR code access
        ↓
User refines via chat → system hot-updates in real time
```

---

## Testing

```sh
npm run test          # Vitest unit tests
npx playwright test   # E2E tests
```

---

## License

MIT © 2026 NoCode Builder
