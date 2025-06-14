import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, ShoppingBag, Pizza, Utensils, Beef, Leaf } from "lucide-react";
import { format } from "date-fns";
import type { RestaurantOrder } from "@shared/schema";

export default function Orders() {
  const { currentFamily } = useFamily();

  const { data: orders = [], isLoading } = useQuery<RestaurantOrder[]>({
    queryKey: ['/api/families', currentFamily?.id, 'restaurant-orders'],
    enabled: !!currentFamily?.id,
  });

  // Calculate monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyOrders = orders.filter(order => {
    const orderDate = new Date(order.orderDate);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const monthlySpent = monthlyOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const averageOrderValue = monthlyOrders.length > 0 ? monthlySpent / monthlyOrders.length : 0;

  // Find favorite cuisine
  const cuisineCounts = monthlyOrders.reduce((counts, order) => {
    const cuisine = order.cuisine || 'Unknown';
    counts[cuisine] = (counts[cuisine] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const favoriteCuisine = Object.entries(cuisineCounts).reduce((favorite, [cuisine, count]) => 
    count > favorite.count ? { cuisine, count } : favorite, { cuisine: 'None', count: 0 });

  const getCuisineIcon = (cuisine?: string) => {
    if (!cuisine) return Utensils;
    const lowerCuisine = cuisine.toLowerCase();
    if (lowerCuisine.includes('italian')) return Pizza;
    if (lowerCuisine.includes('burger') || lowerCuisine.includes('american')) return Beef;
    if (lowerCuisine.includes('healthy') || lowerCuisine.includes('salad')) return Leaf;
    return Utensils;
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
            <h2 className="text-3xl font-bold text-gray-900">Restaurant Orders</h2>
            <p className="text-gray-600 mt-1">Track your family's restaurant meals and spending</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Order
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">${monthlySpent.toFixed(0)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-green-600 mt-2">
                <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-1"></span>
                Average ${averageOrderValue.toFixed(0)} per order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Orders This Month</p>
                  <p className="text-3xl font-bold text-gray-900">{monthlyOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {monthlyOrders.length > 0 ? `${(30 / monthlyOrders.length).toFixed(1)} days between orders` : 'No orders yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Favorite Cuisine</p>
                  <p className="text-3xl font-bold text-gray-900">{favoriteCuisine.cuisine}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  {getCuisineIcon(favoriteCuisine.cuisine) === Pizza ? (
                    <Pizza className="w-6 h-6 text-orange-600" />
                  ) : getCuisineIcon(favoriteCuisine.cuisine) === Beef ? (
                    <Beef className="w-6 h-6 text-orange-600" />
                  ) : getCuisineIcon(favoriteCuisine.cuisine) === Leaf ? (
                    <Leaf className="w-6 h-6 text-orange-600" />
                  ) : (
                    <Utensils className="w-6 h-6 text-orange-600" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {favoriteCuisine.count} orders this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-4">Start tracking your family's restaurant orders.</p>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Order
                </Button>
              </div>
            ) : (
              orders.slice(0, 10).map((order) => {
                const IconComponent = getCuisineIcon(order.cuisine);
                const orderItems = Array.isArray(order.items) ? order.items : [];
                
                return (
                  <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{order.restaurantName}</h4>
                          <p className="text-sm text-gray-500">
                            {format(new Date(order.orderDate), 'MMM d, h:mm a')}
                          </p>
                          {order.orderNumber && (
                            <p className="text-xs text-gray-400 mt-1">
                              Order #{order.orderNumber} • {order.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${Number(order.totalAmount || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.cuisine || 'Restaurant'}
                        </p>
                      </div>
                    </div>
                    {orderItems.length > 0 && (
                      <div className="mt-4 pl-16">
                        <div className="text-sm text-gray-600 space-y-1">
                          {orderItems.slice(0, 3).map((item: any, index: number) => (
                            <p key={index}>• {item.name || item}</p>
                          ))}
                          {orderItems.length > 3 && (
                            <p className="text-gray-400">... and {orderItems.length - 3} more items</p>
                          )}
                        </div>
                      </div>
                    )}
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
