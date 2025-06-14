import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, List, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function QuickActions() {
  const actions = [
    {
      label: "Add Recipe",
      icon: Plus,
      href: "/recipes",
      variant: "default" as const,
      description: "Add a new recipe to your collection"
    },
    {
      label: "Plan Meal",
      icon: Calendar,
      href: "/meals",
      variant: "outline" as const,
      description: "Schedule meals on your calendar"
    },
    {
      label: "Shopping List",
      icon: List,
      href: "/shopping",
      variant: "outline" as const,
      description: "Manage your grocery shopping"
    },
    {
      label: "Log Nutrition",
      icon: BarChart3,
      href: "/nutrition",
      variant: "outline" as const,
      description: "Track your daily nutrition"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Button 
                  variant={action.variant}
                  className={`w-full justify-start space-x-3 h-auto py-3 ${
                    action.variant === "default" 
                      ? "bg-primary text-white hover:bg-primary/90" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={action.description}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
