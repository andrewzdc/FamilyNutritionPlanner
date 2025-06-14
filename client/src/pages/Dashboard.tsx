import { useFamily } from "@/contexts/FamilyContext";
import FamilyHeader from "@/components/FamilyHeader";
import WeeklyMealOverview from "@/components/WeeklyMealOverview";
import QuickActions from "@/components/QuickActions";
import ShoppingListPreview from "@/components/ShoppingListPreview";
import RecentRecipes from "@/components/RecentRecipes";

export default function Dashboard() {
  const { currentFamily } = useFamily();

  if (!currentFamily) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to FamilyEats!</h2>
          <p className="text-gray-600 mb-8">Create your first family to get started with meal planning.</p>
          {/* TODO: Add create family form */}
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <FamilyHeader />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <WeeklyMealOverview />
          </div>
          
          <div className="space-y-6">
            <QuickActions />
            <ShoppingListPreview />
          </div>
        </div>
        
        <RecentRecipes />
      </div>
    </main>
  );
}
