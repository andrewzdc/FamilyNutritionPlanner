import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import type { ShoppingList, ShoppingListItem } from "@shared/schema";

export default function ShoppingListPreview() {
  const { currentFamily } = useFamily();

  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: ['/api/families', currentFamily?.id, 'shopping-lists'],
    enabled: !!currentFamily?.id,
  });

  // Get the most recent active shopping list
  const activeList = shoppingLists.find(list => list.isActive) || shoppingLists[0];

  const { data: items = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['/api/shopping-lists', activeList?.id, 'items'],
    enabled: !!activeList?.id,
  });

  const completedCount = items.filter(item => item.isCompleted).length;
  const recentItems = items.slice(0, 4); // Show only first 4 items

  if (!currentFamily) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Shopping List</CardTitle>
          <span className="text-sm text-gray-500">
            {items.length > 0 ? `${items.length} items` : 'Empty'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!activeList || items.length === 0 ? (
          <div className="text-center py-6">
            <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              {!activeList ? "No shopping lists yet" : "Shopping list is empty"}
            </p>
            <Link href="/shopping">
              <Button variant="outline" size="sm">
                {!activeList ? "Create List" : "Add Items"}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox 
                    checked={item.isCompleted}
                    disabled
                    className="pointer-events-none"
                  />
                  <span className={`text-sm flex-1 ${
                    item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'
                  }`}>
                    {item.name}
                    {item.quantity && (
                      <span className="text-gray-400 ml-1">({item.quantity})</span>
                    )}
                  </span>
                </div>
              ))}
              
              {items.length > 4 && (
                <div className="text-xs text-gray-400 pl-6">
                  ... and {items.length - 4} more items
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {completedCount} of {items.length} completed
              </span>
              <Link href="/shopping">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 h-auto p-0">
                  View all <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
