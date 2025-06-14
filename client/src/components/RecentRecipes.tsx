import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star, Clock, Users, Heart } from "lucide-react";
import { Link } from "wouter";
import type { Recipe } from "@shared/schema";

export default function RecentRecipes() {
  const { currentFamily } = useFamily();

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['/api/families', currentFamily?.id, 'recipes'],
    enabled: !!currentFamily?.id,
  });

  // Get the 4 most recent recipes
  const recentRecipes = recipes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  if (!currentFamily) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">Recent Recipes</CardTitle>
          <Link href="/recipes">
            <Button variant="ghost" className="text-primary hover:text-primary/90">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-lg bg-gray-200 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentRecipes.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No recipes yet</h3>
            <p className="text-gray-600 mb-4">Start building your family's recipe collection.</p>
            <Link href="/recipes">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Add First Recipe
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentRecipes.map((recipe) => (
              <div key={recipe.id} className="group cursor-pointer">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 mb-3 relative">
                  {recipe.imageUrl ? (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Users className="w-16 h-16 text-primary" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-6 h-6 p-0 bg-white/80 hover:bg-white rounded-full"
                    >
                      <Heart className="w-3 h-3" />
                    </Button>
                  </div>
                  {(recipe.prepTime || recipe.cookTime) && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
                        <Clock className="w-2 h-2 mr-1" />
                        {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                      </Badge>
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {recipe.name}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {recipe.prepTime && recipe.cookTime 
                    ? `${recipe.prepTime + recipe.cookTime} min • ${recipe.servings} servings`
                    : `${recipe.servings} servings`
                  }
                </p>
                <div className="flex items-center mt-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < Math.floor(recipe.rating || 0) ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 ml-1">
                    ({recipe.ratingCount || 0})
                  </span>
                </div>
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {recipe.tags[0]}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
