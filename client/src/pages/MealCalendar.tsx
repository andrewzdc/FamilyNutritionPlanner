import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import type { Meal, MealType } from "@shared/schema";

export default function MealCalendar() {
  const { currentFamily } = useFamily();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['/api/meal-types'],
  });

  const { data: meals = [], isLoading } = useQuery<Meal[]>({
    queryKey: ['/api/families', currentFamily?.id, 'meals'],
    enabled: !!currentFamily?.id,
  });

  const getMealForSlot = (date: Date, mealTypeId: number) => {
    return meals.find(meal => 
      meal.scheduledDate === format(date, 'yyyy-MM-dd') && 
      meal.mealTypeId === mealTypeId
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
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
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
              <Button variant="ghost" size="sm" className="bg-gray-50 text-primary">Week</Button>
              <Button variant="ghost" size="sm" className="text-gray-600">Month</Button>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Meal
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
                {format(day, 'EEE d')}
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
                const meal = getMealForSlot(day, mealType.id);
                return (
                  <div key={dayIndex} className={`p-2 min-h-[100px] ${dayIndex < weekDays.length - 1 ? 'border-r border-gray-200' : ''}`}>
                    {meal ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors">
                        <div className="text-sm font-medium text-blue-900">
                          {/* TODO: Get recipe name from meal.recipeId */}
                          Planned Meal
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {meal.servings} servings
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="w-full h-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
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
    </main>
  );
}
