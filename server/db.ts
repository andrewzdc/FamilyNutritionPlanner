import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Seed sample achievements
    const sampleAchievements = [
      {
        name: "First Recipe",
        description: "Cook your first recipe successfully",
        category: "cooking",
        points: 10,
        difficulty: "bronze",
        requirement: { recipesCooked: 1 },
        badgeIcon: "🍳",
        isActive: true
      },
      {
        name: "Recipe Explorer",
        description: "Try 5 different recipes",
        category: "cooking", 
        points: 50,
        difficulty: "silver",
        requirement: { recipesCooked: 5 },
        badgeIcon: "🌟",
        isActive: true
      },
      {
        name: "Master Chef",
        description: "Cook 25 recipes successfully",
        category: "cooking",
        points: 150,
        difficulty: "gold", 
        requirement: { recipesCooked: 25 },
        badgeIcon: "👨‍🍳",
        isActive: true
      },
      {
        name: "Meal Planner",
        description: "Plan 10 meals in advance",
        category: "planning",
        points: 30,
        difficulty: "bronze",
        requirement: { mealsPlanned: 10 },
        badgeIcon: "📅",
        isActive: true
      },
      {
        name: "Weekly Warrior",
        description: "Plan meals for an entire week",
        category: "planning",
        points: 75,
        difficulty: "silver",
        requirement: { mealsPlanned: 21 },
        badgeIcon: "⚡",
        isActive: true
      },
      {
        name: "Cooking Streak",
        description: "Cook for 7 days in a row",
        category: "streak",
        points: 100,
        difficulty: "gold",
        requirement: { streakType: "daily_cooking", streakLength: 7 },
        badgeIcon: "🔥",
        isActive: true
      }
    ];

    for (const achievement of sampleAchievements) {
      // Added check for db and achievements before attempting to insert
      if (db && schema && schema.achievements) {
           await db.insert(schema.achievements).values(achievement).onConflictDoNothing();
      } else {
          console.error("db or achievements schema is not properly initialized.");
      }
    }

    // Seed sample challenges
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
           if (db && schema && schema.challenges) {
              await db.insert(schema.challenges).values(challenge).onConflictDoNothing();
           } else {
              console.error("db or challenges schema is not properly initialized.");
           }
    }