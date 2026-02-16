
export interface FoodImpact {
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  gi: number;
  estimatedSpike: number; // in mg/dL
  riskLevel: 'Low' | 'Medium' | 'High';
  summary: string;
  glucoseCurve: { time: number; value: number }[];
  scanType?: 'food' | 'recipe';
}

export interface MealRecommendation {
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  name: string;
  description: string;
  whyGood: string;
  nutrients: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
  };
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  image: string;
  data: FoodImpact;
}

export interface UserProfile {
  hbA1c: number;
  fastingBloodSugar: number;
  targetPostMeal: number;
  conditions: string[];
}

export interface User {
  email: string;
  password?: string;
  profile: UserProfile;
  history: ScanRecord[];
}

export interface AuthState {
  isLoggedIn: boolean;
  currentUser: User | null;
}
