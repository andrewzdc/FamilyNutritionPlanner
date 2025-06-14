import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertFamilySchema,
  insertFamilyMembershipSchema,
  insertRecipeSchema,
  insertMealSchema,
  insertNutritionLogSchema,
  insertShoppingListSchema,
  insertShoppingListItemSchema,
  insertRestaurantOrderSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Family routes
  app.post('/api/families', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyData = insertFamilySchema.parse({ ...req.body, createdBy: userId });
      
      const family = await storage.createFamily(familyData);
      
      // Add creator as admin member
      await storage.addFamilyMember({
        familyId: family.id,
        userId,
        role: 'admin',
        displayName: req.user.claims.first_name || 'Admin',
      });
      
      res.json(family);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating family:", error);
        res.status(500).json({ message: "Failed to create family" });
      }
    }
  });

  app.get('/api/families', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const families = await storage.getFamiliesByUserId(userId);
      res.json(families);
    } catch (error) {
      console.error("Error fetching families:", error);
      res.status(500).json({ message: "Failed to fetch families" });
    }
  });

  app.get('/api/families/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getFamilyMembers(familyId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  // Recipe routes
  app.post('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeData = insertRecipeSchema.parse({ ...req.body, createdBy: userId });
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, recipeData.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const recipe = await storage.createRecipe(recipeData);
      res.json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating recipe:", error);
        res.status(500).json({ message: "Failed to create recipe" });
      }
    }
  });

  app.get('/api/families/:familyId/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const userId = req.user.claims.sub;
      
      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const recipes = await storage.getRecipesByFamilyId(familyId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const recipe = await storage.getRecipeById(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, recipe.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertRecipeSchema.partial().parse(req.body);
      const updatedRecipe = await storage.updateRecipe(recipeId, updateData);
      
      res.json(updatedRecipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error updating recipe:", error);
        res.status(500).json({ message: "Failed to update recipe" });
      }
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const recipe = await storage.getRecipeById(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, recipe.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteRecipe(recipeId);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Meal type routes
  app.get('/api/meal-types', isAuthenticated, async (req: any, res) => {
    try {
      const mealTypes = await storage.getMealTypes();
      res.json(mealTypes);
    } catch (error) {
      console.error("Error fetching meal types:", error);
      res.status(500).json({ message: "Failed to fetch meal types" });
    }
  });

  // Meal routes
  app.post('/api/meals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealData = insertMealSchema.parse({ ...req.body, createdBy: userId });
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, mealData.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const meal = await storage.createMeal(mealData);
      res.json(meal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating meal:", error);
        res.status(500).json({ message: "Failed to create meal" });
      }
    }
  });

  app.get('/api/families/:familyId/meals', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let meals;
      if (startDate && endDate) {
        meals = await storage.getMealsByDateRange(familyId, startDate as string, endDate as string);
      } else {
        meals = await storage.getMealsByFamilyId(familyId);
      }
      
      res.json(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  // Nutrition log routes
  app.post('/api/nutrition-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logData = insertNutritionLogSchema.parse({ ...req.body, userId });
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, logData.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const log = await storage.createNutritionLog(logData);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating nutrition log:", error);
        res.status(500).json({ message: "Failed to create nutrition log" });
      }
    }
  });

  app.get('/api/nutrition-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.query;
      
      const logs = await storage.getNutritionLogsByUserId(userId, date as string);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching nutrition logs:", error);
      res.status(500).json({ message: "Failed to fetch nutrition logs" });
    }
  });

  // Shopping list routes
  app.post('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listData = insertShoppingListSchema.parse({ ...req.body, createdBy: userId });
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, listData.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const list = await storage.createShoppingList(listData);
      res.json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating shopping list:", error);
        res.status(500).json({ message: "Failed to create shopping list" });
      }
    }
  });

  app.get('/api/families/:familyId/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const userId = req.user.claims.sub;
      
      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const lists = await storage.getShoppingListsByFamilyId(familyId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.post('/api/shopping-lists/:listId/items', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const userId = req.user.claims.sub;
      
      // Check if shopping list exists and user has access
      const list = await storage.getShoppingListById(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      const membership = await storage.getUserFamilyMembership(userId, list.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const itemData = insertShoppingListItemSchema.parse({ ...req.body, shoppingListId: listId });
      const item = await storage.addShoppingListItem(itemData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error adding shopping list item:", error);
        res.status(500).json({ message: "Failed to add shopping list item" });
      }
    }
  });

  app.get('/api/shopping-lists/:listId/items', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const userId = req.user.claims.sub;
      
      // Check if shopping list exists and user has access
      const list = await storage.getShoppingListById(listId);
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      const membership = await storage.getUserFamilyMembership(userId, list.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const items = await storage.getShoppingListItems(listId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list items:", error);
      res.status(500).json({ message: "Failed to fetch shopping list items" });
    }
  });

  // Restaurant order routes
  app.post('/api/restaurant-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderData = insertRestaurantOrderSchema.parse({ ...req.body, createdBy: userId });
      
      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, orderData.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const order = await storage.createRestaurantOrder(orderData);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating restaurant order:", error);
        res.status(500).json({ message: "Failed to create restaurant order" });
      }
    }
  });

  app.get('/api/families/:familyId/restaurant-orders', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const userId = req.user.claims.sub;
      
      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const orders = await storage.getRestaurantOrdersByFamilyId(familyId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching restaurant orders:", error);
      res.status(500).json({ message: "Failed to fetch restaurant orders" });
    }
  });

  // Recipe scraping routes
  app.post('/api/recipes/scrape-url', async (req, res) => {
    try {
      const { url, familyId } = req.body;
      
      if (!url || !familyId) {
        return res.status(400).json({ message: "URL and familyId are required" });
      }

      // Import the scraping service
      const { RecipeScrapingService } = await import('./recipeScrapingService');
      const scrapedData = await RecipeScrapingService.scrapeRecipe(url);
      
      // Return scraped data for preview (don't save yet)
      res.json({
        success: true,
        data: scrapedData
      });
    } catch (error) {
      console.error("Error scraping recipe:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to scrape recipe"
      });
    }
  });

  app.post('/api/recipes/scrape-video', async (req, res) => {
    try {
      const { url, familyId } = req.body;
      
      if (!url || !familyId) {
        return res.status(400).json({ message: "URL and familyId are required" });
      }

      const { RecipeScrapingService } = await import('./recipeScrapingService');
      const scrapedData = await RecipeScrapingService.scrapeFromVideo(url);
      
      res.json({
        success: true,
        data: scrapedData
      });
    } catch (error) {
      console.error("Error scraping video recipe:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to scrape video recipe"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
