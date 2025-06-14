import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Star, Clock, Users, Heart, Link2, Camera, Video, Mic, FileText, Upload, Scan, Download, Sparkles, ChefHat } from "lucide-react";
import type { Recipe } from "@shared/schema";
import AddRecipeModal from "@/components/AddRecipeModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Recipes() {
  const { currentFamily } = useFamily();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
    enabled: !!currentFamily
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (recipeData: any) => {
      const response = await apiRequest('POST', '/api/recipes', recipeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: "Recipe Added",
        description: "Your recipe has been successfully added to the collection.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add recipe",
        variant: "destructive",
      });
    },
  });

  const scrapeUrlMutation = useMutation({
    mutationFn: async ({ url, familyId }: { url: string; familyId: number }) => {
      const response = await apiRequest('POST', '/api/recipes/scrape-url', { url, familyId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Recipe Scraped",
          description: "Recipe data extracted successfully! Review and save.",
        });
        return data.data;
      } else {
        throw new Error(data.message);
      }
    },
    onError: (error) => {
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Failed to extract recipe from URL",
        variant: "destructive",
      });
    },
  });

  const scrapeVideoMutation = useMutation({
    mutationFn: async ({ url, familyId }: { url: string; familyId: number }) => {
      const response = await apiRequest('POST', '/api/recipes/scrape-video', { url, familyId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Video Analyzed",
          description: "Recipe extracted from video successfully!",
        });
        return data.data;
      } else {
        throw new Error(data.message);
      }
    },
    onError: (error) => {
      toast({
        title: "Video Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to extract recipe from video",
        variant: "destructive",
      });
    },
  });

  const filters = ["All", "Vegetarian", "Quick (<30 min)", "High Protein", "Dairy-Free"];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeFilter === "All") return true;
    if (activeFilter === "Quick (<30 min)") return (recipe.prepTime || 0) + (recipe.cookTime || 0) < 30;
    
    return recipe.tags?.includes(activeFilter.toLowerCase()) || false;
  });

  // Quick action buttons for different recipe input methods
  const quickActions = [
    {
      id: "manual",
      label: "Manual Entry",
      icon: FileText,
      description: "Traditional form input",
      color: "bg-blue-50 hover:bg-blue-100 text-blue-600"
    },
    {
      id: "url",
      label: "Import from URL",
      icon: Link2,
      description: "Extract from recipe websites",
      color: "bg-green-50 hover:bg-green-100 text-green-600"
    },
    {
      id: "photo",
      label: "Photo OCR",
      icon: Camera,
      description: "Scan recipe from photos",
      color: "bg-purple-50 hover:bg-purple-100 text-purple-600"
    },
    {
      id: "video",
      label: "Video Analysis",
      icon: Video,
      description: "Extract from cooking videos",
      color: "bg-red-50 hover:bg-red-100 text-red-600"
    },
    {
      id: "voice",
      label: "Voice Dictation",
      icon: Mic,
      description: "Speak your recipe",
      color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
    },
    {
      id: "ai",
      label: "AI Generate",
      icon: Sparkles,
      description: "Create from ingredients",
      color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
    }
  ];

  if (!currentFamily) {
    return <div>Please select a family first.</div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Family Recipes</h2>
            <p className="text-gray-600 mt-1">{recipes.length} recipes in your collection • Multiple import methods available</p>
          </div>
          <AddRecipeModal 
            onCreateRecipe={createRecipeMutation.mutate} 
            onScrapeUrl={scrapeUrlMutation.mutate} 
            onScrapeVideo={scrapeVideoMutation.mutate}
          >
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </AddRecipeModal>
        </div>

        {/* Quick Actions Section */}
        <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <ChefHat className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Recipes Multiple Ways</h3>
              <p className="text-gray-600">Choose from 9 different input methods to quickly build your recipe collection</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <AddRecipeModal 
                    key={action.id} 
                    defaultTab={action.id}
                    onCreateRecipe={createRecipeMutation.mutate} 
                    onScrapeUrl={scrapeUrlMutation.mutate} 
                    onScrapeVideo={scrapeVideoMutation.mutate}
                  >
                    <Button 
                      variant="ghost" 
                      className={`h-auto p-4 flex flex-col items-center gap-3 rounded-lg transition-all ${action.color} border border-transparent hover:border-current`}
                    >
                      <IconComponent className="w-8 h-8" />
                      <div className="text-center">
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs opacity-75 mt-1">{action.description}</div>
                      </div>
                    </Button>
                  </AddRecipeModal>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/50 rounded-lg p-3">
                <div className="font-medium text-green-700 mb-1">Automated Extraction</div>
                <div className="text-gray-600">URL scraping, video analysis, and photo OCR</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="font-medium text-blue-700 mb-1">Voice & Documents</div>
                <div className="text-gray-600">Speech-to-text and file upload support</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="font-medium text-purple-700 mb-1">AI-Powered</div>
                <div className="text-gray-600">Generate recipes from ingredients or preferences</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus:ring-0 p-0 text-sm"
                />
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={activeFilter === filter ? "bg-primary hover:bg-primary/90 text-white" : ""}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="flex justify-between mb-2">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-5 bg-gray-200 rounded w-12"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-600 mb-4">
                {recipes.length === 0 
                  ? "Start building your recipe collection by adding your first recipe."
                  : "Try adjusting your search or filters to find recipes."
                }
              </p>
              <AddRecipeModal 
                onCreateRecipe={createRecipeMutation.mutate} 
                onScrapeUrl={scrapeUrlMutation.mutate} 
                onScrapeVideo={scrapeVideoMutation.mutate}
              >
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipe
                </Button>
              </AddRecipeModal>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="group hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                <div className="aspect-square bg-gray-200 relative">
                  {recipe.imageUrl ? (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Button size="sm" variant="outline" className="w-8 h-8 p-0 bg-white/90 hover:bg-white">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="bg-white/90 text-gray-700">
                      <Clock className="w-3 h-3 mr-1" />
                      {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {recipe.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {recipe.difficulty} • {recipe.servings} servings
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < Math.floor(recipe.rating || 0) ? 'fill-current' : ''}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({recipe.ratingCount || 0})</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">More options</span>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </Button>
                  </div>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recipe.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
