
import React, { useState, useEffect, useRef } from 'react';
import { ScanRecord, FoodImpact, UserProfile, User, MealRecommendation } from './types';
import CameraView from './components/CameraView';
import ResultCard from './components/ResultCard';
import AuthScreen from './components/AuthScreen';
import RecommendationView from './components/RecommendationView';
import { analyzeContent, translateImpactContent, getMealRecommendations } from './services/geminiService';
import { translations, Language } from './translations';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<FoodImpact | null>(null);
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'plan'>('scan');
  const [scanMode, setScanMode] = useState<'food' | 'recipe'>('food');
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    hbA1c: 6.5, 
    fastingBloodSugar: 110,
    targetPostMeal: 160,
    conditions: [] 
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [recipeText, setRecipeText] = useState('');
  const [lang, setLang] = useState<Language>('ko');
  const prevLangRef = useRef<Language>('ko');
  const [rememberMe, setRememberMe] = useState(true); // 기본적으로 로그인 유지를 활성화

  const t = translations[lang];
  const isRTL = lang === 'ar';

  const updateProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...userProfile, ...updates };
    setUserProfile(newProfile);
    
    if (currentUser) {
      const updatedUser = { ...currentUser, profile: newProfile };
      setCurrentUser(updatedUser);
      saveUserToStorage(updatedUser);
    }
  };

  const saveUserToStorage = (user: User) => {
    if (!user || user.email === 'guest') return;
    
    // 1. 전체 사용자 DB 업데이트
    const usersStr = localStorage.getItem('glucoscanc_users') || '{}';
    let users: Record<string, any> = {};
    try { users = JSON.parse(usersStr); } catch (e) { users = {}; }
    
    const emailKey = user.email.toLowerCase();
    users[emailKey] = {
      password: user.password || users[emailKey]?.password || '',
      profile: user.profile,
      history: user.history || []
    };
    localStorage.setItem('glucoscanc_users', JSON.stringify(users));
    
    // 2. 현재 로그인 세션 정보 강제 업데이트 (로그아웃 전까지 유지)
    localStorage.setItem('glucoscanc_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    // 명시적으로 로그아웃할 때만 모든 세션 정보 삭제
    setCurrentUser(null);
    setHistory([]);
    setRecommendations([]);
    setCurrentResult(null);
    localStorage.removeItem('glucoscanc_current_user');
    // 게스트 히스토리는 유지할지 선택할 수 있으나, 여기선 세션만 클리어
  };

  const fetchRecommendations = async (currentGlucose?: number) => {
    setIsGeneratingPlan(true);
    try {
      const plans = await getMealRecommendations(userProfile, lang, currentGlucose);
      setRecommendations(plans);
      if (currentUser && currentUser.email !== 'guest') {
        localStorage.setItem(`glucoscanc_plan_${currentUser.email.toLowerCase()}`, JSON.stringify(plans));
      }
    } catch (error) {
      console.error("Plan generation failed:", error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const toggleCondition = (conditionId: string) => {
    const current = userProfile.conditions;
    const next = current.includes(conditionId)
      ? current.filter(c => c !== conditionId)
      : [...current, conditionId];
    updateProfile({ conditions: next });
  };

  const handleCapture = async (base64Image: string) => {
    setIsAnalyzing(true);
    setCurrentResult(null);
    try {
      const result = await analyzeContent(base64Image, undefined, lang, scanMode, userProfile);
      processResult(result, base64Image);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async (term?: string) => {
    const finalTerm = term || searchTerm;
    if (!finalTerm.trim()) return;
    setIsAnalyzing(true);
    setCurrentResult(null);
    try {
      const result = await analyzeContent(undefined, `Food Search: ${finalTerm}`, lang, 'food', userProfile);
      processResult(result, "search_placeholder");
      setSearchTerm('');
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!recipeText.trim()) return;
    setIsAnalyzing(true);
    setCurrentResult(null);
    setShowTextInput(false);
    try {
      const result = await analyzeContent(undefined, recipeText, lang, 'recipe', userProfile);
      processResult(result, "text_input_placeholder");
    } catch (error) {
      console.error("Text analysis failed:", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processResult = (result: FoodImpact, image: string) => {
    setCurrentResult(result);
    const newRecord: ScanRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      image: image === "text_input_placeholder" || image === "search_placeholder" 
             ? "https://img.icons8.com/ios-filled/100/3b82f6/restaurant.png" 
             : image,
      data: result
    };
    const updatedHistory = [newRecord, ...history].slice(0, 50);
    setHistory(updatedHistory);
    
    if (currentUser) {
      const updatedUser = { ...currentUser, history: updatedHistory };
      setCurrentUser(updatedUser);
      saveUserToStorage(updatedUser);
    } else {
      localStorage.setItem('glucoscanc_guest_history', JSON.stringify(updatedHistory));
    }
  };

  useEffect(() => {
    // 앱 구동 시 초기 설정 로드
    const savedLang = localStorage.getItem('glucoscanc_lang');
    if (savedLang) {
      setLang(savedLang as Language);
      prevLangRef.current = savedLang as Language;
    }

    // 세션 복구 로직 (가장 중요)
    const savedUserStr = localStorage.getItem('glucoscanc_current_user');
    if (savedUserStr) {
      try {
        const sessionUser = JSON.parse(savedUserStr);
        if (sessionUser && sessionUser.email) {
          if (sessionUser.email !== 'guest') {
            const usersStr = localStorage.getItem('glucoscanc_users') || '{}';
            const users = JSON.parse(usersStr);
            const dbUser = users[sessionUser.email.toLowerCase()];
            
            if (dbUser) {
              // DB의 최신 정보를 바탕으로 세션 동기화
              const syncedUser: User = {
                ...sessionUser,
                password: dbUser.password,
                profile: dbUser.profile || sessionUser.profile,
                history: dbUser.history || sessionUser.history || []
              };
              setCurrentUser(syncedUser);
              setUserProfile(syncedUser.profile);
              setHistory(syncedUser.history);
              
              const cachedPlan = localStorage.getItem(`glucoscanc_plan_${syncedUser.email.toLowerCase()}`);
              if (cachedPlan) setRecommendations(JSON.parse(cachedPlan));
            } else {
              // 만약 DB에 해당 유저가 없다면 세션 삭제 (비정상 케이스)
              localStorage.removeItem('glucoscanc_current_user');
            }
          } else {
            // 게스트 세션 복구
            setCurrentUser(sessionUser);
            setHistory(sessionUser.history || []);
          }
        }
      } catch (e) {
        console.error("Session restore error", e);
        localStorage.removeItem('glucoscanc_current_user');
      }
    } else {
      // 로그인된 세션이 없을 때만 게스트 로컬 히스토리 로드
      const guestHistory = localStorage.getItem('glucoscanc_guest_history');
      if (guestHistory) setHistory(JSON.parse(guestHistory));
    }
  }, []);

  // 유저 상태가 변경될 때마다 세션 저장소를 지속적으로 업데이트
  useEffect(() => {
    if (currentUser && currentUser.email !== 'guest') {
      localStorage.setItem('glucoscanc_current_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    const handleLanguageChangeTranslation = async () => {
      if (currentResult && prevLangRef.current !== lang) {
        setIsTranslating(true);
        try {
          const translated = await translateImpactContent(currentResult, lang);
          setCurrentResult(translated);
        } catch (e) { console.error(e); } finally { setIsTranslating(false); }
      }
      prevLangRef.current = lang;
      localStorage.setItem('glucoscanc_lang', lang);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    };
    handleLanguageChangeTranslation();
  }, [lang, isRTL, currentResult]);

  const getStatusEmoji = (risk: string) => {
    if (risk === 'High') return '😫';
    if (risk === 'Medium') return '😐';
    return '😊';
  };

  const conditionOptions = [
    { id: 'diabetes_t1', label: t.conditionDiabetes1 },
    { id: 'diabetes_t2', label: t.conditionDiabetes2 },
    { id: 'prediabetes', label: t.conditionPrediabetes },
    { id: 'gestational', label: t.conditionGestational },
    { id: 'hypertension', label: t.conditionHypertension },
    { id: 'obesity', label: t.conditionObesity },
    { id: 'pcos', label: t.conditionPcos },
    { id: 'fatty_liver', label: t.conditionFattyLiver },
    { id: 'hyperlipidemia', label: t.conditionHyperlipidemia },
    { id: 'cardio', label: t.conditionCardio },
    { id: 'metabolic', label: t.conditionMetabolic },
    { id: 'kidney', label: t.conditionKidney },
  ];

  const popularFoods = [
    { id: 'pizza', name: 'Pizza 🍕' },
    { id: 'sushi', name: 'Sushi 🍣' },
    { id: 'bibimbap', name: 'Bibimbap 🥘' },
    { id: 'croissant', name: 'Croissant 🥐' },
    { id: 'burger', name: 'Burger 🍔' }
  ];

  if (!currentUser) {
    return <AuthScreen lang={lang} onAuthComplete={(user, stayLoggedIn) => {
      // stayLoggedIn 값에 관계없이 회원인 경우 세션을 저장함 (사용자 요청 반영)
      setCurrentUser(user);
      setUserProfile(user.profile);
      setHistory(user.history || []);
      
      if (user.email !== 'guest') {
        localStorage.setItem('glucoscanc_current_user', JSON.stringify(user));
      }
    }} />;
  }

  return (
    <div className={`flex flex-col min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden ${isRTL ? 'font-arabic' : ''}`}>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 safe-top">
        <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">G</div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              {t.appTitle} <span className="text-blue-600">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-gray-100 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase border-none focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="ko">KR 🇰🇷</option>
              <option value="en">EN 🇺🇸</option>
              <option value="zh">ZH 🇨🇳</option>
              <option value="ja">JP 🇯🇵</option>
              <option value="es">ES 🇪🇸</option>
              <option value="fr">FR 🇫🇷</option>
              <option value="de">DE 🇩🇪</option>
              <option value="it">IT 🇮🇹</option>
              <option value="ar">AR 🇸🇦</option>
            </select>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-all ${showSettings ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{t.settingsTitle}</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-400 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6 pb-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account</span>
                  <span className="text-sm font-bold text-gray-800">{currentUser.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  {t.logoutBtn}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.hba1cSetting}</label>
                  <span className="text-lg font-black text-blue-600">{userProfile.hbA1c} %</span>
                </div>
                <input 
                  type="range" min="4" max="14" step="0.1" 
                  value={userProfile.hbA1c} 
                  onChange={(e) => updateProfile({ hbA1c: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-blue-600"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.fbsSetting}</label>
                  <span className="text-lg font-black text-blue-600">{userProfile.fastingBloodSugar} <span className="text-xs font-bold">mg/dL</span></span>
                </div>
                <input 
                  type="range" min="60" max="300" step="1" 
                  value={userProfile.fastingBloodSugar} 
                  onChange={(e) => updateProfile({ fastingBloodSugar: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-blue-600"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.ppgSetting}</label>
                  <span className="text-lg font-black text-rose-500">{userProfile.targetPostMeal} <span className="text-xs font-bold">mg/dL</span></span>
                </div>
                <input 
                  type="range" min="120" max="250" step="5" 
                  value={userProfile.targetPostMeal} 
                  onChange={(e) => updateProfile({ targetPostMeal: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-rose-500"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.conditionsLabel}</label>
                <div className="grid grid-cols-1 gap-2">
                  {conditionOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleCondition(opt.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${userProfile.conditions.includes(opt.id) ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'}`}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                      {userProfile.conditions.includes(opt.id) && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4"
              >
                {t.saveProfile}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-md mx-auto px-4 pt-4">
          
          {activeTab === 'scan' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="relative group">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className={`w-full bg-white border border-gray-200 rounded-2xl py-4 px-6 pr-12 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right pr-6 pl-12' : ''}`}
                />
                <button onClick={() => handleSearch()} className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors ${isRTL ? 'left-3' : 'right-3'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">{t.popularSearch}:</span>
                {popularFoods.map(food => (
                  <button key={food.id} onClick={() => handleSearch(food.name)} className="bg-white border border-gray-100 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95">
                    {food.name}
                  </button>
                ))}
              </div>

              {currentResult ? (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-blue-100 border border-gray-100 animate-in slide-in-from-bottom-8 relative">
                   {isTranslating && (
                     <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center">
                        <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-3 animate-pulse">
                           <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-xs font-black uppercase tracking-widest text-blue-600">{t.translatingContent}</span>
                        </div>
                     </div>
                   )}
                   <div className={`flex mb-4 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                     <button onClick={() => setCurrentResult(null)} className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full active:scale-95 transition-all">
                       {t.retry}
                     </button>
                   </div>
                   <ResultCard data={currentResult} userProfile={userProfile} lang={lang} />
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-2">
                    <div className="bg-gray-200/50 p-1 rounded-2xl flex gap-1">
                      <button onClick={() => setScanMode('food')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'food' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                        {t.modeFood}
                      </button>
                      <button onClick={() => setScanMode('recipe')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'recipe' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                        {t.modeRecipe}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border border-gray-50 relative">
                    <CameraView onCapture={handleCapture} isLoading={isAnalyzing} lang={lang} />
                    {scanMode === 'recipe' && !isAnalyzing && (
                      <button onClick={() => setShowTextInput(true)} className="absolute top-6 right-6 bg-blue-600 text-white p-3 rounded-2xl shadow-xl active:scale-90 transition-all z-30 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.pasteRecipe}</span>
                      </button>
                    )}
                    {isAnalyzing && (
                      <div className="absolute inset-0 z-40 bg-white/90 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-blue-600/20 rounded-full"></div>
                          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                          <div className="absolute inset-0 flex items-center justify-center text-2xl">{scanMode === 'food' ? '🥗' : '📖'}</div>
                        </div>
                        <h3 className="mt-8 text-2xl font-black text-gray-900">{searchTerm ? t.searching : (scanMode === 'food' ? t.readingNutrients : t.analyzingRecipe)}</h3>
                        <p className="mt-2 text-sm text-gray-500 font-bold leading-relaxed max-w-[200px]">{t.analyzingImpact}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className={`flex justify-between items-center px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{t.history}</h2>
                <div className="bg-gray-200/50 px-3 py-1 rounded-full">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{history.length} {t.scansSuffix.toUpperCase()}</span>
                </div>
              </div>
              <div className="grid gap-4 px-2 pb-20">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-6">🍽️</div>
                    <p className="text-gray-400 font-black text-lg tracking-tight">{t.noHistory}</p>
                    <button onClick={() => setActiveTab('scan')} className="px-8 py-3 bg-blue-600 text-white rounded-3xl font-black text-sm shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4">{t.scanFirst}</button>
                  </div>
                ) : (
                  history.map(record => (
                    <div key={record.id} onClick={() => { setCurrentResult(record.data); setActiveTab('scan'); }} className={`bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex gap-4 items-center active:scale-95 transition-all cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <img src={record.image} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-sm bg-gray-50" />
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="font-black text-gray-900 truncate tracking-tight">{record.data.name}</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">+{record.data.estimatedSpike} {t.unitMgDl}</p>
                      </div>
                      <span className="text-2xl">{getStatusEmoji(record.data.riskLevel)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <RecommendationView 
              recommendations={recommendations} 
              isLoading={isGeneratingPlan} 
              onRefresh={fetchRecommendations} 
              lang={lang} 
              defaultGlucose={userProfile.fastingBloodSugar}
            />
          )}
        </div>
      </main>

      {showTextInput && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTextInput(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <h3 className="text-xl font-black text-gray-900 mb-4">{t.pasteRecipe}</h3>
            <textarea className={`w-full h-48 bg-gray-50 rounded-2xl p-4 text-sm font-semibold border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`} placeholder={t.recipePlaceholder} value={recipeText} onChange={(e) => setRecipeText(e.target.value)} />
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowTextInput(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">{t.cancel}</button>
              <button onClick={handleTextAnalyze} disabled={!recipeText.trim()} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 transition-all">{t.analyzeText}</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-50 safe-bottom">
        <div className={`max-w-md mx-auto flex justify-around items-center px-4 h-20 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'scan' ? 'text-blue-600 scale-110' : 'text-gray-400 opacity-60'}`}>
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'scan' ? 'bg-blue-50' : ''}`}>
              <svg className="w-6 h-6" fill={activeTab === 'scan' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.scan}</span>
          </button>
          <button onClick={() => setActiveTab('plan')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'plan' ? 'text-emerald-600 scale-110' : 'text-gray-400 opacity-60'}`}>
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'plan' ? 'bg-emerald-50' : ''}`}>
              <svg className="w-6 h-6" fill={activeTab === 'plan' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.plan}</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'history' ? 'text-blue-600 scale-110' : 'text-gray-400 opacity-60'}`}>
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-blue-50' : ''}`}>
              <svg className="w-6 h-6" fill={activeTab === 'history' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.history}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
