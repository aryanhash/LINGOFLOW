import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import VideoTranscription from "@/pages/VideoTranscription";
import MultilingualChat from "@/pages/MultilingualChat";
import PdfTranslation from "@/pages/PdfTranslation";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType; path?: string }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/transcription">
        <ProtectedRoute component={VideoTranscription} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={MultilingualChat} />
      </Route>
      <Route path="/pdf">
        <ProtectedRoute component={PdfTranslation} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const showHeader = location !== "/login";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark">
          <TranslationProvider>
            {showHeader && <Header />}
            <Toaster />
            <Router />
          </TranslationProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
