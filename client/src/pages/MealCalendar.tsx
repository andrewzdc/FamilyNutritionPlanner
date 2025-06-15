import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Shuffle,
  Clock,
  Users
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { mockMealTypes } from "@/lib/mockData";
import type { Meal, MealType, Recipe } from "@shared/schema";

interface RecommendedMeal {
  id: string;
  recipes: Recipe[];
  totalTime: number;
  servings: number;
  tags: string[];
}

export default function MealCalendar() {
  const { currentFamily } = useFamily();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; mealTypeId: number } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Get meal types from API
  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['/api/meal-types'],
  });

  // Get meals for current family
  const { data: meals = [] } = useQuery<Meal[]>({
    queryKey: ['/api/families', currentFamily?.id, 'meals'],
    enabled: !!currentFamily?.id,
  });

  // Get recipes for current family
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['/api/families', currentFamily?.id, 'recipes'],
    enabled: !!currentFamily?.id,
  });

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/families/${currentFamily?.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meals'] });
    },
  });

  // Generate recommended meals based on family recipes
  const generateRecommendedMeals = (): RecommendedMeal[] => {
    if (recipes.length === 0) {
      // Create some sample recommendations if no recipes exist
      return [
        {
          id: 'sample-1',
          recipes: [{
            id: 1,
            name: 'Sample Pasta',
            description: 'A simple pasta dish',
            ingredients: ['pasta', 'tomato sauce'],
            instructions: ['cook pasta', 'add sauce'],
            prepTime: 10,
            cookTime: 15,
            servings: 4,
            tags: ['dinner', 'easy'],
            familyId: currentFamily?.id || 1,
            createdBy: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Recipe],
          totalTime: 25,
          servings: 4,
          tags: ['dinner', 'easy']
        }
      ];
    }

    const recommendations: RecommendedMeal[] = [];
    
    // Simple meal combinations from actual recipes
    for (let i = 0; i < Math.min(6, recipes.length); i++) {
      const mainRecipe = recipes[i];
      const sides = recipes.filter(r => 
        r.id !== mainRecipe.id && 
        r.tags?.some(tag => ['side', 'salad', 'vegetable'].includes(tag.toLowerCase()))
      ).slice(0, 2);

      recommendations.push({
        id: `rec-${i}`,
        recipes: [mainRecipe, ...sides],
        totalTime: (mainRecipe.prepTime || 0) + (mainRecipe.cookTime || 0),
        servings: mainRecipe.servings || 4,
        tags: mainRecipe.tags || []
      });
    }

    return recommendations;
  };

  const recommendedMeals = generateRecommendedMeals();

  const getMealForSlot = (date: Date, mealTypeId: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return meals.find(meal => 
      meal.scheduledDate === dateStr && meal.mealTypeId === mealTypeId
    );
  };

  const handleAcceptRecommendation = (recommendation: RecommendedMeal) => {
    if (!selectedSlot || !currentFamily) return;

    // Create meals for each recipe in the recommendation
    recommendation.recipes.forEach(recipe => {
      createMealMutation.mutate({
        familyId: currentFamily.id,
        recipeId: recipe.id,
        mealTypeId: selectedSlot.mealTypeId,
        scheduledDate: format(selectedSlot.date, 'yyyy-MM-dd'),
        servings: recommendation.servings,
        status: 'planned'
      });
    });

    setShowRecommendations(false);
    setSelectedSlot(null);
  };

  const handleCopyFromPreviousWeek = () => {
    if (!currentFamily) return;
    
    const currentStart = startOfWeek(currentWeek);
    const previousStart = subWeeks(currentStart, 1);
    
    // Copy meals from previous week to current week
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(currentStart, i);
      const previousDate = addDays(previousStart, i);
      
      mockMealTypes.forEach(mealType => {
        const previousMeal = getMealForSlot(previousDate, mealType.id);
        const currentMeal = getMealForSlot(currentDate, mealType.id);
        
        if (previousMeal && !currentMeal) {
          createMealMutation.mutate({
            familyId: currentFamily.id,
            recipeId: previousMeal.recipeId,
            mealTypeId: mealType.id,
            scheduledDate: format(currentDate, 'yyyy-MM-dd'),
            servings: previousMeal.servings,
            status: 'planned'
          });
        }
      });
    }
  };

  const handleAutoFillWeek = () => {
    if (!currentFamily || recipes.length === 0) {
      // If no recipes, create sample meals
      const sampleRecipes = [
        { name: 'Grilled Chicken', id: 'sample-1' },
        { name: 'Pasta Primavera', id: 'sample-2' },
        { name: 'Fish Tacos', id: 'sample-3' },
        { name: 'Beef Stir Fry', id: 'sample-4' },
        { name: 'Vegetable Curry', id: 'sample-5' }
      ];
      
      const startDate = startOfWeek(currentWeek);
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(startDate, i);
        mockMealTypes.forEach((mealType, index) => {
          const existingMeal = getMealForSlot(date, mealType.id);
          if (!existingMeal) {
            const randomRecipe = sampleRecipes[Math.floor(Math.random() * sampleRecipes.length)];
            // For demo purposes, just log what would be created
            console.log(`Would create meal: ${randomRecipe.name} for ${format(date, 'yyyy-MM-dd')} ${mealType.name}`);
          }
        });
      }
      return;
    }

    const startDate = startOfWeek(currentWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      mockMealTypes.forEach(mealType => {
        const existingMeal = getMealForSlot(date, mealType.id);
        if (!existingMeal && recipes.length > 0) {
          const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
          
          createMealMutation.mutate({
            familyId: currentFamily.id,
            recipeId: randomRecipe.id,
            mealTypeId: mealType.id,
            scheduledDate: format(date, 'yyyy-MM-dd'),
            servings: randomRecipe.servings || 4,
            status: 'planned'
          });
        }
      });
    }
  };

  const openRecommendations = (date: Date, mealTypeId: number) => {
    setSelectedSlot({ date, mealTypeId });
    setShowRecommendations(true);
  };

  if (!currentFamily) {
    return <div>Please select a family first.</div>;
  }

  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Meal Calendar</h2>
            <p className="text-gray-600 mt-1">Plan your family's meals for the week</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={handleCopyFromPreviousWeek}
              className="text-gray-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Previous Week
            </Button>
            <Button 
              onClick={handleAutoFillWeek}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Auto-Fill Week
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">
              Week of {format(weekStart, 'MMMM d, yyyy')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-8 gap-2">
              {/* Header Row */}
              <div className="font-medium text-sm text-gray-500 p-2"></div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="font-medium text-sm text-gray-700 p-2 text-center">
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-lg">{format(day, 'd')}</div>
                </div>
              ))}

              {/* Meal Rows */}
              {mockMealTypes.map((mealType) => (
                <div key={mealType.id} className="contents">
                  <div className="font-medium text-sm text-gray-700 p-2 border-r">
                    {mealType.name}
                  </div>
                  {weekDays.map((day) => {
                    const meal = getMealForSlot(day, mealType.id);
                    return (
                      <div key={`${day.toISOString()}-${mealType.id}`} className="min-h-[120px] border border-gray-200 rounded-lg p-2">
                        {meal ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-900">
                              Recipe #{meal.recipeId}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              <span>{meal.servings}</span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Meal
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Meal
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Meal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <Dialog open={showRecommendations && selectedSlot?.date.toDateString() === day.toDateString() && selectedSlot?.mealTypeId === mealType.id} onOpenChange={setShowRecommendations}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full h-full border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center"
                                onClick={() => openRecommendations(day, mealType.id)}
                              >
                                <Plus className="w-6 h-6 text-gray-400" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Recommended Meals</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {recommendedMeals.length > 0 ? (
                                  recommendedMeals.map((recommendation) => (
                                    <Card key={recommendation.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleAcceptRecommendation(recommendation)}>
                                      <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                          <div className="space-y-2">
                                            <h4 className="font-medium">
                                              {recommendation.recipes.map(r => r.name).join(' + ')}
                                            </h4>
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                              <div className="flex items-center space-x-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{recommendation.totalTime} min</span>
                                              </div>
                                              <div className="flex items-center space-x-1">
                                                <Users className="w-4 h-4" />
                                                <span>{recommendation.servings} servings</span>
                                              </div>
                                            </div>
                                            <div className="flex space-x-1">
                                              {recommendation.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                  {tag}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                          <Button size="sm">Accept</Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">No recommendations available.</p>
                                    <p className="text-sm text-gray-400">Add some recipes to get meal suggestions.</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}