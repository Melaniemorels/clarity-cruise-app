import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { VYVProvider } from "./contexts/VYVContext";
import { GuideProvider } from "./contexts/GuideContext";
import { FindFriendsModal } from "./components/FindFriendsModal";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryErrorBoundary } from "./components/QueryErrorBoundary";
import { NetworkProvider } from "./contexts/NetworkContext";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — each route loads its own JS chunk on demand (like Instagram)
const Welcome = lazy(() => import("./pages/Welcome"));
const Home = lazy(() => import("./pages/Home"));
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Explore = lazy(() => import("./pages/Explore"));
const ExploreSection = lazy(() => import("./pages/ExploreSection"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const PerfectDay = lazy(() => import("./pages/PerfectDay"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DeviceSettings = lazy(() => import("./pages/DeviceSettings"));
const DeviceOnboarding = lazy(() => import("./pages/DeviceOnboarding"));
const SecurityOnboarding = lazy(() => import("./pages/SecurityOnboarding"));
const MediaConnections = lazy(() => import("./pages/MediaConnections"));
const FindFriends = lazy(() => import("./pages/FindFriends"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));

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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vyv-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <VYVProvider>
              <GuideProvider>
              <NetworkProvider>
              <NetworkStatusBanner />
              <QueryErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                  <Route path="/entries" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                  <Route path="/explore/section/:sectionKey" element={<ProtectedRoute><ExploreSection /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
                  <Route path="/perfect-day" element={<ProtectedRoute><PerfectDay /></ProtectedRoute>} />
                  <Route path="/device-settings" element={<ProtectedRoute skipOnboardingCheck><DeviceSettings /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><DeviceOnboarding /></ProtectedRoute>} />
                  <Route path="/security-onboarding" element={<ProtectedRoute skipOnboardingCheck><SecurityOnboarding /></ProtectedRoute>} />
                  <Route path="/media-connections" element={<ProtectedRoute><MediaConnections /></ProtectedRoute>} />
                  <Route path="/find-friends" element={<ProtectedRoute><FindFriends /></ProtectedRoute>} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </QueryErrorBoundary>
              </NetworkProvider>
              
              <FindFriendsModal />
              </GuideProvider>
              </VYVProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
