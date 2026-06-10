import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";
import Footer from "@/components/landing/Footer";

export default function CareerTermsPage() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

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
        <h1 className="font-display text-4xl font-bold mb-4">Employee Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">
          General terms governing employment at BuildStart.io, aligned with Sri Lankan labour law.
          Applies to Full-Time, Part-Time, and Contract (Fixed-Term / Independent) engagements.
          Last updated: April 5, 2026.
        </p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Governing Law</h2>
            <p className="text-muted-foreground">
              All employment relationships are governed by the laws of the Democratic Socialist Republic of
              Sri Lanka, including but not limited to the Shop and Office Employees (Regulation of Employment
              and Remuneration) Act No. 19 of 1954, the Wages Boards Ordinance No. 27 of 1941, the Employees'
              Provident Fund Act No. 15 of 1958 (EPF), the Employees' Trust Fund Act No. 46 of 1980 (ETF),
              the Payment of Gratuity Act No. 12 of 1983, the Maternity Benefits Ordinance No. 32 of 1939,
              the Termination of Employment of Workmen (Special Provisions) Act No. 45 of 1971 (TEWA), and
              the Inland Revenue Act for APIT (PAYE) deductions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. General Conditions (All Employment Types)</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Working Hours:</strong> Normal hours shall not exceed 8 hours per day or 45 hours per week (excluding meal intervals), per the Shop and Office Act.</li>
              <li><strong>Overtime:</strong> Hours worked beyond the normal threshold are paid at 1.5× the hourly rate. Overtime is capped at 12 hours per week.</li>
              <li><strong>Rest Day:</strong> Employees are entitled to a weekly rest day (typically Sunday).</li>
              <li><strong>Public Holidays:</strong> Paid leave on all 8 statutory Public Holidays per year. Mercantile, Bank, and Poya holidays apply per role classification.</li>
              <li><strong>Salary Payment:</strong> Wages must be paid by the 10th working day of the following month, in LKR, directly to a bank account.</li>
              <li><strong>Statutory Deductions:</strong> EPF (8% employee, 12% employer), ETF (3% employer), and APIT (PAYE) where applicable, are remitted monthly.</li>
              <li><strong>Confidentiality & IP:</strong> All work product, source code, designs, and customer data created during the engagement are the sole property of BuildStart.io.</li>
              <li><strong>Code of Conduct:</strong> Employees must adhere to anti-harassment, anti-bribery, and data protection policies (PDPA No. 9 of 2022).</li>
              <li><strong>Dispute Resolution:</strong> Disputes are referred first to internal mediation, then to the Labour Tribunal under the Industrial Disputes Act.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Full-Time Employment</h2>
            <p className="text-muted-foreground mb-3">
              Permanent employees engaged on an indefinite basis after a probationary period.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Probation:</strong> Up to 6 months (extendable once by 6 months). During probation, either party may terminate with 24 hours' notice.</li>
              <li><strong>Confirmation:</strong> Upon confirmation, the employee is covered under TEWA (if the establishment employs 15+ workmen).</li>
              <li><strong>Annual Leave:</strong> 14 days paid annual leave after 1 year of continuous service (pro-rated in year one based on join quarter, per Section 6 of the Shop and Office Act).</li>
              <li><strong>Casual Leave:</strong> 7 days per calendar year for personal or urgent matters.</li>
              <li><strong>Sick Leave:</strong> Typically 7 days paid medical leave per year; medical certificate required for absences exceeding 2 days.</li>
              <li><strong>Maternity Leave:</strong> 84 working days (12 weeks) of paid maternity leave for the first two live births; 42 days for subsequent births.</li>
              <li><strong>EPF / ETF / Gratuity:</strong> Mandatory contributions; gratuity of half a month's salary per year of service paid upon completion of 5+ years.</li>
              <li><strong>Termination:</strong> Requires written consent of the employee OR prior written approval of the Commissioner of Labour under TEWA (for establishments with 15+ workmen and employees with 1+ year of service). Otherwise, termination requires valid cause and disciplinary inquiry.</li>
              <li><strong>Notice Period:</strong> Standard one (1) month written notice by either party post-confirmation.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Part-Time Employment</h2>
            <p className="text-muted-foreground mb-3">
              Employees working fewer than the standard 45 hours per week on a recurring schedule.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Working Hours:</strong> Defined and agreed in the letter of appointment; typically capped at 30 hours per week.</li>
              <li><strong>Remuneration:</strong> Pro-rated hourly or daily wage. Cannot fall below the minimum wage (LKR 21,000/month or LKR 700/day, whichever applies, per the National Minimum Wage of Workers Act No. 3 of 2016).</li>
              <li><strong>EPF / ETF:</strong> Mandatory contributions apply regardless of part-time status, provided an employer-employee relationship exists.</li>
              <li><strong>Leave Entitlements:</strong> Annual, casual, and sick leave pro-rated based on hours worked relative to a full-time schedule.</li>
              <li><strong>Public Holidays:</strong> Paid only if the holiday falls on a scheduled working day.</li>
              <li><strong>Overtime:</strong> Payable at 1.5× only when total hours exceed the normal 8-hour daily / 45-hour weekly threshold.</li>
              <li><strong>Termination:</strong> Subject to the same notice requirements as full-time employees. TEWA applies if the employee has 180+ days of continuous service across a 12-month period.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Contract / Fixed-Term Employment</h2>
            <p className="text-muted-foreground mb-3">
              Engagements for a specified duration or for the completion of a specific project. Includes
              both fixed-term employees and independent contractors (consultants).
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Term:</strong> The contract clearly states the start and end date, or the deliverable milestone that ends the engagement.</li>
              <li><strong>Renewal:</strong> Contracts may be renewed in writing. Repeated renewals beyond 12 months may be deemed indefinite employment by a Labour Tribunal — renewal terms are reviewed carefully.</li>
              <li><strong>Fixed-Term Employees:</strong> Treated as employees under the Shop and Office Act. EPF, ETF, leave entitlements (pro-rated), and statutory benefits apply.</li>
              <li><strong>Independent Contractors / Consultants:</strong> Engaged on a B2B / service-provider basis. The contractor is responsible for their own income tax, EPF, and insurance. No employer-employee relationship is created. WHT (Withholding Tax) of 5% on professional fees may be deducted where applicable.</li>
              <li><strong>Deliverables & Payment:</strong> Linked to milestones or monthly retainers as defined in the agreement. Payment within 30 days of invoice unless otherwise specified.</li>
              <li><strong>Termination:</strong> Either party may terminate with 14 days' written notice, or immediately for material breach. Early termination without cause may attract payment for work completed plus a defined kill fee.</li>
              <li><strong>Gratuity:</strong> Not applicable to independent contractors. Applicable to fixed-term employees only if continuous service exceeds 5 years through contract renewals.</li>
              <li><strong>Non-Compete:</strong> A reasonable non-compete clause (limited in time and geography) applies for 6 months post-engagement.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Commission-Based Engagement</h2>
            <p className="text-muted-foreground mb-3">
              Applies to sales representatives, affiliates, and partners earning income on a
              performance basis rather than a fixed wage. Treated as an independent
              service arrangement unless combined with a base salary contract.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Commission Rate:</strong> A flat <strong>20%</strong> commission is paid on the net value of every successful sale, subscription, or paid conversion directly attributable to the representative.</li>
              <li><strong>Performance Bonus:</strong> An additional <strong>LKR 20,000 bonus</strong> is paid when the representative's <strong>cumulative monthly net sales reach LKR 150,000</strong>. The bonus is awarded once per calendar month and resets at the start of each month.</li>
              <li><strong>Attribution:</strong> Sales are attributed via unique referral code, signed proposal, or CRM-logged lead ownership. Disputes are resolved by reference to the first verified touchpoint.</li>
              <li><strong>Net Sales Definition:</strong> Gross invoice value less refunds, chargebacks, taxes (VAT/GST), payment-gateway fees, and any third-party platform commissions.</li>
              <li><strong>Payment Schedule:</strong> Commissions and bonuses are calculated on the last day of each calendar month and paid by the 10th working day of the following month, against an invoice issued by the representative.</li>
              <li><strong>Clawback:</strong> Commissions on refunded, cancelled, or charged-back transactions within 30 days of the sale are deducted from the next payout.</li>
              <li><strong>Tax & Statutory:</strong> The representative is responsible for their own income tax. Withholding Tax (WHT) of 5% on professional fees may be deducted at source where applicable. No EPF/ETF is payable on pure commission arrangements.</li>
              <li><strong>Expenses:</strong> The representative bears their own travel, communication, and marketing expenses unless pre-approved in writing.</li>
              <li><strong>Exclusivity:</strong> Non-exclusive unless explicitly stated. The representative may not promote directly competing products during the engagement.</li>
              <li><strong>Termination:</strong> Either party may terminate with 14 days' written notice. Commissions earned but unpaid as of the termination date remain payable; trailing commissions on recurring subscriptions are paid for one (1) further billing cycle only.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Remote & Hybrid Work</h2>
            <p className="text-muted-foreground">
              Where remote work is permitted, the employee/contractor is responsible for maintaining a secure
              working environment, reliable internet, and confidentiality of company assets. All company data
              must remain on authorised systems. BuildStart.io may require periodic in-office attendance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Disciplinary Procedure</h2>
            <p className="text-muted-foreground">
              Misconduct is addressed through (i) verbal warning, (ii) written warning, (iii) show-cause notice,
              and (iv) domestic inquiry. Summary dismissal is reserved for gross misconduct (theft, fraud,
              wilful damage, serious breach of confidentiality), subject to a fair inquiry as required by
              Sri Lankan labour jurisprudence.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Data Protection</h2>
            <p className="text-muted-foreground">
              Personal data of employees and contractors is processed in accordance with the Personal Data
              Protection Act No. 9 of 2022. Data is retained only for the period required for legal,
              tax, and operational purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Amendments</h2>
            <p className="text-muted-foreground">
              BuildStart.io reserves the right to amend these terms in line with changes in Sri Lankan law or
              business policy. Material changes will be communicated in writing with at least 14 days' notice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground">
              For HR or contractual queries, contact <a className="text-primary hover:underline" href="mailto:people@buildstart.io">people@buildstart.io</a>.
            </p>
          </section>

          <section className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground italic">
              Disclaimer: This document provides general information based on Sri Lankan labour law and is
              not a substitute for the individual letter of appointment or contract signed between the
              parties. In case of conflict, the signed individual agreement, read together with the
              applicable statutes, shall prevail.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
