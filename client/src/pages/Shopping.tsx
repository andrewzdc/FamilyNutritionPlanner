import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Download, Share, X, ShoppingCart, Carrot } from "lucide-react";
import type { ShoppingList, ShoppingListItem } from "@shared/schema";

export default function Shopping() {
  const { currentFamily } = useFamily();
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: ['/api/families', currentFamily?.id, 'shopping-lists'],
    enabled: !!currentFamily?.id,
  });

  const activeList = shoppingLists.find(list => list.id === activeListId) || shoppingLists[0];

  const { data: shoppingItems = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['/api/shopping-lists', activeList?.id, 'items'],
    enabled: !!activeList?.id,
  });

  // Group items by category
  const itemsByCategory = shoppingItems.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {} as Record<string, ShoppingListItem[]>);

  const completedCount = shoppingItems.filter(item => item.isCompleted).length;

  if (!currentFamily) {
    return <div>Please select a family first.</div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Shopping Lists</h2>
            <p className="text-gray-600 mt-1">Organize your grocery shopping by store and category</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New List
            </Button>
          </div>
        </div>

        {/* Shopping List */}
        <Card>
          {/* List Tabs */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-6">
                {shoppingLists.map((list) => (
                  <Button
                    key={list.id}
                    variant="ghost"
                    className={`pb-2 ${list.id === activeList?.id ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
                    onClick={() => setActiveListId(list.id)}
                  >
                    {list.name}
                  </Button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {completedCount} of {shoppingItems.length} items
                </span>
                <Button variant="ghost" size="sm">
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {!activeList ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No shopping lists</h3>
                <p className="text-gray-600 mb-4">Create your first shopping list to get started.</p>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </div>
            ) : (
              <>
                {/* Quick Add */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3">
                    <Input
                      placeholder="Add item..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newItemName.trim()) {
                          // TODO: Add item mutation
                          setNewItemName("");
                        }
                      }}
                    />
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={!newItemName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Shopping Categories */}
                {Object.keys(itemsByCategory).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">List is empty</h3>
                    <p className="text-gray-600">Add items to your shopping list using the field above.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <Carrot className="w-5 h-5 text-primary mr-2" />
                          {category} ({items.length} items)
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <Checkbox
                                checked={item.isCompleted}
                                onCheckedChange={() => {
                                  // TODO: Update item mutation
                                }}
                              />
                              <span className={`flex-1 text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                {item.name} {item.quantity && `(${item.quantity})`}
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
