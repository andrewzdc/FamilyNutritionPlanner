import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { 
  mockRecipes, 
  mockMeals, 
  mockMealTypes, 
  mockNutritionLogs, 
  mockShoppingLists, 
  mockShoppingListItems, 
  mockRestaurantOrders,
  mockFamilyMembers 
} from "./mockData";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Mock query function for development
const getMockData = (queryKey: any[]) => {
  const url = queryKey[0] as string;
  
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('/recipes')) {
        resolve(mockRecipes);
      } else if (url.includes('/meals')) {
        resolve(mockMeals);
      } else if (url.includes('/meal-types')) {
        resolve(mockMealTypes);
      } else if (url.includes('/nutrition-logs')) {
        resolve(mockNutritionLogs);
      } else if (url.includes('/shopping-lists') && url.includes('/items')) {
        // Shopping list items
        const listId = parseInt(url.match(/shopping-lists\/(\d+)/)?.[1] || '1');
        resolve(mockShoppingListItems.filter(item => item.shoppingListId === listId));
      } else if (url.includes('/shopping-lists')) {
        resolve(mockShoppingLists);
      } else if (url.includes('/restaurant-orders')) {
        resolve(mockRestaurantOrders);
      } else if (url.includes('/members')) {
        resolve(mockFamilyMembers);
      } else {
        resolve([]);
      }
    }, 300); // 300ms delay to simulate network
  });
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use mock data for development
    return getMockData(queryKey) as Promise<T>;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
