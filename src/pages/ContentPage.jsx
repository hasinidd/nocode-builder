import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import buildstartLogo from "@/assets/buildstart-logo.png";
import Footer from "@/components/landing/Footer";
import { Clock, Mic, Globe, FileText, MessageSquare, Brain, Smartphone, Phone, Calendar, Cpu, CalendarCheck, DollarSign, Target, Gift, CreditCard, ShoppingBag, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const pages: Record<string, { title: string; subtitle: string; icon?: LucideIcon; content: string[]; cta?: string }> = {
  // Product links
  "features": {
    title: "Features",
    subtitle: "Everything you need to build powerful AI agents",
    content: [
      "BuildStart.io provides a comprehensive suite of tools to create, train, and deploy AI agents for your business. From voice instructions to website scraping, document extraction to automated follow-ups — our platform covers every aspect of intelligent customer engagement.",
      "Set up your AI agent in under 5 minutes with our guided builder. No coding required. Simply describe your business, upload documents or scrape your website, and our AI configures everything automatically.",
      "Manage conversations, bookings, orders, and inquiries from a single unified dashboard. Track performance with real-time analytics and optimize your agent's responses over time.",
    ],
  },
  "pricing": {
    title: "Pricing",
    subtitle: "Simple, transparent pricing for every business size",
    content: [
      "BuildStart.io offers flexible plans starting from free. Our Starter plan includes up to 100 AI conversations per month, perfect for small businesses just getting started with AI automation.",
      "The Growth plan scales with your business, offering unlimited conversations, priority support, and advanced features like multi-agent management and custom integrations.",
      "Enterprise customers get dedicated support, custom SLAs, white-label options, and API access for deep integrations with existing systems.",
    ],
    cta: "View pricing",
  },
  "api": {
    title: "API Documentation",
    subtitle: "Integrate BuildStart into your existing systems",
    content: [
      "Our REST API allows you to programmatically create agents, manage conversations, and access analytics. Full OpenAPI documentation is available for seamless integration.",
      "Use webhooks to receive real-time notifications about new conversations, bookings, orders, and inquiries. Integrate with your CRM, helpdesk, or any third-party system.",
      "SDKs are available for JavaScript, Python, and PHP, making it easy to embed BuildStart capabilities directly into your applications.",
    ],
  },
  "changelog": {
    title: "Changelog",
    subtitle: "What's new in BuildStart",
    content: [
      "April 2026 — WhatsApp VOIP calling, sentiment-based conversation filtering, CSV contact export, multi-currency support, and enhanced document template generation.",
      "March 2026 — Google Calendar integration, automated welcome sequences with media, Shopify & WooCommerce sync, and real-time conversation analytics.",
      "February 2026 — Launch of BuildStart.io platform with AI agent builder, WhatsApp integration, booking management, order processing, and inquiry handling.",
    ],
  },
  // Use Cases
  "customer-support": {
    title: "Customer Support",
    subtitle: "24/7 AI-powered customer service that never sleeps",
    content: [
      "Deploy an AI agent that handles customer inquiries instantly on WhatsApp and web chat. Answer FAQs, troubleshoot issues, and escalate complex cases to human agents — all automatically.",
      "Train your agent with your knowledge base, product documentation, and FAQ library. The AI learns from every conversation to provide increasingly accurate and helpful responses.",
      "Reduce response times from hours to seconds. Our customers report 80% reduction in support tickets and 95% customer satisfaction rates with BuildStart AI agents.",
    ],
  },
  "sales-automation": {
    title: "Sales Automation",
    subtitle: "Convert leads into customers while you sleep",
    content: [
      "BuildStart's AI sales agent identifies purchase intent, qualifies leads, presents products, and processes orders — all through natural conversation on WhatsApp.",
      "Automated follow-ups ensure no lead falls through the cracks. The AI sends personalized messages at optimal times to re-engage prospects and close deals.",
      "Integrate with Stripe for seamless payment processing directly within the chat. Customers can browse, select, and pay without leaving WhatsApp.",
    ],
  },
  "booking-management": {
    title: "Booking Management",
    subtitle: "Smart scheduling that fills your calendar",
    content: [
      "Let your AI agent handle appointment scheduling, rescheduling, and cancellations. Sync with Google Calendar for real-time availability management.",
      "Automatic reminders reduce no-shows by up to 70%. The AI sends confirmation messages, pre-appointment instructions, and follow-up requests automatically.",
      "Perfect for clinics, salons, consultancies, and any service-based business that relies on appointments. Set custom time slots, buffer times, and business hours.",
    ],
  },
  "lead-qualification": {
    title: "Lead Qualification",
    subtitle: "Filter and qualify leads automatically",
    content: [
      "BuildStart's AI agent asks the right questions to qualify leads based on your criteria. Collect contact information, budget, timeline, and requirements — all through natural conversation.",
      "Leads are automatically categorized and tagged for easy follow-up. High-priority leads trigger instant notifications so your sales team can act fast.",
      "Custom fields let you collect exactly the information you need. The AI adapts its questions based on responses, creating a personalized qualification flow for each prospect.",
    ],
  },
  "whatsapp-voip": {
    title: "WhatsApp VOIP",
    subtitle: "AI-powered voice calls on WhatsApp",
    content: [
      "Take customer engagement to the next level with AI voice calls on WhatsApp. Your agent can handle phone conversations using natural language processing and text-to-speech.",
      "Perfect for businesses that need voice interactions — from order confirmations to appointment reminders to customer support calls.",
      "Supports multiple languages and accents. The AI understands context, handles interruptions, and seamlessly switches between voice and text as needed.",
    ],
  },
  // Company
  "about": {
    title: "About BuildStart",
    subtitle: "Making AI accessible for every business",
    content: [
      "BuildStart.io was founded with a simple mission: every business, regardless of size, should be able to leverage AI to grow. We believe that AI agents shouldn't require a team of developers or months of setup.",
      "Our platform enables business owners to create, train, and deploy sophisticated AI agents in minutes. From local shops to growing enterprises, BuildStart powers intelligent customer interactions across the globe.",
      "Based on cutting-edge AI technology, our platform processes millions of conversations daily, helping businesses automate support, boost sales, and manage operations more efficiently.",
    ],
  },
  "blog": {
    title: "Blog",
    subtitle: "Insights, tutorials, and updates from the BuildStart team",
    content: [
      "Stay up to date with the latest in AI automation, WhatsApp business strategies, and customer engagement best practices. Our team shares practical insights to help you get the most from your AI agents.",
      "Featured: 'How to Set Up Your First AI WhatsApp Agent in 5 Minutes' — A step-by-step guide to going live with BuildStart.",
      "Featured: '10 Ways AI Agents Are Transforming Small Business Customer Service' — Real-world case studies and ROI data from BuildStart customers.",
    ],
  },
  "careers": {
    title: "Careers",
    subtitle: "Join the team building the future of AI business automation",
    content: [
      "We're a fast-growing team of engineers, designers, and AI researchers passionate about making AI accessible. We're always looking for talented people who share our vision.",
      "Current openings: Senior Full-Stack Engineer, AI/ML Engineer, Product Designer, Customer Success Manager, and DevOps Engineer.",
      "We offer competitive compensation, remote-first culture, equity participation, and the opportunity to work on technology that impacts millions of businesses worldwide.",
    ],
  },
  "contact": {
    title: "Contact Us",
    subtitle: "We'd love to hear from you",
    content: [
      "Have a question or need help getting started? Our team is here for you. Email us at hello@buildstart.io or reach out through our WhatsApp support line.",
      "For enterprise inquiries and custom solutions, contact our sales team at sales@buildstart.io. We'll schedule a personalized demo tailored to your business needs.",
      "For press and media inquiries, please reach out to press@buildstart.io. We're happy to share insights about AI adoption trends and our platform's impact.",
    ],
  },
  "partners": {
    title: "Partner Program",
    subtitle: "Grow together with BuildStart",
    content: [
      "Our partner program is designed for agencies, consultants, and resellers who want to offer AI agent solutions to their clients. Earn recurring commissions and get priority support.",
      "As a BuildStart partner, you'll receive training, marketing materials, co-branded solutions, and a dedicated partner success manager to help you grow your AI business.",
      "Join 500+ partners worldwide who are already helping their clients automate customer interactions with BuildStart. Apply at partners@buildstart.io.",
    ],
  },
  // Resources
  "documentation": {
    title: "Documentation",
    subtitle: "Everything you need to get started and scale",
    content: [
      "Our comprehensive documentation covers everything from creating your first agent to advanced API integrations. Step-by-step guides, video tutorials, and code examples are available for every feature.",
      "Quick Start: Create an account → Describe your business → Deploy your AI agent. It really is that simple. Our guided setup wizard handles the configuration automatically.",
      "Advanced topics include custom prompt engineering, webhook integrations, multi-language configuration, and white-label deployment options.",
    ],
  },
  "help-center": {
    title: "Help Center",
    subtitle: "Find answers to common questions",
    content: [
      "Browse our extensive FAQ library covering account setup, billing, agent configuration, WhatsApp integration, and troubleshooting common issues.",
      "Can't find what you're looking for? Our support team is available via email at support@buildstart.io and responds within 2 hours during business hours.",
      "Pro and Enterprise customers get priority support with dedicated Slack channels and phone support for urgent issues.",
    ],
  },
  "community": {
    title: "Community",
    subtitle: "Connect with other BuildStart users",
    content: [
      "Join our community of 10,000+ business owners and developers using BuildStart to automate their operations. Share tips, ask questions, and learn from others' experiences.",
      "Weekly community calls feature product updates, best practices, and live Q&A sessions with our team. All community members are welcome to join and participate.",
      "Our community forum is the best place to request features, report bugs, and collaborate with other users on creative AI agent use cases.",
    ],
  },
  "status": {
    title: "System Status",
    subtitle: "Real-time platform health and uptime",
    content: [
      "BuildStart.io maintains 99.9% uptime across all services. Our infrastructure is distributed across multiple cloud regions for maximum reliability and performance.",
      "Current Status: All Systems Operational ✅ — API, WhatsApp Integration, Web Chat, Dashboard, and Payment Processing are all running normally.",
      "Subscribe to status updates at status.buildstart.io to receive notifications about planned maintenance and any service disruptions.",
    ],
  },
  "security": {
    title: "Security",
    subtitle: "Your data security is our top priority",
    content: [
      "BuildStart.io is built with security-first architecture. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We undergo regular third-party security audits and penetration testing.",
      "We are GDPR compliant and follow SOC 2 Type II security practices. Your customer conversation data is isolated per account and never shared or used for training without explicit consent.",
      "Our platform includes role-based access controls, two-factor authentication, API key management, and comprehensive audit logs for enterprise compliance requirements.",
    ],
  },
  // Feature pages
  "feature-setup-5-minutes": {
    title: "Setup Within 5 Minutes",
    subtitle: "Go live faster than any other platform",
    icon: Clock,
    content: [
      "BuildStart's revolutionary setup process lets you create and deploy a fully functional AI agent in under 5 minutes. No coding, no complex configurations, no technical expertise required.",
      "Our AI-powered configurator asks you simple questions about your business — what you do, what products or services you offer, your business hours, and how you'd like your agent to behave. From these answers, it automatically generates the perfect system prompt, knowledge base, and conversation flow.",
      "Three ways to get started: (1) Simply describe your business in natural language and let our AI do the rest. (2) Paste your website URL and we'll scrape all the relevant information automatically. (3) Upload your business documents (PDF, brochures, menus) and we'll extract everything.",
      "Compare this to traditional chatbot platforms that require weeks of setup, flow chart design, and manual training. BuildStart eliminates all of that complexity with intelligent automation.",
    ],
  },
  "feature-voice-instructions": {
    title: "Voice Instructions",
    subtitle: "Give instructions verbally to create your bot",
    icon: Mic,
    content: [
      "Don't want to type? Simply speak to BuildStart and create your AI agent using voice commands. Our advanced speech recognition understands natural language in multiple languages.",
      "Describe your business, products, services, and agent behavior using your voice. BuildStart transcribes and processes your instructions in real-time, building your agent configuration as you speak.",
      "Voice instructions are perfect for busy business owners who want to set up their AI agent while multitasking. Record a description of your business, and BuildStart handles the rest.",
      "Powered by state-of-the-art speech-to-text models, voice input supports over 30 languages and dialects, ensuring accurate transcription regardless of accent or background noise.",
    ],
  },
  "feature-website-scraping": {
    title: "Website Scraping",
    subtitle: "Scrape data directly through any website",
    icon: Globe,
    content: [
      "Paste your website URL and BuildStart automatically extracts all relevant business information — products, services, pricing, FAQs, contact details, business hours, and more.",
      "Our intelligent scraping engine understands website structure and semantics. It doesn't just copy text; it identifies and categorizes information to build a comprehensive knowledge base for your AI agent.",
      "Works with any website — from simple landing pages to complex e-commerce stores with hundreds of products. The scraper handles dynamic content, JavaScript-rendered pages, and multi-page sites.",
      "Scraped data is automatically organized into structured categories and used to train your agent. The result is an AI that can answer questions about your business as accurately as you would yourself.",
    ],
  },
  "feature-document-extraction": {
    title: "Document Extraction",
    subtitle: "Upload PDF, images & extract business data",
    icon: FileText,
    content: [
      "Upload any business document — menus, brochures, price lists, catalogs, or training materials — and BuildStart extracts all the information to build your agent's knowledge base.",
      "Supported formats include PDF, TXT, CSV, and Markdown. Our extraction engine handles complex layouts, tables, multi-column designs, and even scanned documents with OCR technology.",
      "Perfect for restaurants uploading menus, clinics uploading service lists, or retailers uploading product catalogs. The AI agent instantly knows everything in your documents and can answer customer questions about them.",
      "Multiple documents can be uploaded and merged into a single, comprehensive knowledge base. Update your documents anytime, and the agent's knowledge updates automatically.",
    ],
  },
  "feature-auto-followups": {
    title: "Auto Follow-ups",
    subtitle: "Send follow-up messages automatically",
    icon: MessageSquare,
    content: [
      "Never lose a lead again. BuildStart automatically sends personalized follow-up messages to customers who haven't responded, at the optimal time intervals you define.",
      "Configure follow-up rules: set the delay (hours or days), maximum number of follow-ups, and customize the message template. The AI personalizes each message based on the conversation context.",
      "Smart follow-ups know when to stop. The system respects customer boundaries — if a customer explicitly opts out or the conversation is resolved, follow-ups are automatically paused.",
      "Track follow-up performance in your analytics dashboard. See open rates, response rates, and conversion rates to optimize your follow-up strategy over time.",
    ],
  },
  "feature-train-through-chats": {
    title: "Train Through Chats",
    subtitle: "Improve your bot by chatting with it",
    icon: Brain,
    content: [
      "The most intuitive way to train your AI agent — simply chat with it. When the agent gives an incorrect response, correct it right in the conversation, and it learns instantly.",
      "Use the built-in configurator chat to refine your agent's personality, knowledge, and behavior through natural conversation. Tell it what to say differently, add new information, or adjust its tone.",
      "Every conversation your agent has with real customers also serves as training data (with proper anonymization). The AI continuously improves its responses based on actual interactions.",
      "No technical skills needed. If you can have a conversation, you can train your AI agent. It's as simple as saying 'When someone asks about X, respond with Y.'",
    ],
  },
  "feature-manage-via-whatsapp": {
    title: "Manage via WhatsApp",
    subtitle: "Make changes directly through WhatsApp",
    icon: Smartphone,
    content: [
      "Manage your AI agent from anywhere using your own WhatsApp. Send commands to update products, change prices, modify availability, or adjust agent behavior — all from your phone.",
      "Business owners love this feature because it means they never need to open a dashboard. Add a new product? Send a WhatsApp message. Change your business hours? Send a message. It's that simple.",
      "Management commands support natural language. You don't need to memorize specific formats — just tell your agent what to change, and it understands and executes the update.",
      "Receive real-time notifications on WhatsApp about new bookings, orders, inquiries, and important events. Stay connected to your business without being tied to a computer.",
    ],
  },
  "feature-whatsapp-voip": {
    title: "WhatsApp Call Agent (VOIP)",
    subtitle: "Handle customer calls using AI",
    icon: Phone,
    content: [
      "Groundbreaking AI voice calling on WhatsApp. Your BuildStart agent can receive and make voice calls, handling customer interactions through natural speech — just like a human agent.",
      "Powered by advanced text-to-speech and speech-to-text technology, the voice agent sounds natural and conversational. Choose from multiple voice profiles and languages.",
      "Perfect for businesses that need voice interactions: confirming orders over the phone, conducting phone surveys, appointment reminders, or providing verbal support for customers who prefer calling.",
      "Seamless handoff between voice and text. If a voice call requires visual information (like a product image or link), the agent automatically sends a follow-up text message.",
    ],
  },
  "feature-google-calendar": {
    title: "Google Calendar Integration",
    subtitle: "Sync bookings with Google Calendar",
    icon: Calendar,
    content: [
      "Connect your Google Calendar to BuildStart and your AI agent automatically knows your real-time availability. No double bookings, no conflicts — just seamless scheduling.",
      "When a customer books through your AI agent, the appointment is instantly added to your Google Calendar with all relevant details: customer name, service, time, and notes.",
      "Two-way sync means if you manually add or modify events in Google Calendar, your AI agent's availability updates automatically. Cancel an appointment in Google Calendar, and the agent knows immediately.",
      "Supports multiple calendars for businesses with multiple staff members. Each team member can connect their calendar, and the AI agent manages availability across all of them.",
    ],
  },
  "feature-ai-driven-logic": {
    title: "AI-Driven Logic",
    subtitle: "Smart decision-making powered by AI",
    icon: Cpu,
    content: [
      "Unlike traditional chatbots with rigid decision trees, BuildStart uses advanced AI to understand context, intent, and nuance in every conversation. The result is natural, human-like interactions.",
      "The AI makes intelligent decisions about how to respond: when to recommend products, when to schedule a booking, when to collect information, and when to escalate to a human agent.",
      "Contextual understanding means the AI remembers the entire conversation history. If a customer mentioned a preference earlier, the agent considers it in all subsequent recommendations.",
      "Sentiment analysis detects customer emotions and adapts the conversation tone accordingly. Frustrated customers get extra empathy; excited customers get enthusiastic engagement.",
    ],
  },
  "feature-booking-management": {
    title: "Booking Management",
    subtitle: "Handle reservations & confirmations",
    icon: CalendarCheck,
    content: [
      "Complete booking management system built into your AI agent. Customers can browse available slots, book appointments, reschedule, or cancel — all through natural conversation.",
      "Configure custom time slots, buffer times between appointments, business hours per day, and holiday schedules. The AI respects all your rules while maximizing your calendar utilization.",
      "Automatic confirmation messages with booking details, reminder messages before the appointment, and follow-up messages after. Every touchpoint is handled by your AI agent.",
      "Dashboard view gives you a complete overview of upcoming bookings, booking history, no-show tracking, and revenue analytics. Export booking data anytime for your records.",
    ],
  },
  "feature-sales-automation": {
    title: "Sales Automation",
    subtitle: "AI identifies customers ready to buy",
    icon: DollarSign,
    content: [
      "BuildStart's AI detects buying signals in conversations and automatically transitions to sales mode. When a customer shows interest, the agent presents relevant products, handles objections, and closes the deal.",
      "Smart product recommendations based on conversation context. The AI understands what the customer is looking for and suggests the most relevant items from your catalog.",
      "Integrated payment processing via Stripe. Customers can complete purchases directly in the WhatsApp conversation without being redirected to external websites.",
      "Abandoned cart recovery: if a customer shows interest but doesn't complete a purchase, the AI automatically follows up with personalized reminders and offers.",
    ],
  },
  "feature-lead-filtering": {
    title: "Lead Filtering",
    subtitle: "Qualify leads automatically",
    icon: Target,
    content: [
      "Define your ideal customer criteria and BuildStart's AI qualifies every lead automatically. Collect budget, timeline, requirements, and contact information through natural conversation.",
      "Custom qualification fields let you ask exactly the right questions for your business. The AI adapts its questioning based on previous answers, creating a personalized qualification flow.",
      "Leads are automatically scored, tagged, and categorized. High-quality leads trigger instant notifications so your sales team can prioritize follow-up.",
      "Export qualified leads as CSV with all collected data for import into your CRM or marketing automation platform.",
    ],
  },
  "feature-welcome-media": {
    title: "Automated Welcome Media",
    subtitle: "Send images, videos, docs on first contact",
    icon: Gift,
    content: [
      "Make a powerful first impression with automated welcome sequences. When a new customer contacts your agent, it can send a series of messages including text, images, videos, audio, and documents.",
      "Configure your welcome sequence in the dashboard: add your business logo, a product catalog PDF, a welcome video, or a promotional image. Arrange them in any order.",
      "Perfect for restaurants sending their menu, salons sending their service catalog, or real estate agents sending property brochures — all automatically on first contact.",
      "Welcome sequences support scheduling — send different content at different times. Send a welcome message immediately, follow up with a catalog after 5 minutes, and a special offer after an hour.",
    ],
  },
  // Integration pages
  "integration-whatsapp": {
    title: "WhatsApp Integration",
    subtitle: "Direct AI-to-WhatsApp integration — your agent on the world's most popular messaging platform",
    content: [
      "BuildStart's core integration connects your AI agent directly to WhatsApp, enabling automated conversations with your customers on the platform they already use every day.",
      "Setup takes minutes: connect your WhatsApp Business number through our dashboard, scan a QR code, and your AI agent is live. No API applications or Meta Business verification required for basic setup.",
      "Full two-way messaging support: text, images, videos, documents, audio, contacts, and locations. Your AI agent can send and receive all WhatsApp message types.",
      "Multi-session support allows you to connect multiple WhatsApp numbers to different agents, or route conversations from a single number to specialized agents based on customer needs.",
    ],
  },
  "integration-stripe": {
    title: "Stripe Payments",
    subtitle: "Process payments seamlessly within chat conversations",
    content: [
      "Integrate Stripe with BuildStart to accept payments directly within WhatsApp and web chat conversations. Customers can browse products, add to cart, and pay without leaving the chat.",
      "Support for one-time payments, subscriptions, and invoicing. Generate payment links on-the-fly and send them to customers as part of the conversation flow.",
      "Secure, PCI-compliant payment processing. All transactions are handled through Stripe's secure infrastructure — no sensitive payment data touches BuildStart servers.",
      "Automatic order creation and tracking. When a payment is confirmed, BuildStart automatically creates an order record with all details and notifies you instantly.",
    ],
  },
  "integration-shopify": {
    title: "Shopify Integration",
    subtitle: "Sync products & orders from your Shopify store",
    content: [
      "Connect your Shopify store to BuildStart and your AI agent instantly knows your entire product catalog — names, descriptions, prices, variants, images, and inventory levels.",
      "Two-way sync keeps everything up to date. Add a product in Shopify, and your AI agent can sell it within minutes. Orders placed through the AI agent are automatically created in your Shopify dashboard.",
      "The AI agent handles product inquiries, recommends items based on customer preferences, checks stock availability in real-time, and processes orders — all through natural conversation.",
      "Perfect for Shopify merchants who want to add WhatsApp as a sales channel. Reach customers where they are and provide personalized shopping experiences through chat.",
    ],
  },
  "integration-woocommerce": {
    title: "WooCommerce Integration",
    subtitle: "Connect your WooCommerce store seamlessly",
    content: [
      "WordPress and WooCommerce users can connect their stores to BuildStart with a simple API key setup. Products, categories, pricing, and inventory sync automatically.",
      "Your AI agent becomes an extension of your WooCommerce store, handling product questions, processing orders, and managing customer interactions through WhatsApp.",
      "Supports WooCommerce product variations, custom attributes, and dynamic pricing. The AI agent presents options clearly and helps customers choose the right variant.",
      "Order status updates flow back to WooCommerce, keeping your entire fulfillment workflow intact while adding AI-powered customer engagement on top.",
    ],
  },
  "integration-facebook": {
    title: "Facebook Integration",
    subtitle: "Engage customers on Facebook Messenger",
    content: [
      "Extend your AI agent's reach to Facebook Messenger. Customers who contact your Facebook page are automatically handled by your BuildStart AI agent.",
      "Same powerful AI capabilities on Facebook: answer questions, process orders, schedule bookings, and qualify leads — all through your Facebook page's messaging.",
      "Unified inbox in BuildStart means you manage WhatsApp and Facebook conversations from a single dashboard. No switching between platforms.",
      "Coming soon: Facebook ad integration for automated lead capture. When customers click your Facebook ads, they're immediately greeted by your AI agent.",
    ],
  },
  "integration-instagram": {
    title: "Instagram Integration",
    subtitle: "Automate Instagram DM conversations",
    content: [
      "Connect your Instagram business account to BuildStart and automate DM conversations. Your AI agent handles inquiries from Instagram followers 24/7.",
      "Perfect for Instagram-based businesses: boutiques, beauty brands, food businesses, and influencers who receive high volumes of DMs about products and services.",
      "The AI agent can respond to story replies, handle product inquiries triggered by posts, and guide customers through the purchase process — all within Instagram DMs.",
      "Seamless transition from Instagram to WhatsApp when needed. If a customer needs to complete a booking or payment, the agent smoothly redirects them to WhatsApp.",
    ],
  },
  "integration-google-calendar": {
    title: "Google Calendar Integration",
    subtitle: "Sync bookings & appointments with Google Calendar",
    content: [
      "Real-time two-way sync between BuildStart bookings and Google Calendar. Your AI agent always knows your exact availability.",
      "When customers book through your AI agent, events are automatically created in Google Calendar with complete details — customer name, service type, duration, and notes.",
      "Supports multiple calendars for teams. Each staff member connects their calendar, and the AI agent intelligently distributes bookings based on individual availability.",
      "Calendar-based notifications: get alerts for upcoming appointments, cancellations, and rescheduling requests directly in Google Calendar.",
    ],
  },
};

export default function ContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? pages[slug] : null;

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={buildstartLogo} alt="BuildStart" className="h-10" />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold mb-4">Page Not Found</h1>
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={buildstartLogo} alt="BuildStart" className="h-10" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          {Icon && (
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="font-display text-4xl font-bold mb-3">{page.title}</h1>
          <p className="text-lg text-muted-foreground">{page.subtitle}</p>
        </div>
        <div className="space-y-6">
          {page.content.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed text-base">{paragraph}</p>
          ))}
        </div>
        <div className="mt-12 flex gap-4">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="rounded-lg">Get Started Free</Button>
          </Link>
          <Link to="/">
            <Button size="lg" variant="outline" className="rounded-lg">Learn More</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
