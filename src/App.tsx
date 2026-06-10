import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Dashboard from "./pages/Dashboard";
import AgentBuilder from "./pages/AgentBuilder";
import AgentChatPage from "./pages/AgentChatPage";
import ShopifyCallbackPage from "./pages/ShopifyCallbackPage";
import StripeCallbackPage from "./pages/StripeCallbackPage";
import WooCommerceCallbackPage from "./pages/WooCommerceCallbackPage";
import FacebookCallbackPage from "./pages/FacebookCallbackPage";
import AgentManage from "./pages/AgentManage";
import AdminPage from "./pages/AdminPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ContentPage from "./pages/ContentPage";
import PricingPage from "./pages/PricingPage";
import CareerTermsPage from "./pages/CareerTermsPage";
import CareerRedirect from "./pages/CareerRedirect";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Verifying access...</div>;
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  // Anonymous users (created during the build flow) should be treated as
  // not-yet-signed-up so they can reach /auth and /pricing to finish onboarding.
  const isAnon = !!(user as any)?.is_anonymous;
  const isRealUser = !!user && !isAnon;

  return (
    <Routes>
      <Route path="/" element={isRealUser ? <ProtectedRoute><Dashboard /></ProtectedRoute> : <LandingPage />} />
      <Route path="/auth" element={isRealUser ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/career-terms" element={<CareerTermsPage />} />
      <Route path="/career" element={<CareerRedirect />}
      />
      <Route path="/page/:slug" element={<ContentPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/facebook" element={<FacebookCallbackPage />} />
      <Route path="/shopify/callback" element={<ShopifyCallbackPage />} />
      <Route path="/stripe/callback" element={<StripeCallbackPage />} />
      <Route path="/woocommerce/callback" element={<WooCommerceCallbackPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/setup" element={<AgentBuilder />} />
      <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
      <Route path="/chats" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/availability" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/inquiries" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/faqs" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/whatsapp" element={<Navigate to="/account" replace />} />
      <Route path="/integrations" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/settings" element={<Navigate to="/account" replace />} />
      <Route path="/billing" element={<Navigate to="/account" replace />} />
      
      <Route path="/account" element={<ProtectedRoute><AgentManage /></ProtectedRoute>} />
      <Route path="/agents/:id/chat" element={<AgentChatPage />} />
      {/* Legacy redirects */}
      <Route path="/agents/new" element={<Navigate to="/setup" replace />} />
      <Route path="/agents/:id/edit" element={<Navigate to="/setup" replace />} />
      <Route path="/agents/:id/manage" element={<Navigate to="/dashboard" replace />} />
      <Route path="/agents/:id/analytics" element={<Navigate to="/dashboard" replace />} />
      <Route path="/manage" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ImpersonationProvider>
          <AuthProvider>
            <ImpersonationBanner />
            <AppRoutes />
          </AuthProvider>
        </ImpersonationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
