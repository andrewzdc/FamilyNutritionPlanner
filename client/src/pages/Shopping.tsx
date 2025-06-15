import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart, Calendar, Package, CheckCircle, Circle, Star, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useFamily } from "@/contexts/FamilyContext";
import { apiRequest } from "@/lib/queryClient";
import type { ShoppingList, ShoppingListItem, Meal, PantryItem } from "@shared/schema";

interface EnhancedShoppingListItem extends ShoppingListItem {
  meal?: Meal;
  estimatedTotal?: number;
}

export default function Shopping() {
  const { currentFamily } = useFamily();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "pending" | "completed" | "aisle">("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "aisle" | "priority">("aisle");
  const [showMealIntegration, setShowMealIntegration] = useState(false);

  // Fetch shopping lists
  const { data: shoppingLists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['/api/shopping-lists', currentFamily?.id],
    enabled: !!currentFamily?.id,
  });

  // Fetch items for selected list
  const { data: listItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/shopping-list-items', selectedList?.id],
    enabled: !!selectedList?.id,
  });

  // Fetch pantry items
  const { data: pantryItems = [], isLoading: pantryLoading } = useQuery({
    queryKey: ['/api/pantry', currentFamily?.id],
    enabled: !!currentFamily?.id,
  });

  // Fetch upcoming meals for integration
  const { data: upcomingMeals = [] } = useQuery({
    queryKey: ['/api/meals/upcoming', currentFamily?.id],
    enabled: !!currentFamily?.id && showMealIntegration,
  });

  // Create shopping list mutation
  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest('/api/shopping-lists', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          familyId: currentFamily?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({ title: "Shopping list created successfully" });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ShoppingListItem> }) => {
      return await apiRequest(`/api/shopping-list-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list-items'] });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: Partial<ShoppingListItem>) => {
      return await apiRequest('/api/shopping-list-items', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          shoppingListId: selectedList?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list-items'] });
      toast({ title: "Item added successfully" });
    },
  });

  // Generate from meals mutation
  const generateFromMealsMutation = useMutation({
    mutationFn: async (mealIds: number[]) => {
      return await apiRequest('/api/shopping-lists/generate', {
        method: 'POST',
        body: JSON.stringify({
          familyId: currentFamily?.id,
          mealIds,
        }),
      });
    },
    onSuccess: (data) => {
      // Add generated items to current list or create new list
      data.consolidatedIngredients.forEach((ingredient: any) => {
        addItemMutation.mutate({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
          sourceType: ingredient.sourceType,
          sourceId: ingredient.sourceId,
          priority: ingredient.priority,
        });
      });
      toast({ title: "Shopping list generated from meals" });
    },
  });

  // Filter and sort items
  const filteredItems = listItems
    .filter((item: ShoppingListItem) => {
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterBy === "pending" && item.isCompleted) return false;
      if (filterBy === "completed" && !item.isCompleted) return false;
      return true;
    })
    .sort((a: ShoppingListItem, b: ShoppingListItem) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        case "aisle":
          return (a.aisle || "").localeCompare(b.aisle || "");
        case "priority":
          return (a.priority || 3) - (b.priority || 3);
        default:
          return 0;
      }
    });

  // Group items by aisle for organized shopping
  const itemsByAisle = filteredItems.reduce((acc: Record<string, ShoppingListItem[]>, item) => {
    const aisle = item.aisle || "Other";
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(item);
    return acc;
  }, {});

  // Calculate estimated total
  const estimatedTotal = filteredItems.reduce((total, item) => {
    const price = parseFloat(item.estimatedPrice || "0");
    return total + price;
  }, 0);

  const handleToggleItem = (item: ShoppingListItem) => {
    updateItemMutation.mutate({
      id: item.id,
      updates: { isCompleted: !item.isCompleted }
    });
  };

  const handleAddItem = (data: { name: string; quantity?: string; category?: string; priority?: number }) => {
    if (!selectedList) return;
    
    addItemMutation.mutate({
      name: data.name,
      quantity: data.quantity || "1",
      category: data.category || "Other",
      priority: data.priority || 3,
      sourceType: "manual",
    });
  };

  if (listsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Lists</h1>
          <p className="text-gray-600 mt-2">Organize your grocery shopping with smart meal integration</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                From Meals
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate from Meals</DialogTitle>
                <DialogDescription>
                  Select upcoming meals to automatically generate a shopping list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {upcomingMeals.map((meal: any) => (
                  <div key={meal.id} className="flex items-center space-x-2">
                    <Checkbox id={`meal-${meal.id}`} />
                    <Label htmlFor={`meal-${meal.id}`} className="flex-1">
                      {meal.recipe?.name} - {new Date(meal.scheduledDate).toLocaleDateString()}
                    </Label>
                  </div>
                ))}
                <Button 
                  onClick={() => generateFromMealsMutation.mutate(upcomingMeals.map((m: any) => m.id))}
                  className="w-full"
                >
                  Generate Shopping List
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Shopping List</DialogTitle>
                <DialogDescription>
                  Create a new shopping list for your family
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createListMutation.mutate({
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">List Name</Label>
                    <Input id="name" name="name" placeholder="Weekly Groceries" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input id="description" name="description" placeholder="Shopping for this week" />
                  </div>
                  <Button type="submit" className="w-full">
                    Create List
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="lists" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lists">Shopping Lists</TabsTrigger>
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-6">
          {!selectedList ? (
            // Shopping Lists Overview
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shoppingLists.map((list: ShoppingList) => (
                <Card
                  key={list.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedList(list)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {list.name}
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </CardTitle>
                    <CardDescription>{list.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Items</span>
                        <span className="font-medium">12 items</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Estimated</span>
                        <span className="font-medium">$67.80</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">8/12 completed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Selected List Details
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Button variant="ghost" onClick={() => setSelectedList(null)}>
                    ← Back to Lists
                  </Button>
                  <h2 className="text-2xl font-bold mt-2">{selectedList.name}</h2>
                  <p className="text-gray-600">{selectedList.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${estimatedTotal.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Estimated Total</div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aisle">By Aisle</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="category">By Category</SelectItem>
                    <SelectItem value="priority">By Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Item Form */}
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddItem({
                      name: formData.get('name') as string,
                      quantity: formData.get('quantity') as string,
                      category: formData.get('category') as string,
                      priority: parseInt(formData.get('priority') as string) || 3,
                    });
                    e.currentTarget.reset();
                  }}>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="item-name">Item Name</Label>
                        <Input id="item-name" name="name" placeholder="Milk" required />
                      </div>
                      <div className="w-24">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" name="quantity" placeholder="1" />
                      </div>
                      <div className="w-32">
                        <Label htmlFor="category">Category</Label>
                        <Select name="category">
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dairy">Dairy</SelectItem>
                            <SelectItem value="Produce">Produce</SelectItem>
                            <SelectItem value="Meat">Meat</SelectItem>
                            <SelectItem value="Pantry">Pantry</SelectItem>
                            <SelectItem value="Frozen">Frozen</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Items organized by aisle */}
              <div className="space-y-4">
                {Object.entries(itemsByAisle).map(([aisle, items]) => (
                  <Card key={aisle}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {aisle}
                        <Badge variant="secondary">{items.length} items</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleToggleItem(item)}
                                className="flex-shrink-0"
                              >
                                {item.isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              <div>
                                <div className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : ''}`}>
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {item.quantity} {item.unit}
                                  {item.category && ` • ${item.category}`}
                                  {item.sourceType === 'recipe' && (
                                    <Badge variant="outline" className="ml-2">From Recipe</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {item.estimatedPrice && (
                                <div className="font-medium">${item.estimatedPrice}</div>
                              )}
                              {item.priority && item.priority <= 2 && (
                                <Star className="h-4 w-4 text-yellow-500 inline" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pantry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pantry Inventory</CardTitle>
              <CardDescription>
                Track what you have at home to avoid buying duplicates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Pantry management coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shopping History</CardTitle>
              <CardDescription>
                View past shopping lists and spending patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Shopping history coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}