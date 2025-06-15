import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Recipes from "@/pages/Recipes";
import MealCalendar from "@/pages/MealCalendar";
import Nutrition from "@/pages/Nutrition";
import Shopping from "@/pages/Shopping";
import Orders from "@/pages/Orders";
import Achievements from "@/pages/Achievements";
import ProfileSettings from "@/pages/ProfileSettings";
import FamilySettings from "@/pages/FamilySettings";
import Navigation from "@/components/Navigation";
import { FamilyProvider } from "@/contexts/FamilyContext";
import { UserProvider } from "@/contexts/UserContext";

function Router() {
  return (
    <Switch>
      <UserProvider>
        <FamilyProvider>
          <Navigation />
          <Route path="/" component={Dashboard} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/meals" component={MealCalendar} />
          <Route path="/nutrition" component={Nutrition} />
          <Route path="/shopping" component={Shopping} />
          <Route path="/orders" component={Orders} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/profile-settings" component={ProfileSettings} />
          <Route path="/family-settings" component={FamilySettings} />
        </FamilyProvider>
      </UserProvider>
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
