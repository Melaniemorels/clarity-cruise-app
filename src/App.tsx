import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryErrorBoundary } from "./components/QueryErrorBoundary";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Explore from "./pages/Explore";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Recommendations from "./pages/Recommendations";
import PerfectDay from "./pages/PerfectDay";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import NotFound from "./pages/NotFound";
import DeviceSettings from "./pages/DeviceSettings";
import DeviceOnboarding from "./pages/DeviceOnboarding";
import SecurityOnboarding from "./pages/SecurityOnboarding";
import MediaConnections from "./pages/MediaConnections";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering stale
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      // Don't refetch on window focus in production for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: 'always',
    },
    mutations: {
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
              <QueryErrorBoundary>
                <Routes>
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                  <Route path="/entries" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
                  <Route path="/perfect-day" element={<ProtectedRoute><PerfectDay /></ProtectedRoute>} />
                  <Route path="/device-settings" element={<ProtectedRoute skipOnboardingCheck><DeviceSettings /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><DeviceOnboarding /></ProtectedRoute>} />
                  <Route path="/security-onboarding" element={<ProtectedRoute skipOnboardingCheck><SecurityOnboarding /></ProtectedRoute>} />
                  <Route path="/media-connections" element={<ProtectedRoute><MediaConnections /></ProtectedRoute>} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QueryErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
