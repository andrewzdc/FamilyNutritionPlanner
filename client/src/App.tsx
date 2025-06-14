import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Recipes from "@/pages/Recipes";
import MealCalendar from "@/pages/MealCalendar";
import Nutrition from "@/pages/Nutrition";
import Shopping from "@/pages/Shopping";
import Orders from "@/pages/Orders";
import Navigation from "@/components/Navigation";
import { FamilyProvider } from "@/contexts/FamilyContext";
import { UserProvider } from "@/contexts/UserContext";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <UserProvider>
          <FamilyProvider>
            <Navigation />
            <Route path="/" component={Dashboard} />
            <Route path="/recipes" component={Recipes} />
            <Route path="/meals" component={MealCalendar} />
            <Route path="/nutrition" component={Nutrition} />
            <Route path="/shopping" component={Shopping} />
            <Route path="/orders" component={Orders} />
          </FamilyProvider>
        </UserProvider>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
