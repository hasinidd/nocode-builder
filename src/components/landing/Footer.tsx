import { Link } from "react-router-dom";
import { Mail, Linkedin, Facebook, Phone } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/page/features" },
      { label: "Pricing", href: "/page/pricing" },
      { label: "API", href: "/page/api" },
      { label: "Changelog", href: "/page/changelog" },
    ],
  },
  {
    title: "Use Cases",
    links: [
      { label: "Customer Support", href: "/page/customer-support" },
      { label: "Sales Automation", href: "/page/sales-automation" },
      { label: "Booking Management", href: "/page/booking-management" },
      { label: "Lead Qualification", href: "/page/lead-qualification" },
      { label: "WhatsApp VOIP", href: "/page/whatsapp-voip" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/page/about" },
      { label: "Blog", href: "/page/blog" },
      { label: "Careers", href: "/page/careers" },
      { label: "Contact", href: "/page/contact" },
      { label: "Partners", href: "/page/partners" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/page/documentation" },
      { label: "Help Center", href: "/page/help-center" },
      { label: "Community", href: "/page/community" },
      { label: "Status", href: "/page/status" },
      { label: "Security", href: "/page/security" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src={buildstartLogo} alt="BuildStart" className="h-8 sm:h-10" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">Smart Agents for every business</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <a href="mailto:hello@buildstart.io" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-3.5 w-3.5" /> hello@buildstart.io
              </a>
              <a href="https://www.linkedin.com/company/buildstart" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
              <a href="https://www.facebook.com/share/17hWTwTmj7/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </a>
              <a href="tel:+447575477937" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5" /> +44 7575 477 937
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} id={col.title === "Use Cases" ? "footer-use-cases" : undefined}>
              <p className="font-display text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">{col.title}</p>
              <ul className="space-y-1.5 sm:space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-[11px] sm:text-xs text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground">
          <span>© 2026 BuildStart.io. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
