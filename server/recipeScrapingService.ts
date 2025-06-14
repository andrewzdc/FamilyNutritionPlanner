import { Recipe } from "@shared/schema";

interface ScrapedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  imageUrl?: string;
  difficulty?: string;
  tags?: string[];
}

export class RecipeScrapingService {
  private static extractJsonLd(html: string): any {
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis;
    let match;
    
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (jsonData['@type'] === 'Recipe' || 
            (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Recipe'))) {
          return Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Recipe') : jsonData;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  private static extractMicrodata(html: string): Partial<ScrapedRecipe> {
    const recipe: Partial<ScrapedRecipe> = {};
    
    // Extract recipe name
    const nameMatch = html.match(/<[^>]*itemprop="name"[^>]*>([^<]*)</i) ||
                     html.match(/<h1[^>]*class="[^"]*recipe[^"]*"[^>]*>([^<]*)</i) ||
                     html.match(/<title[^>]*>([^<]*)</i);
    if (nameMatch) {
      recipe.name = nameMatch[1].trim().replace(/\s*recipe\s*/i, '');
    }

    // Extract ingredients
    const ingredientRegex = /<[^>]*itemprop="recipeIngredient"[^>]*>([^<]*)</gi;
    const ingredients: string[] = [];
    let ingredientMatch;
    while ((ingredientMatch = ingredientRegex.exec(html)) !== null) {
      ingredients.push(ingredientMatch[1].trim());
    }
    if (ingredients.length > 0) {
      recipe.ingredients = ingredients;
    }

    // Extract instructions
    const instructionRegex = /<[^>]*itemprop="recipeInstructions?"[^>]*>([^<]*)</gi;
    const instructions: string[] = [];
    let instructionMatch;
    while ((instructionMatch = instructionRegex.exec(html)) !== null) {
      instructions.push(instructionMatch[1].trim());
    }
    if (instructions.length > 0) {
      recipe.instructions = instructions;
    }

    // Extract prep time
    const prepTimeMatch = html.match(/<[^>]*itemprop="prepTime"[^>]*content="PT(\d+)M"/i);
    if (prepTimeMatch) {
      recipe.prepTime = parseInt(prepTimeMatch[1]);
    }

    // Extract cook time
    const cookTimeMatch = html.match(/<[^>]*itemprop="cookTime"[^>]*content="PT(\d+)M"/i);
    if (cookTimeMatch) {
      recipe.cookTime = parseInt(cookTimeMatch[1]);
    }

    // Extract servings
    const servingsMatch = html.match(/<[^>]*itemprop="recipeYield"[^>]*>(\d+)/i);
    if (servingsMatch) {
      recipe.servings = parseInt(servingsMatch[1]);
    }

    // Extract image
    const imageMatch = html.match(/<[^>]*itemprop="image"[^>]*(?:src|content)="([^"]*)"/) ||
                      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) ||
                      html.match(/<img[^>]*class="[^"]*recipe[^"]*"[^>]*src="([^"]*)">/i);
    if (imageMatch) {
      recipe.imageUrl = imageMatch[1];
    }

    return recipe;
  }

  private static parseJsonLdRecipe(jsonLd: any): Partial<ScrapedRecipe> {
    const recipe: Partial<ScrapedRecipe> = {};

    if (jsonLd.name) recipe.name = jsonLd.name;
    if (jsonLd.description) recipe.description = jsonLd.description;

    // Parse ingredients
    if (jsonLd.recipeIngredient && Array.isArray(jsonLd.recipeIngredient)) {
      recipe.ingredients = jsonLd.recipeIngredient.map((ing: any) => 
        typeof ing === 'string' ? ing : ing.text || ing.name || String(ing)
      );
    }

    // Parse instructions
    if (jsonLd.recipeInstructions && Array.isArray(jsonLd.recipeInstructions)) {
      recipe.instructions = jsonLd.recipeInstructions.map((inst: any) => {
        if (typeof inst === 'string') return inst;
        return inst.text || inst.name || String(inst);
      });
    }

    // Parse times (ISO 8601 duration format PT15M)
    if (jsonLd.prepTime) {
      const prepMatch = jsonLd.prepTime.match(/PT(\d+)M/);
      if (prepMatch) recipe.prepTime = parseInt(prepMatch[1]);
    }

    if (jsonLd.cookTime) {
      const cookMatch = jsonLd.cookTime.match(/PT(\d+)M/);
      if (cookMatch) recipe.cookTime = parseInt(cookMatch[1]);
    }

    // Parse servings
    if (jsonLd.recipeYield) {
      const yield_ = Array.isArray(jsonLd.recipeYield) ? jsonLd.recipeYield[0] : jsonLd.recipeYield;
      const servings = parseInt(String(yield_));
      if (!isNaN(servings)) recipe.servings = servings;
    }

    // Parse image
    if (jsonLd.image) {
      const image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
      recipe.imageUrl = typeof image === 'string' ? image : image.url;
    }

    // Extract tags from keywords
    if (jsonLd.keywords) {
      if (typeof jsonLd.keywords === 'string') {
        recipe.tags = jsonLd.keywords.split(',').map((tag: string) => tag.trim().toLowerCase());
      } else if (Array.isArray(jsonLd.keywords)) {
        recipe.tags = jsonLd.keywords.map((tag: any) => String(tag).trim().toLowerCase());
      }
    }

    return recipe;
  }

  public static async scrapeRecipe(url: string): Promise<ScrapedRecipe> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipe: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Try JSON-LD first (most reliable)
      const jsonLd = this.extractJsonLd(html);
      if (jsonLd) {
        const recipe = this.parseJsonLdRecipe(jsonLd);
        if (recipe.name && recipe.ingredients && recipe.instructions) {
          return recipe as ScrapedRecipe;
        }
      }

      // Fallback to microdata extraction
      const microdataRecipe = this.extractMicrodata(html);
      if (microdataRecipe.name && microdataRecipe.ingredients && microdataRecipe.instructions) {
        return microdataRecipe as ScrapedRecipe;
      }

      // If no structured data found, try basic HTML parsing
      const title = html.match(/<title[^>]*>([^<]*)</i)?.[1]?.trim() || 'Imported Recipe';
      
      throw new Error('Could not extract recipe data from this URL. The website may not have structured recipe data.');
    } catch (error) {
      throw new Error(`Failed to scrape recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public static async scrapeFromVideo(url: string): Promise<ScrapedRecipe> {
    // For video analysis, we would need to integrate with video processing APIs
    // This is a placeholder that would require external services like YouTube Data API
    // or video transcription services
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // YouTube video processing would go here
      throw new Error('Video recipe extraction requires additional API keys for YouTube Data API and transcription services');
    }
    
    if (url.includes('tiktok.com')) {
      // TikTok video processing would go here
      throw new Error('TikTok recipe extraction requires TikTok API access and video processing capabilities');
    }

    throw new Error('Video platform not supported yet');
  }
}