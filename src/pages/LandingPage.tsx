import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import PositioningSection from "@/components/landing/PositioningSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DashboardSection from "@/components/landing/DashboardSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";
import FloatingChatButton from "@/components/landing/FloatingChatButton";


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PositioningSection />
      <FeaturesSection />
      <DashboardSection />
      <IntegrationsSection />
      <ComparisonSection />
      <PricingSection />
      <Footer />
      <FloatingChatButton />
    </div>
  );
}
