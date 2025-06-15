import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { challenges } from "@shared/schema";
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

  // Seed sample recipes for demo purposes
  app.post('/api/families/:familyId/seed-recipes', isAuthenticated, async (req: any, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const userId = req.user.claims.sub;

      // Check if user is member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sampleRecipes = [
        {
          name: "Grilled Chicken Breast",
          description: "Juicy grilled chicken with herbs",
          ingredients: ["chicken breast", "olive oil", "rosemary", "salt", "pepper"],
          instructions: ["Season chicken", "Preheat grill", "Grill 6-8 minutes per side"],
          prepTime: 10,
          cookTime: 15,
          servings: 4,
          tags: ["dinner", "protein", "healthy"],
          familyId,
          createdBy: userId
        },
        {
          name: "Pasta Primavera",
          description: "Fresh vegetables with pasta",
          ingredients: ["pasta", "bell peppers", "zucchini", "tomatoes", "garlic", "olive oil"],
          instructions: ["Cook pasta", "Sauté vegetables", "Combine and serve"],
          prepTime: 15,
          cookTime: 20,
          servings: 4,
          tags: ["dinner", "vegetarian", "pasta"],
          familyId,
          createdBy: userId
        },
        {
          name: "Caesar Salad",
          description: "Classic Caesar salad with croutons",
          ingredients: ["romaine lettuce", "parmesan", "croutons", "caesar dressing"],
          instructions: ["Chop lettuce", "Add toppings", "Toss with dressing"],
          prepTime: 10,
          cookTime: 0,
          servings: 4,
          tags: ["side", "salad", "healthy"],
          familyId,
          createdBy: userId
        },
        {
          name: "Fish Tacos",
          description: "Spicy fish tacos with slaw",
          ingredients: ["white fish", "tortillas", "cabbage", "lime", "hot sauce"],
          instructions: ["Season and cook fish", "Make slaw", "Assemble tacos"],
          prepTime: 20,
          cookTime: 10,
          servings: 4,
          tags: ["dinner", "mexican", "fish"],
          familyId,
          createdBy: userId
        },
        {
          name: "Roasted Vegetables",
          description: "Mixed roasted vegetables",
          ingredients: ["carrots", "broccoli", "bell peppers", "olive oil", "herbs"],
          instructions: ["Chop vegetables", "Toss with oil", "Roast at 400°F for 25 minutes"],
          prepTime: 15,
          cookTime: 25,
          servings: 6,
          tags: ["side", "vegetable", "healthy"],
          familyId,
          createdBy: userId
        }
      ];

      const createdRecipes = [];
      for (const recipeData of sampleRecipes) {
        const recipe = await storage.createRecipe(recipeData);
        createdRecipes.push(recipe);
      }

      res.json({ message: "Sample recipes created", recipes: createdRecipes });
    } catch (error) {
      console.error("Error creating sample recipes:", error);
      res.status(500).json({ message: "Failed to create sample recipes" });
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

  app.patch('/api/meals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealId = parseInt(req.params.id);

      // First get the meal to check family membership
      const meal = await storage.getMealById(mealId);
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }

      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, meal.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedMeal = await storage.updateMeal(mealId, req.body);
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating meal:", error);
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  app.delete('/api/meals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealId = parseInt(req.params.id);

      // First get the meal to check family membership
      const meal = await storage.getMealById(mealId);
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }

      // Check if user is member of the family
      const membership = await storage.getUserFamilyMembership(userId, meal.familyId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deleteMeal(mealId);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ message: "Failed to delete meal" });
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

  // Gamification routes
  
  // Get all achievements
  app.get('/api/achievements', async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ message: 'Failed to fetch achievements' });
    }
  });

  // Get user achievements
  app.get('/api/achievements/user/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const userAchievements = await storage.getUserAchievements(userId);
      res.json(userAchievements);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      res.status(500).json({ message: 'Failed to fetch user achievements' });
    }
  });

  // Get user stats
  app.get('/api/user-stats/:userId/:familyId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const familyId = parseInt(req.params.familyId);
      const stats = await storage.getUserStats(userId, familyId);
      res.json(stats || {});
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Failed to fetch user stats' });
    }
  });

  // Get cooking streaks
  app.get('/api/cooking-streaks/:userId/:familyId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const familyId = parseInt(req.params.familyId);
      const streaks = await storage.getCookingStreaks(userId, familyId);
      res.json(streaks);
    } catch (error) {
      console.error('Error fetching cooking streaks:', error);
      res.status(500).json({ message: 'Failed to fetch cooking streaks' });
    }
  });

  // Get active challenges
  app.get('/api/challenges/active', isAuthenticated, async (req, res) => {
    try {
      console.log('Debug - Fetching active challenges...');
      
      // First, let's check all challenges in the database
      const allChallenges = await db.select().from(challenges);
      console.log('Debug - All challenges in database:', allChallenges.length, allChallenges);
      
      // Then get active challenges
      const activeChallenges = await storage.getActiveChallenges();
      console.log('Debug - Active challenges found:', activeChallenges.length, activeChallenges);
      
      res.json(activeChallenges);
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      res.status(500).json({ message: 'Failed to fetch active challenges' });
    }
  });

  // Join challenge
  app.post('/api/challenges/join', async (req, res) => {
    try {
      const { challengeId, userId, familyId } = req.body;
      const participant = await storage.joinChallenge({
        challengeId,
        userId,
        familyId,
        progress: {},
        rank: null,
        completedAt: null
      });
      res.json(participant);
    } catch (error) {
      console.error('Error joining challenge:', error);
      res.status(500).json({ message: 'Failed to join challenge' });
    }
  });

  // Reseed challenges (for debugging)
  app.post('/api/challenges/reseed', isAuthenticated, async (req, res) => {
    try {
      // Delete existing challenges first
      await db.delete(challenges);
      
      // Reseed challenges
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const sampleChallenges = [
        {
          name: "7-Day Cooking Challenge",
          description: "Cook a homemade meal every day for 7 consecutive days",
          category: "weekly",
          startDate: now,
          endDate: nextWeek,
          requirements: { dailyCooking: 7, consecutiveDays: true },
          rewards: { points: 200, badge: "Week Chef" },
          difficulty: "bronze",
          maxParticipants: 100,
          isActive: true
        },
        {
          name: "Try 5 New Recipes",
          description: "Expand your culinary horizons by trying 5 recipes you've never made before",
          category: "monthly",
          startDate: now,
          endDate: nextMonth,
          requirements: { newRecipes: 5 },
          rewards: { points: 150, badge: "Recipe Explorer" },
          difficulty: "silver",
          maxParticipants: 50,
          isActive: true
        },
        {
          name: "Healthy Eating Week",
          description: "Plan and cook healthy meals for an entire week",
          category: "weekly",
          startDate: now,
          endDate: nextWeek,
          requirements: { healthyMeals: 14, tags: ["healthy", "vegetarian"] },
          rewards: { points: 300, badge: "Health Champion" },
          difficulty: "gold",
          maxParticipants: 75,
          isActive: true
        },
        {
          name: "Family Meal Planning",
          description: "Plan all family meals for 2 weeks in advance",
          category: "monthly",
          startDate: now,
          endDate: nextMonth,
          requirements: { plannedMeals: 42, familyMeals: true },
          rewards: { points: 250, badge: "Planning Pro" },
          difficulty: "silver",
          maxParticipants: 30,
          isActive: true
        }
      ];

      for (const challenge of sampleChallenges) {
        await db.insert(challenges).values(challenge);
      }

      const activeChallenges = await storage.getActiveChallenges();
      res.json({ message: 'Challenges reseeded successfully', count: activeChallenges.length, challenges: activeChallenges });
    } catch (error) {
      console.error('Error reseeding challenges:', error);
      res.status(500).json({ message: 'Failed to reseed challenges' });
    }
  });

  // Award achievement
  app.post('/api/achievements/award', async (req, res) => {
    try {
      const { userId, familyId, action } = req.body;
      const newAchievements = await storage.checkAndAwardAchievements(userId, familyId, action);
      res.json(newAchievements);
    } catch (error) {
      console.error('Error awarding achievements:', error);
      res.status(500).json({ message: 'Failed to award achievements' });
    }
  });

  // Increment user stat
  app.post('/api/user-stats/increment', async (req, res) => {
    try {
      const { userId, familyId, stat, amount } = req.body;
      await storage.incrementUserStat(userId, familyId, stat, amount);
      
      // Check for new achievements after stat update
      const newAchievements = await storage.checkAndAwardAchievements(userId, familyId, stat);
      
      res.json({ success: true, newAchievements });
    } catch (error) {
      console.error('Error incrementing user stat:', error);
      res.status(500).json({ message: 'Failed to increment user stat' });
    }
  });

  // Update cooking streak
  app.post('/api/cooking-streaks/update', async (req, res) => {
    try {
      const { userId, familyId, streakType } = req.body;
      const streak = await storage.updateCookingStreak(userId, familyId, streakType);
      
      // Check for streak-based achievements
      const newAchievements = await storage.checkAndAwardAchievements(userId, familyId, 'streak');
      
      res.json({ streak, newAchievements });
    } catch (error) {
      console.error('Error updating cooking streak:', error);
      res.status(500).json({ message: 'Failed to update cooking streak' });
    }
  });

  // Profile and Settings routes
  
  // Get user profile
  app.get('/api/profile/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  app.patch('/api/profile/update', async (req, res) => {
    try {
      const { userId, ...profileData } = req.body;
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  });

  // Get user preferences
  app.get('/api/preferences/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({ message: 'Failed to fetch user preferences' });
    }
  });

  // Update user preferences
  app.patch('/api/preferences/update', async (req, res) => {
    try {
      const { userId, ...preferencesData } = req.body;
      const updatedPreferences = await storage.updateUserPreferences(userId, preferencesData);
      res.json(updatedPreferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ message: 'Failed to update user preferences' });
    }
  });

  // Get family preferences
  app.get('/api/families/:familyId/preferences', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const preferences = await storage.getFamilyPreferences(familyId);
      res.json(preferences || {});
    } catch (error) {
      console.error('Error fetching family preferences:', error);
      res.status(500).json({ message: 'Failed to fetch family preferences' });
    }
  });

  // Update family preferences
  app.patch('/api/families/:familyId/preferences', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const updatedPreferences = await storage.updateFamilyPreferences(familyId, req.body);
      res.json(updatedPreferences);
    } catch (error) {
      console.error('Error updating family preferences:', error);
      res.status(500).json({ message: 'Failed to update family preferences' });
    }
  });

  // Invite family member
  app.post('/api/families/:familyId/invite', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const { email, role, displayName } = req.body;
      
      // In a real app, this would send an email invitation
      // For now, we'll just create a pending invitation record
      const invitation = await storage.createFamilyInvitation({
        familyId,
        email,
        role,
        displayName,
        invitedBy: req.user?.claims?.sub || 'system',
        status: 'pending'
      });
      
      res.json(invitation);
    } catch (error) {
      console.error('Error sending family invitation:', error);
      res.status(500).json({ message: 'Failed to send family invitation' });
    }
  });

  // Update family member role
  app.patch('/api/families/:familyId/members/:memberId', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;
      
      const updatedMember = await storage.updateFamilyMemberRole(memberId, role);
      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating family member role:', error);
      res.status(500).json({ message: 'Failed to update family member role' });
    }
  });

  // Remove family member
  app.delete('/api/families/:familyId/members/:memberId', async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const success = await storage.removeFamilyMember(memberId);
      
      if (success) {
        res.json({ message: 'Family member removed successfully' });
      } else {
        res.status(404).json({ message: 'Family member not found' });
      }
    } catch (error) {
      console.error('Error removing family member:', error);
      res.status(500).json({ message: 'Failed to remove family member' });
    }
  });

  // Family addresses routes
  app.get('/api/families/:familyId/addresses', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const addresses = await storage.getFamilyAddresses(familyId);
      res.json(addresses);
    } catch (error) {
      console.error('Error fetching family addresses:', error);
      res.status(500).json({ message: 'Failed to fetch family addresses' });
    }
  });

  app.post('/api/families/:familyId/addresses', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const address = await storage.createFamilyAddress({ ...req.body, familyId });
      res.json(address);
    } catch (error) {
      console.error('Error creating family address:', error);
      res.status(500).json({ message: 'Failed to create family address' });
    }
  });

  app.patch('/api/families/:familyId/addresses/:addressId', async (req, res) => {
    try {
      const addressId = parseInt(req.params.addressId);
      const address = await storage.updateFamilyAddress(addressId, req.body);
      res.json(address);
    } catch (error) {
      console.error('Error updating family address:', error);
      res.status(500).json({ message: 'Failed to update family address' });
    }
  });

  app.delete('/api/families/:familyId/addresses/:addressId', async (req, res) => {
    try {
      const addressId = parseInt(req.params.addressId);
      const success = await storage.deleteFamilyAddress(addressId);
      if (success) {
        res.json({ message: 'Address deleted successfully' });
      } else {
        res.status(404).json({ message: 'Address not found' });
      }
    } catch (error) {
      console.error('Error deleting family address:', error);
      res.status(500).json({ message: 'Failed to delete family address' });
    }
  });

  // Family meal times routes
  app.get('/api/families/:familyId/meal-times', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const mealTimes = await storage.getFamilyMealTimes(familyId);
      res.json(mealTimes);
    } catch (error) {
      console.error('Error fetching family meal times:', error);
      res.status(500).json({ message: 'Failed to fetch family meal times' });
    }
  });

  app.post('/api/families/:familyId/meal-times', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const mealTime = await storage.createFamilyMealTime({ ...req.body, familyId });
      res.json(mealTime);
    } catch (error) {
      console.error('Error creating family meal time:', error);
      res.status(500).json({ message: 'Failed to create family meal time' });
    }
  });

  app.patch('/api/families/:familyId/meal-times/:mealTimeId', async (req, res) => {
    try {
      const mealTimeId = parseInt(req.params.mealTimeId);
      const mealTime = await storage.updateFamilyMealTime(mealTimeId, req.body);
      res.json(mealTime);
    } catch (error) {
      console.error('Error updating family meal time:', error);
      res.status(500).json({ message: 'Failed to update family meal time' });
    }
  });

  app.delete('/api/families/:familyId/meal-times/:mealTimeId', async (req, res) => {
    try {
      const mealTimeId = parseInt(req.params.mealTimeId);
      const success = await storage.deleteFamilyMealTime(mealTimeId);
      if (success) {
        res.json({ message: 'Meal time deleted successfully' });
      } else {
        res.status(404).json({ message: 'Meal time not found' });
      }
    } catch (error) {
      console.error('Error deleting family meal time:', error);
      res.status(500).json({ message: 'Failed to delete family meal time' });
    }
  });

  // Shopping sites routes
  app.get('/api/families/:familyId/shopping-sites', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const sites = await storage.getShoppingSitePreferences(familyId);
      res.json(sites);
    } catch (error) {
      console.error('Error fetching shopping sites:', error);
      res.status(500).json({ message: 'Failed to fetch shopping sites' });
    }
  });

  app.post('/api/families/:familyId/shopping-sites', async (req, res) => {
    try {
      const familyId = parseInt(req.params.familyId);
      const site = await storage.createShoppingSitePreference({ ...req.body, familyId });
      res.json(site);
    } catch (error) {
      console.error('Error creating shopping site:', error);
      res.status(500).json({ message: 'Failed to create shopping site' });
    }
  });

  app.patch('/api/families/:familyId/shopping-sites/:siteId', async (req, res) => {
    try {
      const siteId = parseInt(req.params.siteId);
      const site = await storage.updateShoppingSitePreference(siteId, req.body);
      res.json(site);
    } catch (error) {
      console.error('Error updating shopping site:', error);
      res.status(500).json({ message: 'Failed to update shopping site' });
    }
  });

  app.delete('/api/families/:familyId/shopping-sites/:siteId', async (req, res) => {
    try {
      const siteId = parseInt(req.params.siteId);
      const success = await storage.deleteShoppingSitePreference(siteId);
      if (success) {
        res.json({ message: 'Shopping site deleted successfully' });
      } else {
        res.status(404).json({ message: 'Shopping site not found' });
      }
    } catch (error) {
      console.error('Error deleting shopping site:', error);
      res.status(500).json({ message: 'Failed to delete shopping site' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}