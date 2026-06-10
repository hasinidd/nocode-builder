import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";
import Footer from "@/components/landing/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
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
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold mb-4">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 5, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using BuildStart.io, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">BuildStart.io provides an AI-powered agent platform enabling businesses to automate customer interactions via WhatsApp, web chat, and other channels. Our services include agent creation, conversation management, booking systems, order processing, and integrations with third-party platforms.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground">You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to: use our platform for spam, fraud, or illegal activities; impersonate others; attempt to reverse-engineer our AI models; exceed your plan's usage limits; or transmit malicious content through our agents.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Subscription & Billing</h2>
            <p className="text-muted-foreground">Paid plans are billed monthly or annually. You may cancel at any time; cancellation takes effect at the end of the current billing period. We reserve the right to adjust pricing with 30 days' notice. Refunds are handled on a case-by-case basis.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground">You retain ownership of your content and data. BuildStart.io retains ownership of the platform, AI models, and all related technology. You grant us a limited license to process your data solely for providing the service.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">BuildStart.io is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid us in the preceding 12 months.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-muted-foreground">We may suspend or terminate your account for violation of these terms. Upon termination, you may request an export of your data within 30 days.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Contact</h2>
            <p className="text-muted-foreground">For questions about these terms, contact us at legal@buildstart.io.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
