import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Calendar, Clock, Users } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { Link } from "wouter";
import type { Meal, Recipe, MealType } from "@shared/schema";

export default function WeeklyMealOverview() {
  const { currentFamily } = useFamily();
  
  const weekStart = startOfWeek(new Date());
  const weekEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: meals = [], isLoading } = useQuery<Meal[]>({
    queryKey: ['/api/families', currentFamily?.id, 'meals', { startDate: weekStartStr, endDate: weekEnd }],
    enabled: !!currentFamily?.id,
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['/api/families', currentFamily?.id, 'recipes'],
    enabled: !!currentFamily?.id,
  });

  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['/api/meal-types'],
  });

  // Get recipe details for meals
  const mealsWithRecipes = meals.map(meal => {
    const recipe = recipes.find(r => r.id === meal.recipeId);
    const mealType = mealTypes.find(mt => mt.id === meal.mealTypeId);
    return { ...meal, recipe, mealType };
  }).filter(meal => meal.recipe); // Only show meals with recipes

  // Sort by scheduled date
  const sortedMeals = mealsWithRecipes.sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  // Get upcoming meals (limit to 3)
  const upcomingMeals = sortedMeals.slice(0, 3);

  if (!currentFamily) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">This Week's Meals</CardTitle>
          <Link href="/meals">
            <Button variant="ghost" className="text-primary hover:text-primary/90">
              View Calendar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : upcomingMeals.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No meals planned</h3>
            <p className="text-gray-600 mb-4">Start planning your family's meals for this week.</p>
            <Link href="/meals">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Plan First Meal
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingMeals.map((meal) => {
              const isToday = format(new Date(), 'yyyy-MM-dd') === meal.scheduledDate;
              const dayLabel = isToday ? 'Today' : format(new Date(meal.scheduledDate), 'EEEE');
              
              return (
                <div key={meal.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="text-center min-w-0">
                    <div className="text-sm font-medium text-gray-900">{dayLabel}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(meal.scheduledDate), 'MMM d')}
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                    {meal.recipe?.imageUrl ? (
                      <img 
                        src={meal.recipe.imageUrl} 
                        alt={meal.recipe.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {meal.recipe?.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {meal.mealType?.name} • {meal.servings || meal.recipe?.servings} servings
                    </p>
                    {meal.recipe?.prepTime && meal.recipe?.cookTime && (
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {(meal.recipe.prepTime + meal.recipe.cookTime)} min
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {meal.recipe?.tags && meal.recipe.tags.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {meal.recipe.tags[0]}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">More options</span>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {/* Add meal placeholder */}
            {upcomingMeals.length < 7 && (
              <Link href="/meals">
                <div className="flex items-center space-x-4 p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-primary transition-colors cursor-pointer">
                  <div className="text-center min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {format(addDays(new Date(), upcomingMeals.length + 1), 'EEEE')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(addDays(new Date(), upcomingMeals.length + 1), 'MMM d')}
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <Button variant="ghost" className="text-primary hover:text-primary/90">
                      <Calendar className="w-4 h-4 mr-2" />
                      Plan Meal
                    </Button>
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
