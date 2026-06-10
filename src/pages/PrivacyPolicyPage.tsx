import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";
import Footer from "@/components/landing/Footer";

export default function PrivacyPolicyPage() {
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
        <h1 className="font-display text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 5, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">BuildStart.io ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI agent platform, website, and related services.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground">We collect information you provide directly: name, email address, phone number, business information, and payment details. We also automatically collect usage data including IP addresses, browser type, device information, and interaction logs with our AI agents.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use your information to: provide and maintain our AI agent services; process transactions and send billing information; improve our platform through analytics; send service-related communications; comply with legal obligations; and train and improve our AI models (anonymized data only).</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell your personal data. We may share information with: service providers who assist in operating our platform (payment processors, cloud hosting, WhatsApp API providers); law enforcement when required by law; and business partners with your explicit consent.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. WhatsApp & Messaging Data</h2>
            <p className="text-muted-foreground">Conversations between your customers and your AI agents via WhatsApp or web chat are stored securely to provide service continuity. You retain ownership of all conversation data and can export or delete it at any time from your dashboard.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground">We implement industry-standard security measures including encryption at rest and in transit, access controls, regular security audits, and compliance with GDPR and applicable data protection regulations.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to: access, correct, or delete your personal data; export your data; opt out of marketing communications; and restrict processing of your data. Contact us at privacy@buildstart.io to exercise these rights.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground">We use essential cookies for authentication and session management. We also use analytics cookies to understand how our platform is used. You can manage cookie preferences through your browser settings.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground">If you have questions about this Privacy Policy, please contact us at privacy@buildstart.io or through our website at buildstart.io/contact.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
