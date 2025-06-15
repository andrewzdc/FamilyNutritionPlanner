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
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  Check,
  X,
  Copy,
  Shuffle,
  Clock,
  Users
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
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
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; mealTypeId: number } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const queryClient = useQueryClient();
  
  const weekStart = startOfWeek(currentWeek);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['/api/meal-types'],
  });

  const { data: meals = [], isLoading } = useQuery<Meal[]>({
    queryKey: ['/api/families', currentFamily?.id, 'meals'],
    enabled: !!currentFamily?.id,
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['/api/families', currentFamily?.id, 'recipes'],
    enabled: !!currentFamily?.id,
  });

  // Generate recommended meals based on family recipes
  const generateRecommendedMeals = (): RecommendedMeal[] => {
    if (recipes.length === 0) return [];

    const recommendations: RecommendedMeal[] = [];
    
    // Simple meal combinations
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
    return meals.find(meal => 
      meal.scheduledDate === format(date, 'yyyy-MM-dd') && 
      meal.mealTypeId === mealTypeId
    );
  };

  const getRecipeById = (id: number) => {
    return recipes.find(recipe => recipe.id === id);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  // Mutations
  const createMealMutation = useMutation({
    mutationFn: async (mealData: any) => {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mealData),
      });
      if (!response.ok) throw new Error('Failed to create meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meals'] });
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meals'] });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meals'] });
    },
  });

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

  const handleReplaceMeal = (mealId: number, newRecipeId: number) => {
    updateMealMutation.mutate({
      id: mealId,
      recipeId: newRecipeId
    });
  };

  const handleDeleteMeal = (mealId: number) => {
    deleteMealMutation.mutate(mealId);
  };

  const handleCopyMeal = (sourceMeal: Meal, targetDate: Date, targetMealTypeId: number) => {
    if (!currentFamily) return;

    createMealMutation.mutate({
      familyId: currentFamily.id,
      recipeId: sourceMeal.recipeId,
      mealTypeId: targetMealTypeId,
      scheduledDate: format(targetDate, 'yyyy-MM-dd'),
      servings: sourceMeal.servings,
      status: 'planned'
    });
  };

  const handleCopyFromPreviousWeek = () => {
    const previousWeekStart = subWeeks(weekStart, 1);
    const previousWeekDays = [...Array(7)].map((_, i) => addDays(previousWeekStart, i));
    
    previousWeekDays.forEach((prevDay, dayIndex) => {
      const currentDay = weekDays[dayIndex];
      mealTypes.forEach(mealType => {
        const prevMeal = meals.find(meal => 
          meal.scheduledDate === format(prevDay, 'yyyy-MM-dd') && 
          meal.mealTypeId === mealType.id
        );
        
        if (prevMeal) {
          handleCopyMeal(prevMeal, currentDay, mealType.id);
        }
      });
    });
  };

  const openRecommendations = (date: Date, mealTypeId: number) => {
    setSelectedSlot({ date, mealTypeId });
    setShowRecommendations(true);
  };

  if (!currentFamily) {
    return <div>Please select a family first.</div>;
  }

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
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Shuffle className="w-4 h-4 mr-2" />
              Auto-Fill Week
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-xl font-semibold text-gray-900">
                {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'd, yyyy')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="p-4 text-sm font-medium text-gray-700">Meal Type</div>
            {weekDays.map((day, index) => (
              <div key={index} className="p-4 text-sm font-medium text-gray-700 text-center border-l border-gray-200">
                <div>{format(day, 'EEE')}</div>
                <div className="text-lg font-semibold">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          
          {/* Calendar Body */}
          {mealTypes.map((mealType, mealTypeIndex) => (
            <div key={mealType.id} className={`grid grid-cols-8 ${mealTypeIndex < mealTypes.length - 1 ? 'border-b border-gray-200' : ''}`}>
              <div className="p-4 bg-gray-50 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-700">{mealType.name}</span>
              </div>
              {weekDays.map((day, dayIndex) => {
                const dayMeals = meals.filter(meal => 
                  meal.scheduledDate === format(day, 'yyyy-MM-dd') && 
                  meal.mealTypeId === mealType.id
                );
                
                return (
                  <div key={dayIndex} className={`p-2 min-h-[120px] ${dayIndex < weekDays.length - 1 ? 'border-r border-gray-200' : ''}`}>
                    {dayMeals.length > 0 ? (
                      <div className="space-y-2">
                        {dayMeals.map(meal => {
                          const recipe = meal.recipeId ? getRecipeById(meal.recipeId) : null;
                          return (
                            <div key={meal.id} className="bg-blue-50 border border-blue-200 rounded-lg p-2 group">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-blue-900 truncate">
                                    {recipe?.name || 'Unknown Recipe'}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      <Users className="w-3 h-3 mr-1" />
                                      {meal.servings}
                                    </Badge>
                                    {recipe && (
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {}}>
                                      Edit Meal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {}}>
                                      Replace Recipe
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteMeal(meal.id)}
                                      className="text-red-600"
                                    >
                                      Delete Meal
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="w-full h-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                        onClick={() => openRecommendations(day, mealType.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      </div>

      {/* Meal Recommendations Dialog */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recommended Meals</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {recommendedMeals.map(recommendation => (
              <Card key={recommendation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {recommendation.recipes.map(r => r.name).join(' + ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {recommendation.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {recommendation.totalTime}m
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {recommendation.servings} servings
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAcceptRecommendation(recommendation)}
                        className="flex-1"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button variant="outline" size="sm">
                        <Shuffle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {recommendedMeals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No recommendations available.</p>
              <p className="text-sm mt-1">Add some recipes to get meal suggestions.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}