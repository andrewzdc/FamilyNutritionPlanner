import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  X, 
  Upload, 
  Camera,
  Mic,
  Link,
  Video,
  Scan,
  Download,
  Sparkles
} from "lucide-react";
import { useFamily } from "@/contexts/FamilyContext";

interface AddRecipeModalProps {
  children: React.ReactNode;
  defaultTab?: string;
  onCreateRecipe?: (recipeData: any) => void;
  onScrapeUrl?: (data: { url: string; familyId: number }) => void;
  onScrapeVideo?: (data: { url: string; familyId: number }) => void;
}

export default function AddRecipeModal({ children, defaultTab = "manual", onCreateRecipe, onScrapeUrl, onScrapeVideo }: AddRecipeModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { currentFamily } = useFamily();

  // Manual form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  // URL/Video states
  const [recipeUrl, setRecipeUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const inputMethods = [
    { id: "manual", label: "Manual", icon: Plus },
    { id: "url", label: "URL Import", icon: Link },
    { id: "video", label: "Video", icon: Video },
    { id: "photo", label: "Photo OCR", icon: Camera },
    { id: "document", label: "Document", icon: Upload },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "barcode", label: "Barcode", icon: Scan },
    { id: "import", label: "Import File", icon: Download },
    { id: "ai", label: "AI Generate", icon: Sparkles },
  ];

  const resetForm = () => {
    setName("");
    setDescription("");
    setServings("");
    setPrepTime("");
    setCookTime("");
    setDifficulty("");
    setImageUrl("");
    setIngredients([""]);
    setInstructions([""]);
    setTags([]);
    setCurrentTag("");
    setRecipeUrl("");
    setVideoUrl("");
  };

  const addIngredient = () => {
    setIngredients([...ingredients, ""]);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const populateFromScrapedData = (data: any) => {
    if (data.name) setName(data.name);
    if (data.description) setDescription(data.description);
    if (data.ingredients) setIngredients(data.ingredients.length > 0 ? data.ingredients : [""]);
    if (data.instructions) setInstructions(data.instructions.length > 0 ? data.instructions : [""]);
    if (data.prepTime) setPrepTime(data.prepTime.toString());
    if (data.cookTime) setCookTime(data.cookTime.toString());
    if (data.servings) setServings(data.servings.toString());
    if (data.difficulty) setDifficulty(data.difficulty);
    if (data.tags) setTags(data.tags);
    if (data.imageUrl) setImageUrl(data.imageUrl);
  };

  const handleUrlScrape = async () => {
    if (!recipeUrl.trim() || !onScrapeUrl) return;

    setUrlLoading(true);
    try {
      const result = await onScrapeUrl({ url: recipeUrl, familyId: 1 });
      if (result && result.data) {
        populateFromScrapedData(result.data);
      }
    } catch (error) {
      console.error('Error scraping URL:', error);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleVideoScrape = async () => {
    if (!videoUrl.trim() || !onScrapeVideo) return;

    setVideoLoading(true);
    try {
      const result = await onScrapeVideo({ url: videoUrl, familyId: 1 });
      if (result && result.data) {
        populateFromScrapedData(result.data);
      }
    } catch (error) {
      console.error('Error scraping video:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!onCreateRecipe) return;

    const recipeData = {
      name,
      description,
      ingredients: ingredients.filter(i => i.trim()),
      instructions: instructions.filter(i => i.trim()),
      servings: servings ? parseInt(servings) : undefined,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      difficulty,
      imageUrl: imageUrl || undefined,
      tags,
      familyId: currentFamily?.id,
    };

    onCreateRecipe(recipeData);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Add New Recipe</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Custom Tab Navigation */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {inputMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setActiveTab(method.id)}
                    className={`flex flex-col items-center p-3 h-auto rounded-md transition-colors ${
                      activeTab === method.id
                        ? "bg-primary text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* Manual Entry Tab */}
            {activeTab === "manual" && (
              <div className="space-y-6 pb-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Recipe Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter recipe name"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="servings">Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      placeholder="4"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the recipe"
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="prepTime">Prep Time (minutes)</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="30"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cookTime">Cook Time (minutes)</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="45"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/recipe-image.jpg"
                    className="mt-2"
                  />
                </div>

                {/* Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Ingredients</Label>
                    <Button type="button" onClick={addIngredient} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={ingredient}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          placeholder={`Ingredient ${index + 1}`}
                          className="flex-1"
                        />
                        {ingredients.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Instructions</Label>
                    <Button type="button" onClick={addInstruction} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-500 mt-3 min-w-[1.5rem]">
                          {index + 1}.
                        </span>
                        <Textarea
                          value={instruction}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          placeholder={`Step ${index + 1}`}
                          rows={2}
                          className="flex-1"
                        />
                        {instructions.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeInstruction(index)}
                            size="sm"
                            variant="ghost"
                            className="mt-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="tags"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                </div>
            )}

            {/* URL Import Tab */}
            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipeUrl">Recipe URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="recipeUrl"
                      value={recipeUrl}
                      onChange={(e) => setRecipeUrl(e.target.value)}
                      placeholder="https://example.com/recipe"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleUrlScrape}
                      disabled={!recipeUrl.trim() || urlLoading}
                    >
                      {urlLoading ? "Importing..." : "Import"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports popular recipe sites like AllRecipes, Food Network, Tasty, and more
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How URL Import Works</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Automatically extracts recipe name, ingredients, and instructions</li>
                    <li>• Captures cooking times, serving sizes, and difficulty levels</li>
                    <li>• Imports recipe images and nutritional information when available</li>
                    <li>• Works with structured recipe data (JSON-LD and microdata)</li>
                  </ul>
                </div>

                {/* Show imported recipe data if available */}
                {name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">✓ Recipe Imported Successfully</h4>
                    <p className="text-sm text-green-700 mb-3">
                      <strong>{name}</strong> - Review the details below and save to your collection.
                    </p>
                    <div className="text-sm text-green-600">
                      <div>Ingredients: {ingredients.filter(i => i.trim()).length}</div>
                      <div>Instructions: {instructions.filter(i => i.trim()).length} steps</div>
                      {servings && <div>Servings: {servings}</div>}
                      {prepTime && cookTime && <div>Total Time: {parseInt(prepTime) + parseInt(cookTime)} minutes</div>}
                    </div>
                  </div>
                )}

                {/* Submit Button for URL tab */}
                {name && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={!name.trim() || ingredients.filter(i => i.trim()).length === 0 || instructions.filter(i => i.trim()).length === 0}
                    >
                      Save Recipe
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Photo OCR Tab */}
            {activeTab === "photo" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Upload Recipe Photo</p>
                  <p className="text-gray-500 mb-4">Take a photo or upload an image of your recipe</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            )}

            {/* Document Upload Tab */}
            {activeTab === "document" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Upload Document</p>
                  <p className="text-gray-500 mb-4">Support for PDF, Word, and text files</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            )}

            {/* Video Analysis Tab */}
            {activeTab === "video" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="videoUrl"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleVideoScrape}
                      disabled={!videoUrl.trim() || videoLoading}
                    >
                      {videoLoading ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports YouTube, TikTok, Instagram, and other video platforms
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">AI Video Analysis</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Extracts ingredients and instructions from cooking videos</li>
                    <li>• Identifies cooking steps and techniques from visual content</li>
                    <li>• Estimates cooking times based on video segments</li>
                    <li>• Requires API keys for video processing services</li>
                  </ul>
                </div>

                {/* Show imported recipe data if available */}
                {name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">✓ Recipe Extracted Successfully</h4>
                    <p className="text-sm text-green-700 mb-3">
                      <strong>{name}</strong> - Review the details below and save to your collection.
                    </p>
                    <div className="text-sm text-green-600">
                      <div>Ingredients: {ingredients.filter(i => i.trim()).length}</div>
                      <div>Instructions: {instructions.filter(i => i.trim()).length} steps</div>
                      {servings && <div>Servings: {servings}</div>}
                      {prepTime && cookTime && <div>Total Time: {parseInt(prepTime) + parseInt(cookTime)} minutes</div>}
                    </div>
                  </div>
                )}

                {/* Submit Button for Video tab */}
                {name && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={!name.trim() || ingredients.filter(i => i.trim()).length === 0 || instructions.filter(i => i.trim()).length === 0}
                    >
                      Save Recipe
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Voice Dictation Tab */}
            {activeTab === "voice" && (
              <div className="space-y-4 text-center">
                <div className="py-8">
                  <Mic className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Voice Dictation</p>
                  <p className="text-gray-500 mb-4">Speak your recipe aloud and we'll transcribe it</p>
                  <Button size="lg">Start Recording</Button>
                </div>
              </div>
            )}

            {/* Barcode Scan Tab */}
            {activeTab === "barcode" && (
              <div className="space-y-4 text-center">
                <div className="py-8">
                  <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Barcode Scanner</p>
                  <p className="text-gray-500 mb-4">Scan barcodes from packaged foods</p>
                  <Button size="lg">Open Scanner</Button>
                </div>
              </div>
            )}

            {/* Import File Tab */}
            {activeTab === "import" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Import Recipe File</p>
                  <p className="text-gray-500 mb-4">Import from JSON, CSV, or other recipe apps</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            )}

            {/* AI Generate Tab */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ingredients">Available Ingredients</Label>
                  <Textarea
                    id="ingredients"
                    placeholder="chicken breast, rice, broccoli, garlic..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="preferences">Dietary Preferences</Label>
                  <Input
                    id="preferences"
                    placeholder="vegetarian, low-carb, spicy..."
                    className="mt-2"
                  />
                </div>
                <Button className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Recipe with AI
                </Button>
              </div>
            )}
          </div>

          {/* Fixed Submit Button Area for Manual Tab */}
          {activeTab === "manual" && (
            <div className="border-t bg-white p-6">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!name.trim() || ingredients.filter(i => i.trim()).length === 0 || instructions.filter(i => i.trim()).length === 0}
                >
                  Create Recipe
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}