import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const fromBuilder = searchParams.get("fromBuilder") === "1";
  const modeParam = searchParams.get("mode");
  const allowParam = searchParams.get("allow") === "1";
  const [isSignUp, setIsSignUp] = useState(modeParam === "signup" || fromBuilder);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Force build-first flow: if signup attempt with no draft + not from builder + no explicit allow,
  // bounce to landing. Login (mode=login) and explicit ?allow=1 still work for returning users.
  useEffect(() => {
    const hasDraft = !!localStorage.getItem("pending_built_agent_id");
    const wantsSignup = modeParam === "signup" || fromBuilder;
    if (wantsSignup && !fromBuilder && !allowParam && !hasDraft) {
      navigate("/", { replace: true });
    }
  }, [fromBuilder, allowParam, modeParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        await resetPassword(email);
        toast({ title: "Check your email", description: "Password reset link sent." });
        setIsForgot(false);
      } else if (isSignUp) {
        // If we're coming from the builder, the user is already an anonymous Supabase user
        // who owns the built agent. Convert that anonymous account into a permanent one
        // by attaching email + password — this preserves all their build work.
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData?.session?.user;
        if (fromBuilder && currentUser && (currentUser as any).is_anonymous) {
          const { error } = await supabase.auth.updateUser({
            email,
            password,
            data: { display_name: displayName },
          });
          if (error) throw error;
          toast({ title: "Account created!", description: "Pick a plan to launch your agent." });
          navigate("/pricing", { replace: true });
        } else {
          await signUp(email, password, displayName);
          toast({ title: "Account created!", description: "Check your email to confirm." });
        }
      } else {
        await signIn(email, password);
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + (fromBuilder ? "/pricing" : ""),
        },
      });
      if (error) {
        toast({ title: "Google Sign-In failed", description: error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <Card className="glass card-shadow border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={buildstartLogo} alt="BuildStart" className="h-14" />
            </div>
            <CardTitle className="font-display text-2xl">
              {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isForgot
                ? "Enter your email to receive a reset link"
                : isSignUp
                ? "Start building AI agents today"
                : "Sign in to your BuildStart account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isForgot && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </Button>
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
              </>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && !isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {!isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? "Loading..." : isForgot ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm space-y-2">
              {!isForgot && (
                <button
                  onClick={() => setIsForgot(true)}
                  className="text-primary hover:underline block mx-auto"
                >
                  Forgot password?
                </button>
              )}
              <button
                onClick={() => {
                  if (!isSignUp) {
                    const hasDraft = !!localStorage.getItem("pending_built_agent_id");
                    if (!hasDraft && !fromBuilder) {
                      navigate("/setup");
                      return;
                    }
                  }
                  setIsSignUp(!isSignUp);
                  setIsForgot(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Build your agent"}
              </button>
              <p className="text-xs text-muted-foreground pt-2">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
