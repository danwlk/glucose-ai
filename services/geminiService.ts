
import { GoogleGenAI, Type } from "@google/genai";
import { FoodImpact, UserProfile, MealRecommendation } from "../types";

// Initialize Gemini API client following strict guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageName = (code: string) => {
  const map: Record<string, string> = {
    ko: 'Korean',
    en: 'English',
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ar: 'Arabic'
  };
  return map[code] || 'English';
};

export const analyzeContent = async (
  base64Image?: string, 
  textContent?: string,
  lang: string = 'en', 
  type: 'food' | 'recipe' = 'food',
  userProfile?: UserProfile
): Promise<FoodImpact> => {
  const model = 'gemini-3-flash-preview';
  const languageName = getLanguageName(lang);
  
  const profileContext = userProfile 
    ? `User Health Context: 
       - HbA1c: ${userProfile.hbA1c}%
       - Fasting Blood Sugar: ${userProfile.fastingBloodSugar} mg/dL
       - Post-meal Target: <${userProfile.targetPostMeal} mg/dL
       - Conditions: ${userProfile.conditions.join(', ') || 'None reported'}`
    : "User Profile: Normal";

  const basePrompt = type === 'recipe' 
    ? `Analyze this cooking recipe or list of ingredients. ${profileContext}. 
       Extract the ingredients and cooking methods to estimate its blood sugar impact per serving SPECIFICALLY for this user's profile. 
       Identify the recipe name, standard portion size, total carbs (g), glycemic index (GI), and the predicted peak blood glucose rise in mg/dL for THIS user. 
       Generate a simulated glucose curve (value vs time in minutes) for the next 120 minutes. 
       CRITICAL: You MUST provide all text fields, especially 'name', 'portion', and 'summary', strictly in ${languageName}.`
    : `Analyze this food image and estimate its blood sugar impact. ${profileContext}.
       Identify the food, estimated portion size, total carbs (g), glycemic index (GI), and the predicted peak blood glucose rise in mg/dL specifically tailored for this user's health metrics. 
       Generate a simulated glucose curve (value vs time in minutes) for the next 120 minutes. 
       CRITICAL: You MUST provide all text fields, especially 'name', 'portion', and 'summary', strictly in ${languageName}.`;

  const parts: any[] = [{ text: basePrompt }];
  
  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    });
  }
  
  if (textContent) {
    parts.push({ text: `Target Recipe/Text Content:\n${textContent}` });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the food or recipe" },
          portion: { type: Type.STRING, description: "Estimated portion size per serving" },
          calories: { type: Type.NUMBER, description: "Estimated calories per serving" },
          carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams per serving" },
          gi: { type: Type.NUMBER, description: "Glycemic index" },
          estimatedSpike: { type: Type.NUMBER, description: "Max predicted blood sugar spike in mg/dL" },
          riskLevel: { type: Type.STRING, description: "Risk level: Low, Medium, or High", enum: ["Low", "Medium", "High"] },
          summary: { type: Type.STRING, description: "Short summary of the health impact or advice" },
          glucoseCurve: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.NUMBER, description: "Minutes after consumption" },
                value: { type: Type.NUMBER, description: "Simulated glucose level change in mg/dL" }
              },
              required: ["time", "value"]
            }
          }
        },
        required: ["name", "portion", "calories", "carbs", "gi", "estimatedSpike", "riskLevel", "summary", "glucoseCurve"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  const result = JSON.parse(text) as FoodImpact;
  result.scanType = type;
  return result;
};

export const getMealRecommendations = async (
  userProfile: UserProfile,
  lang: string = 'ko',
  currentGlucose?: number
): Promise<MealRecommendation[]> => {
  const model = 'gemini-3-flash-preview';
  const languageName = getLanguageName(lang);
  
  const profileContext = `
    - HbA1c: ${userProfile.hbA1c}%
    - Fasting Blood Sugar: ${userProfile.fastingBloodSugar} mg/dL
    - Post-meal Target: <${userProfile.targetPostMeal} mg/dL
    - Current Blood Sugar Level: ${currentGlucose || userProfile.fastingBloodSugar} mg/dL (CRITICAL: Take this value into account!)
    - Conditions: ${userProfile.conditions.join(', ') || 'None reported'}
  `;

  const prompt = `Based on this user's health profile and CURRENT blood sugar level: ${profileContext}, provide 4 personalized meal recommendations (Breakfast, Lunch, Dinner, Snack) to maintain or stabilize blood sugar.
    If the current blood sugar is high, suggest meals with very low glycemic index. 
    If it's low, suggest balanced complex carbohydrates.
    For each meal, explain WHY it's specifically good for the user's current status.
    Return the response as a JSON array of objects.
    CRITICAL: All text descriptions MUST be in ${languageName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            whyGood: { type: Type.STRING },
            nutrients: {
              type: Type.OBJECT,
              properties: {
                carbs: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                calories: { type: Type.NUMBER }
              },
              required: ["carbs", "protein", "fat", "calories"]
            }
          },
          required: ["type", "name", "description", "whyGood", "nutrients"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as MealRecommendation[];
};

export const translateImpactContent = async (
  current: FoodImpact,
  targetLang: string
): Promise<FoodImpact> => {
  const model = 'gemini-3-flash-preview';
  const languageName = getLanguageName(targetLang);

  const response = await ai.models.generateContent({
    model,
    contents: `Translate the following fields into ${languageName}: 
    Name: "${current.name}"
    Portion: "${current.portion}"
    Summary: "${current.summary}"
    
    Return the result in JSON format with keys "name", "portion", and "summary".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          portion: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ["name", "portion", "summary"]
      }
    }
  });

  const text = response.text;
  if (!text) return current;
  const translated = JSON.parse(text);
  
  return {
    ...current,
    name: translated.name,
    portion: translated.portion,
    summary: translated.summary
  };
};
