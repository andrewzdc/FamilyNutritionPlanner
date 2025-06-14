import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Flame, Dumbbell, Wheat, Droplets } from "lucide-react";
import { format } from "date-fns";
import type { NutritionLog } from "@shared/schema";

export default function Nutrition() {
  const { user } = useAuth();
  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: nutritionLogs = [], isLoading } = useQuery<NutritionLog[]>({
    queryKey: ['/api/nutrition-logs', { date: selectedDate }],
    enabled: !!user,
  });

  // Calculate daily totals
  const dailyTotals = nutritionLogs.reduce((totals, log) => ({
    calories: totals.calories + (log.calories || 0),
    protein: totals.protein + (Number(log.protein) || 0),
    carbs: totals.carbs + (Number(log.carbs) || 0),
    fat: totals.fat + (Number(log.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Daily goals (these could be user-configurable)
  const dailyGoals = {
    calories: 2000,
    protein: 120,
    carbs: 250,
    fat: 65,
  };

  // Group logs by meal type
  const logsByMealType = nutritionLogs.reduce((groups, log) => {
    const mealTypeId = log.mealTypeId || 0;
    if (!groups[mealTypeId]) groups[mealTypeId] = [];
    groups[mealTypeId].push(log);
    return groups;
  }, {} as Record<number, NutritionLog[]>);

  const mealTypeNames = {
    1: 'Breakfast',
    2: 'Lunch', 
    3: 'Dinner',
    4: 'Snacks'
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Nutrition Tracking</h2>
            <p className="text-gray-600 mt-1">Monitor your daily nutrition goals</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Log Food
          </Button>
        </div>

        {/* Daily Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Calories</CardTitle>
                <Flame className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Consumed</span>
                  <span className="font-medium">{dailyTotals.calories}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Goal</span>
                  <span className="font-medium">{dailyGoals.calories}</span>
                </div>
                <Progress 
                  value={(dailyTotals.calories / dailyGoals.calories) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {Math.max(0, dailyGoals.calories - dailyTotals.calories)} calories remaining
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Protein</CardTitle>
                <Dumbbell className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Consumed</span>
                  <span className="font-medium">{Math.round(dailyTotals.protein)}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Goal</span>
                  <span className="font-medium">{dailyGoals.protein}g</span>
                </div>
                <Progress 
                  value={(dailyTotals.protein / dailyGoals.protein) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {Math.max(0, Math.round(dailyGoals.protein - dailyTotals.protein))}g remaining
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Carbs</CardTitle>
                <Wheat className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Consumed</span>
                  <span className="font-medium">{Math.round(dailyTotals.carbs)}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Goal</span>
                  <span className="font-medium">{dailyGoals.carbs}g</span>
                </div>
                <Progress 
                  value={(dailyTotals.carbs / dailyGoals.carbs) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {Math.max(0, Math.round(dailyGoals.carbs - dailyTotals.carbs))}g remaining
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Fat</CardTitle>
                <Droplets className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Consumed</span>
                  <span className="font-medium">{Math.round(dailyTotals.fat)}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Goal</span>
                  <span className="font-medium">{dailyGoals.fat}g</span>
                </div>
                <Progress 
                  value={(dailyTotals.fat / dailyGoals.fat) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {Math.max(0, Math.round(dailyGoals.fat - dailyTotals.fat))}g remaining
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Food Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Today's Food Log</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : Object.keys(logsByMealType).length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-4">No food logged for today yet.</p>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Log your first meal
                </Button>
              </div>
            ) : (
              Object.entries(logsByMealType).map(([mealTypeId, logs]) => {
                const mealCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
                return (
                  <div key={mealTypeId} className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {mealTypeNames[parseInt(mealTypeId) as keyof typeof mealTypeNames] || 'Unknown'}
                      </h4>
                      <span className="text-sm text-gray-500">{mealCalories} calories</span>
                    </div>
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div key={log.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{log.foodName}</span>
                          <span className="text-sm text-gray-500">{log.calories} cal</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3 text-primary hover:text-primary/90">
                      <Plus className="w-3 h-3 mr-1" />
                      Add food
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
