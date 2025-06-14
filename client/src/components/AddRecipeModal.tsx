import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  X, 
  Upload, 
  Camera, 
  Link, 
  FileText, 
  Video, 
  Mic,
  Scan,
  Download,
  Sparkles
} from "lucide-react";

interface AddRecipeModalProps {
  children: React.ReactNode;
}

export default function AddRecipeModal({ children }: AddRecipeModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const addIngredient = () => {
    setIngredients([...ingredients, ""]);
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
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
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
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

  const handleSubmit = () => {
    // TODO: Implement recipe creation
    console.log("Creating recipe:", {
      name,
      description,
      ingredients: ingredients.filter(i => i.trim()),
      instructions: instructions.filter(i => i.trim()),
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      servings: parseInt(servings) || 1,
      difficulty,
      tags,
      imageUrl,
    });
    setOpen(false);
  };

  const inputMethods = [
    {
      id: "manual",
      label: "Manual Entry",
      icon: FileText,
      description: "Enter recipe details manually"
    },
    {
      id: "url",
      label: "From URL",
      icon: Link,
      description: "Import from recipe websites"
    },
    {
      id: "photo",
      label: "Photo OCR",
      icon: Camera,
      description: "Extract text from recipe photos"
    },
    {
      id: "document",
      label: "Document",
      icon: Upload,
      description: "Upload PDF, Word, or text files"
    },
    {
      id: "video",
      label: "Video Analysis",
      icon: Video,
      description: "Extract from YouTube/TikTok videos"
    },
    {
      id: "voice",
      label: "Voice Dictation",
      icon: Mic,
      description: "Speak your recipe aloud"
    },
    {
      id: "barcode",
      label: "Barcode Scan",
      icon: Scan,
      description: "Scan packaged food barcodes"
    },
    {
      id: "import",
      label: "Import File",
      icon: Download,
      description: "Import from other recipe apps"
    },
    {
      id: "ai",
      label: "AI Generate",
      icon: Sparkles,
      description: "Generate from ingredients or preferences"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {inputMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <TabsTrigger
                    key={method.id}
                    value={method.id}
                    className="flex flex-col items-center p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    <IconComponent className="w-4 h-4 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </TabsTrigger>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="manual" className="mt-0">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Recipe Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter recipe name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
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
                  />
                </div>

                {/* Time and Difficulty */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="prepTime">Prep Time (min)</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cookTime">Cook Time (min)</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="30"
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
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

                {/* Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Ingredients *</Label>
                    <Button type="button" onClick={addIngredient} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Ingredient
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={ingredient}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          placeholder={`Ingredient ${index + 1}`}
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
                    <Label>Instructions *</Label>
                    <Button type="button" onClick={addInstruction} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mt-2 flex-shrink-0">
                          {index + 1}
                        </div>
                        <Textarea
                          value={instruction}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          placeholder={`Step ${index + 1} instructions`}
                          rows={2}
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

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
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
            </TabsContent>

            {/* URL Import Tab */}
            <TabsContent value="url" className="mt-0">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipeUrl">Recipe URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="recipeUrl"
                      placeholder="https://example.com/recipe"
                      className="flex-1"
                    />
                    <Button>Import</Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports popular recipe sites like AllRecipes, Food Network, Tasty, and more
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Photo OCR Tab */}
            <TabsContent value="photo" className="mt-0">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Upload Recipe Photo</p>
                  <p className="text-gray-500 mb-4">Take a photo or upload an image of your recipe</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            </TabsContent>

            {/* Document Upload Tab */}
            <TabsContent value="document" className="mt-0">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Upload Document</p>
                  <p className="text-gray-500 mb-4">Support for PDF, Word, and text files</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            </TabsContent>

            {/* Video Analysis Tab */}
            <TabsContent value="video" className="mt-0">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="videoUrl"
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1"
                    />
                    <Button>Analyze</Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports YouTube, TikTok, Instagram, and other video platforms
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Voice Dictation Tab */}
            <TabsContent value="voice" className="mt-0">
              <div className="space-y-4 text-center">
                <div className="py-8">
                  <Mic className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Voice Dictation</p>
                  <p className="text-gray-500 mb-4">Speak your recipe aloud and we'll transcribe it</p>
                  <Button size="lg">Start Recording</Button>
                </div>
              </div>
            </TabsContent>

            {/* Barcode Scan Tab */}
            <TabsContent value="barcode" className="mt-0">
              <div className="space-y-4 text-center">
                <div className="py-8">
                  <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Barcode Scanner</p>
                  <p className="text-gray-500 mb-4">Scan barcodes from packaged foods</p>
                  <Button size="lg">Open Scanner</Button>
                </div>
              </div>
            </TabsContent>

            {/* Import File Tab */}
            <TabsContent value="import" className="mt-0">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">Import Recipe File</p>
                  <p className="text-gray-500 mb-4">Import from JSON, CSV, or other recipe apps</p>
                  <Button>Choose File</Button>
                </div>
              </div>
            </TabsContent>

            {/* AI Generate Tab */}
            <TabsContent value="ai" className="mt-0">
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
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}