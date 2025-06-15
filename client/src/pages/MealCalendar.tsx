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
  Users,
  Settings,
  RefreshCw,
  Star,
  Filter,
  Calendar,
  Zap
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
  nutritionScore?: number;
}

export default function MealCalendar() {
  const { currentFamily } = useFamily();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; mealTypeId: number } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [mealPreferences, setMealPreferences] = useState({
    dietaryRestrictions: [] as string[],
    preferredCuisines: [] as string[],
    avoidIngredients: [] as string[],
    maxCookTime: 60,
    preferredDifficulty: 'any' as 'easy' | 'medium' | 'hard' | 'any',
    balanceNutrition: true,
    repeatFrequency: 3, // days before repeating same recipe
  });

  // Get meal types from API
  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['/api/meal-types'],
  });

  // Get meals for current family
  const { data: meals = [] } = useQuery<Meal[]>({
    queryKey: [`/api/families/${currentFamily?.id}/meals`],
    enabled: !!currentFamily?.id,
  });

  // Get recipes for current family
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: [`/api/families/${currentFamily?.id}/recipes`],
    enabled: !!currentFamily?.id,
  });

  // Debug logging
  console.log('Debug - Current family:', currentFamily);
  console.log('Debug - Recipes loaded:', recipes.length, recipes);
  console.log('Debug - Meals loaded:', meals.length, meals);
  console.log('Debug - Mock meal types:', mockMealTypes);

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/families/${currentFamily?.id}/meals`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/families/${currentFamily?.id}/meals`] });
    },
  });

  // Seed recipes mutation
  const seedRecipesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/families/${currentFamily?.id}/seed-recipes`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
    },
  });

  // Smart meal generation based on preferences and nutrition balance
  const generateRecommendedMeals = (): RecommendedMeal[] => {
    if (recipes.length === 0) return [];

    const weekMeals = meals.filter(meal => {
      const mealDate = new Date(meal.scheduledDate);
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = addDays(weekStart, 6);
      return mealDate >= weekStart && mealDate <= weekEnd;
    });

    const recentRecipeIds = weekMeals.map(m => m.recipeId);
    
    // Filter recipes based on preferences
    let filteredRecipes = recipes.filter(recipe => {
      // Check dietary restrictions
      if (mealPreferences.dietaryRestrictions.length > 0) {
        const hasRestrictedIngredients = recipe.ingredients.some(ingredient =>
          mealPreferences.avoidIngredients.some(avoid => 
            ingredient.toLowerCase().includes(avoid.toLowerCase())
          )
        );
        if (hasRestrictedIngredients) return false;
      }

      // Check cook time preference
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      if (totalTime > mealPreferences.maxCookTime) return false;

      // Check difficulty preference
      if (mealPreferences.preferredDifficulty !== 'any' && recipe.difficulty) {
        if (recipe.difficulty !== mealPreferences.preferredDifficulty) return false;
      }

      // Avoid recent repeats
      if (recentRecipeIds.includes(recipe.id)) {
        const daysSinceUsed = Math.floor((Date.now() - new Date(recipe.updatedAt || '').getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceUsed < mealPreferences.repeatFrequency) return false;
      }

      return true;
    });

    // If no recipes match preferences, fallback to all recipes
    if (filteredRecipes.length === 0) {
      filteredRecipes = recipes;
    }

    const recommendations: RecommendedMeal[] = [];
    
    // Generate balanced meal combinations
    for (let i = 0; i < Math.min(6, filteredRecipes.length); i++) {
      const mainRecipe = filteredRecipes[i];
      
      // Find complementary sides for nutritional balance
      const sides = filteredRecipes.filter(r => 
        r.id !== mainRecipe.id && 
        r.tags?.some(tag => ['side', 'salad', 'vegetable', 'grain'].includes(tag.toLowerCase()))
      ).slice(0, 2);

      // Calculate nutrition score (simplified)
      const nutritionScore = calculateNutritionScore(mainRecipe, sides);

      recommendations.push({
        id: `rec-${i}`,
        recipes: [mainRecipe, ...sides],
        totalTime: (mainRecipe.prepTime || 0) + (mainRecipe.cookTime || 0),
        servings: mainRecipe.servings || 4,
        tags: [...(mainRecipe.tags || []), ...sides.flatMap(s => s.tags || [])],
        nutritionScore
      });
    }

    // Sort by nutrition score if balance is preferred
    if (mealPreferences.balanceNutrition) {
      recommendations.sort((a, b) => (b.nutritionScore || 0) - (a.nutritionScore || 0));
    }

    return recommendations;
  };

  const calculateNutritionScore = (main: Recipe, sides: Recipe[]): number => {
    // Simplified nutrition scoring based on tags and ingredients
    let score = 0;
    
    const allRecipes = [main, ...sides];
    const allTags = allRecipes.flatMap(r => r.tags || []);
    const allIngredients = allRecipes.flatMap(r => r.ingredients);

    // Bonus for balanced macros
    if (allTags.includes('protein')) score += 3;
    if (allTags.includes('vegetable') || allIngredients.some(i => ['carrot', 'broccoli', 'spinach'].includes(i))) score += 2;
    if (allTags.includes('grain') || allIngredients.some(i => ['rice', 'quinoa', 'pasta'].includes(i))) score += 2;
    if (allTags.includes('healthy')) score += 1;

    return score;
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

    // Create a meal for the main recipe (first one in the recommendation)
    const mainRecipe = recommendation.recipes[0];
    createMealMutation.mutate({
      familyId: currentFamily.id,
      recipeId: mainRecipe.id,
      mealTypeId: selectedSlot.mealTypeId,
      scheduledDate: format(selectedSlot.date, 'yyyy-MM-dd'),
      servings: recommendation.servings,
      status: 'planned'
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

  const handleSwapMeal = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowSwapDialog(true);
  };

  const applyMealTemplate = (templateName: string) => {
    const templates = {
      'mediterranean': ['Greek Salad', 'Fish Tacos', 'Pasta Primavera'],
      'comfort': ['Grilled Chicken', 'Roasted Vegetables', 'Caesar Salad'],
      'quick': ['Pasta Primavera', 'Caesar Salad', 'Fish Tacos'],
      'healthy': ['Grilled Chicken', 'Roasted Vegetables', 'Caesar Salad']
    };

    const templateRecipes = templates[templateName as keyof typeof templates] || [];
    const weekStart = startOfWeek(currentWeek);
    
    templateRecipes.forEach((recipeName, index) => {
      const matchingRecipe = recipes.find(r => r.name.includes(recipeName));
      if (matchingRecipe) {
        const day = addDays(weekStart, index % 7);
        const mealType = mockMealTypes[index % mockMealTypes.length];
        
        createMealMutation.mutate({
          familyId: currentFamily?.id,
          recipeId: matchingRecipe.id,
          mealTypeId: mealType.id,
          scheduledDate: format(day, 'yyyy-MM-dd'),
          servings: matchingRecipe.servings || 4,
          status: 'planned'
        });
      }
    });
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
          <div className="flex items-center space-x-2">
            {recipes.length === 0 && (
              <Button 
                variant="outline"
                onClick={() => seedRecipesMutation.mutate()}
                disabled={seedRecipesMutation.isPending}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {seedRecipesMutation.isPending ? 'Loading...' : 'Load Sample Recipes'}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => applyMealTemplate('mediterranean')}>
                  <Star className="w-4 h-4 mr-2" />
                  Mediterranean Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyMealTemplate('comfort')}>
                  <Star className="w-4 h-4 mr-2" />
                  Comfort Food Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyMealTemplate('quick')}>
                  <Zap className="w-4 h-4 mr-2" />
                  Quick & Easy Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyMealTemplate('healthy')}>
                  <Star className="w-4 h-4 mr-2" />
                  Healthy Week
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Meal Planning Preferences</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Max Cook Time</label>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      value={mealPreferences.maxCookTime}
                      onChange={(e) => setMealPreferences(prev => ({
                        ...prev,
                        maxCookTime: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{mealPreferences.maxCookTime} minutes</span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Repeat Frequency</label>
                    <input
                      type="range"
                      min="1"
                      max="14"
                      value={mealPreferences.repeatFrequency}
                      onChange={(e) => setMealPreferences(prev => ({
                        ...prev,
                        repeatFrequency: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">Wait {mealPreferences.repeatFrequency} days before repeating</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="balanceNutrition"
                      checked={mealPreferences.balanceNutrition}
                      onChange={(e) => setMealPreferences(prev => ({
                        ...prev,
                        balanceNutrition: e.target.checked
                      }))}
                    />
                    <label htmlFor="balanceNutrition" className="text-sm">Prioritize nutritional balance</label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline"
              onClick={handleCopyFromPreviousWeek}
              size="sm"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Previous Week
            </Button>
            
            <Button 
              onClick={handleAutoFillWeek}
              className="bg-primary hover:bg-primary/90 text-white"
              size="sm"
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
                      <div key={`${day.toISOString()}-${mealType.id}`} className="min-h-[120px] border border-gray-200 rounded-lg p-2 relative group">
                        {meal ? (
                          <div className="space-y-2 h-full">
                            {(() => {
                              const recipe = recipes.find(r => r.id === meal.recipeId);
                              if (recipe) {
                                return (
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-900 leading-tight">
                                      {recipe.name}
                                    </div>
                                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-3 h-3" />
                                        <span>{meal.servings}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</span>
                                      </div>
                                    </div>
                                    {recipe.tags && recipe.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {recipe.tags.slice(0, 2).map((tag) => (
                                          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="text-sm font-medium text-gray-900">
                                    Recipe #{meal.recipeId}
                                  </div>
                                );
                              }
                            })()}
                            
                            {/* Always visible swap button */}
                            <div className="absolute top-2 right-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                                onClick={() => handleSwapMeal(meal)}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Dropdown menu - hidden by default, shows on hover */}
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="w-3 h-3" />
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

        {/* Recipe Swap Dialog */}
        <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Swap Recipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Choose a replacement recipe for {selectedMeal ? format(new Date(selectedMeal.scheduledDate), 'EEEE, MMMM d') : ''}
              </div>
              
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {recipes
                  .filter(recipe => recipe.id !== selectedMeal?.recipeId)
                  .map((recipe) => (
                    <Card 
                      key={recipe.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                      onClick={() => {
                        if (selectedMeal) {
                          // Update the existing meal with new recipe
                          fetch(`/api/meals/${selectedMeal.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ recipeId: recipe.id })
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meals'] });
                            setShowSwapDialog(false);
                            setSelectedMeal(null);
                          });
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-medium">{recipe.name}</h4>
                            <p className="text-sm text-gray-600">{recipe.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{recipe.servings} servings</span>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              {recipe.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Select</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}