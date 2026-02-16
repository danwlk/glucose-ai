
import React, { useState } from 'react';
import { MealRecommendation, UserProfile } from '../types';
import { translations, Language } from '../translations';

interface RecommendationViewProps {
  recommendations: MealRecommendation[];
  isLoading: boolean;
  onRefresh: (currentGlucose: number) => void;
  lang: Language;
  defaultGlucose: number;
}

const RecommendationView: React.FC<RecommendationViewProps> = ({ 
  recommendations, 
  isLoading, 
  onRefresh, 
  lang,
  defaultGlucose
}) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';
  
  const [currentGlucose, setCurrentGlucose] = useState<number>(defaultGlucose);

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'Breakfast': return '🌅';
      case 'Lunch': return '☀️';
      case 'Dinner': return '🌙';
      case 'Snack': return '🍏';
      default: return '🍴';
    }
  };

  const getMealLabel = (type: string) => {
    switch (type) {
      case 'Breakfast': return t.mealBreakfast;
      case 'Lunch': return t.mealLunch;
      case 'Dinner': return t.mealDinner;
      case 'Snack': return t.mealSnack;
      default: return type;
    }
  };

  const handleGenerate = () => {
    onRefresh(currentGlucose);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className={`flex justify-between items-center px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{t.recommendationsTitle}</h2>
      </div>

      {/* 실시간 혈당 입력 카드 */}
      <div className="mx-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-90">{t.currentGlucoseLabel}</h3>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl flex items-baseline gap-1">
              <span className="text-2xl font-black">{currentGlucose}</span>
              <span className="text-[10px] font-bold opacity-80">{t.unitMgDl}</span>
            </div>
          </div>
          
          <input 
            type="range" 
            min="40" 
            max="400" 
            step="1" 
            value={currentGlucose} 
            onChange={(e) => setCurrentGlucose(parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none accent-white mb-6 cursor-pointer"
          />
          
          <p className="text-[11px] font-bold mb-4 opacity-80 leading-snug">
            {t.enterCurrentGlucose}
          </p>

          <button 
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {t.refreshPlan}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black text-sm uppercase tracking-widest animate-pulse">{t.generatingPlan}</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid gap-6 px-2 pb-20">
          {recommendations.map((meal, index) => (
            <div 
              key={index} 
              className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100 overflow-hidden relative group animate-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              
              <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-3xl">{getMealIcon(meal.type)}</span>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                  {getMealLabel(meal.type)}
                </span>
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-2">{meal.name}</h3>
              <p className="text-sm text-gray-600 font-semibold mb-4 leading-relaxed">{meal.description}</p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">{t.whyThisWorks}</h4>
                <p className="text-xs text-gray-700 font-bold leading-relaxed italic">"{meal.whyGood}"</p>
              </div>

              <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                <NutrientBadge label={t.carbs} value={meal.nutrients.carbs} unit="g" />
                <NutrientBadge label={t.prot} value={meal.nutrients.protein} unit="g" />
                <NutrientBadge label={t.fat} value={meal.nutrients.fat} unit="g" />
                <NutrientBadge label={t.calories} value={meal.nutrients.calories} unit="kcal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4">🥗</div>
          <p className="text-gray-400 font-bold text-sm mb-6">{t.enterCurrentGlucose}</p>
        </div>
      )}
    </div>
  );
};

const NutrientBadge = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-baseline gap-1 shadow-sm">
    <span className="text-[8px] font-black text-gray-400 uppercase">{label}</span>
    <span className="text-sm font-black text-gray-800">{value}</span>
    <span className="text-[8px] font-bold text-gray-400">{unit}</span>
  </div>
);

export default RecommendationView;
