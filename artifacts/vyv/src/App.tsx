import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark, shadcn } from "@clerk/themes";
import { enUS, esES } from "@clerk/localizations";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { resyncPushSubscription } from "./hooks/use-push-notifications";
import { VYVProvider } from "./contexts/VYVContext";
import { GuideProvider } from "./contexts/GuideContext";
import { FindFriendsModal } from "./components/FindFriendsModal";
import { VYVAssistantButton } from "./components/VYVAssistantButton";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryErrorBoundary } from "./components/QueryErrorBoundary";
import { NetworkProvider } from "./contexts/NetworkContext";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import { EXPLORER_ENABLED } from "@/lib/feature-flags";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — each route loads its own JS chunk on demand (like Instagram)
const Welcome = lazy(() => import("./pages/Welcome"));
const Home = lazy(() => import("./pages/Home"));
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Explore = lazy(() => import("./pages/Explore"));
const ExploreSection = lazy(() => import("./pages/ExploreSection"));
const ExploreSaved = lazy(() => import("./pages/ExploreSaved"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
// PerfectDay page kept in codebase but not routed — deferred to phase 2
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DeviceSettings = lazy(() => import("./pages/DeviceSettings"));
const DeviceOnboarding = lazy(() => import("./pages/DeviceOnboarding"));
const SecurityOnboarding = lazy(() => import("./pages/SecurityOnboarding"));
const Personalization = lazy(() => import("./pages/Personalization"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const MediaConnections = lazy(() => import("./pages/MediaConnections"));
const FindFriends = lazy(() => import("./pages/FindFriends"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Members = lazy(() => import("./pages/Members"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Notes = lazy(() => import("./pages/Notes"));

// Minimal loading fallback — appears briefly while route chunk loads
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

import { syncOnlineManager } from "./lib/network-query-sync";

// Sync TanStack Query online state with browser (Instagram-like offline behavior)
syncOnlineManager();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering stale
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Serve cached data when offline, fetch when online (like Instagram)
      networkMode: "offlineFirst",
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      // Don't refetch on window focus in production for better UX
      refetchOnWindowFocus: false,
      // Refetch all stale queries when reconnecting
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Pause mutations when offline, auto-retry on reconnect (like Instagram)
      networkMode: "offlineFirst",
      // Retry mutations once on network errors
      retry: 1,
    },
  },
});

// ---------------------------------------------------------------------------
// Clerk auth wiring
// ---------------------------------------------------------------------------

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits dev FAPI directly), auto-set in prod.
// Do NOT gate on PROD/NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths (with the base) to routerPush/routerReplace, but
// react-router's navigate() re-applies the basename — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Keep Clerk's UI in the same language the app is set to (no EN/ES mixing) and
// brand the titles as VYV rather than the raw Clerk instance name.
function getClerkLocalization() {
  let lang = "en";
  try {
    lang = localStorage.getItem("vyv-language") || navigator.language || "en";
  } catch {
    /* ignore */
  }
  const es = lang.toLowerCase().startsWith("es");
  const base = es ? esES : enUS;
  return {
    ...base,
    signIn: {
      ...base.signIn,
      start: {
        ...base.signIn?.start,
        title: es ? "Inicia sesión en VYV" : "Sign in to VYV",
        subtitle: es
          ? "Bienvenido de nuevo. Continúa para acceder a tu cuenta."
          : "Welcome back. Continue to access your account.",
      },
    },
    signUp: {
      ...base.signUp,
      start: {
        ...base.signUp?.start,
        title: es ? "Crea tu cuenta VYV" : "Create your VYV account",
        subtitle: es ? "Empecemos" : "Let's get started",
      },
    },
  };
}

// VYV brand appearance (emerald, old-money, quiet). Tailwind v3 project -> no
// cssLayerName; element overrides use inline style objects. Theme-aware: the
// dark variant keeps the near-black card, the light variant uses warm ivory.
const getClerkAppearance = (isDark: boolean) => {
  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const shared = {
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      // Same glyph, theme-adapted fill: soft teal (dark) / deep slate-teal (light)
      logoImageUrl: `${window.location.origin}${basePath}/${
        isDark ? "logo.svg" : "logo-light.svg"
      }`,
      socialButtonsVariant: "blockButton" as const,
    },
  };
  if (isDark) {
    return {
      ...shared,
      theme: dark,
      variables: {
        colorPrimary: "#4A8B7C", // Emerald VYV branding
        colorForeground: "#E8EBED",
        colorMutedForeground: "#9AA4AE",
        colorDanger: "#F87171",
        colorBackground: "#12171E",
        colorInput: "#1A2029",
        colorInputForeground: "#E8EBED",
        colorNeutral: "#2A323C",
        fontFamily,
        borderRadius: "0.75rem",
      },
      elements: {
        rootBox: { width: "100%", display: "flex", justifyContent: "center" },
        cardBox: {
          backgroundColor: "#12171E",
          width: "440px",
          maxWidth: "100%",
          borderRadius: "1rem",
          overflow: "hidden",
          border: "1px solid #222A33",
          boxShadow: "0 12px 40px rgb(0 0 0 / 0.35)",
        },
        card: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
        footer: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
        formButtonPrimary: { backgroundColor: "#4A8B7C", color: "#08110F" },
        socialButtonsBlockButton: { borderColor: "#2A323C" },
        socialButtonsBlockButtonText: { color: "#E8EBED" },
        footerActionLink: { color: "#4A8B7C" },
        logoImage: { height: "3rem", width: "auto" },
        logoBox: { justifyContent: "center", height: "3rem" },
        headerTitle: { textAlign: "center" as const },
        headerSubtitle: { textAlign: "center" as const },
        header: { gap: "0.75rem" },
      },
    };
  }
  return {
    ...shared,
    variables: {
      colorPrimary: "#4A8B7C",
      colorForeground: "#1C1C1E",
      colorMutedForeground: "#6B7176",
      colorDanger: "#DC2626",
      colorBackground: "#FFFFFF",
      colorInput: "#FAFAF8",
      colorInputForeground: "#1C1C1E",
      colorNeutral: "#D8D8D2",
      fontFamily,
      borderRadius: "0.75rem",
    },
    elements: {
      rootBox: { width: "100%", display: "flex", justifyContent: "center" },
      cardBox: {
        backgroundColor: "#FFFFFF",
        width: "440px",
        maxWidth: "100%",
        borderRadius: "1rem",
        overflow: "hidden",
        border: "1px solid #E7E7E1",
        boxShadow: "0 10px 32px rgb(28 28 30 / 0.08)",
      },
      card: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
      footer: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
      formButtonPrimary: { backgroundColor: "#4A8B7C", color: "#FFFFFF" },
      socialButtonsBlockButton: { borderColor: "#E0E0DA" },
      footerActionLink: { color: "#3E7568" },
      logoImage: { height: "3rem", width: "auto" },
      logoBox: { justifyContent: "center", height: "3rem" },
      headerTitle: { textAlign: "center" as const },
      headerSubtitle: { textAlign: "center" as const },
      header: { gap: "0.75rem" },
    },
  };
};

// Baseline appearance for every Clerk surface EXCEPT the sign-in screen —
// identical to the original dark branding so nothing else changes visually.
const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "#4A8B7C", // Emerald VYV branding
    colorForeground: "#E8EBED",
    colorMutedForeground: "#9AA4AE",
    colorDanger: "#F87171",
    colorBackground: "#12171E",
    colorInput: "#1A2029",
    colorInputForeground: "#E8EBED",
    colorNeutral: "#2A323C",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    borderRadius: "0.75rem",
  },
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsVariant: "blockButton" as const,
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: {
      backgroundColor: "#12171E",
      width: "440px",
      maxWidth: "100%",
      borderRadius: "1rem",
      overflow: "hidden",
      border: "1px solid #222A33",
    },
    card: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
    footer: { boxShadow: "none", border: "0", backgroundColor: "transparent" },
    formButtonPrimary: { backgroundColor: "#4A8B7C", color: "#08110F" },
    socialButtonsBlockButton: { borderColor: "#2A323C" },
    socialButtonsBlockButtonText: { color: "#E8EBED" },
    footerActionLink: { color: "#4A8B7C" },
  },
};

// Sign-in gets the refined theme-aware appearance (scoped here on purpose so
// no other Clerk surface is visually affected). The wrapper class scopes the
// dev-banner muting CSS in index.css to this screen only.
const SignInPage = () => {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const appearance = useMemo(() => getClerkAppearance(isDark), [isDark]);
  return (
    <div className="vyv-signin flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={appearance}
      />
    </div>
  );
};

const SignUpPage = () => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
    <SignUp
      routing="path"
      path={`${basePath}/sign-up`}
      signInUrl={`${basePath}/sign-in`}
      fallbackRedirectUrl={`${basePath}/`}
    />
  </div>
);

// Clears the react-query cache whenever the signed-in Clerk user changes, so one
// user's cached data never leaks into another user's session.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// Silently re-registers the browser's existing push subscription with the
// server after login (never prompts for permission).
function PushSubscriptionResync() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) void resyncPushSubscription();
  }, [user?.id]);
  return null;
}

// ClerkProvider must live inside BrowserRouter so routerPush/Replace can use
// react-router navigation. AuthProvider (which consumes Clerk hooks) nests inside.
function ClerkWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={getClerkLocalization()}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => navigate(stripBase(to))}
      routerReplace={(to) => navigate(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      {children}
    </ClerkProvider>
  );
}

const App = () => (
  <HelmetProvider>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vyv-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ClerkWithRouter>
            <AuthProvider>
              <PushSubscriptionResync />
              <VYVProvider>
              <GuideProvider>
              <NetworkProvider>
              <NetworkStatusBanner />
              <QueryErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/sign-in/*" element={<SignInPage />} />
                  <Route path="/sign-up/*" element={<SignUpPage />} />
                  {/* Legacy auth routes now redirect into the Clerk flow. */}
                  <Route path="/auth/callback" element={<Navigate to="/sign-in" replace />} />
                  <Route path="/reset-password" element={<Navigate to="/sign-in" replace />} />
                  <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
                  <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                  <Route path="/entries" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  {/* Explorer is feature-flagged off for the MVP — old links land on Home */}
                  {EXPLORER_ENABLED ? (
                    <>
                      <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                      <Route path="/explore/section/:sectionKey" element={<ProtectedRoute><ExploreSection /></ProtectedRoute>} />
                      <Route path="/explore/saved" element={<ProtectedRoute><ExploreSaved /></ProtectedRoute>} />
                    </>
                  ) : (
                    <Route path="/explore/*" element={<Navigate to="/" replace />} />
                  )}
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                 <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  {EXPLORER_ENABLED ? (
                    <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
                  ) : (
                    <Route path="/recommendations" element={<Navigate to="/" replace />} />
                  )}
                  {/* Perfect Day deferred to phase 2 — old links land on Explore (or Calendar with Explorer off) */}
                  <Route path="/perfect-day" element={<Navigate to={EXPLORER_ENABLED ? "/explore" : "/calendar"} replace />} />
                  <Route path="/device-settings" element={<ProtectedRoute skipOnboardingCheck><DeviceSettings /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><DeviceOnboarding /></ProtectedRoute>} />
                  <Route path="/security-onboarding" element={<ProtectedRoute skipOnboardingCheck><SecurityOnboarding /></ProtectedRoute>} />
                  <Route path="/profile-setup" element={<ProtectedRoute skipOnboardingCheck><ProfileSetup /></ProtectedRoute>} />
                  <Route path="/personalization" element={<ProtectedRoute skipOnboardingCheck><Personalization /></ProtectedRoute>} />
                  {EXPLORER_ENABLED ? (
                    <Route path="/media-connections" element={<ProtectedRoute><MediaConnections /></ProtectedRoute>} />
                  ) : (
                    <Route path="/media-connections" element={<Navigate to="/" replace />} />
                  )}
                  <Route path="/find-friends" element={<ProtectedRoute><FindFriends /></ProtectedRoute>} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </QueryErrorBoundary>
              </NetworkProvider>
              
              <VYVAssistantButton />
              <FindFriendsModal />
              </GuideProvider>
              </VYVProvider>
            </AuthProvider>
            </ClerkWithRouter>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </HelmetProvider>
);

export default App;
