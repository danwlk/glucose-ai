
import React from 'react';
import { FoodImpact, UserProfile } from '../types';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  ReferenceLine
} from 'recharts';
import { translations, Language } from '../translations';

interface ResultCardProps {
  data: FoodImpact;
  userProfile?: UserProfile;
  lang?: Language;
}

const ResultCard: React.FC<ResultCardProps> = ({ data, userProfile, lang = 'en' }) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const getRiskDetails = (risk: string) => {
    switch (risk) {
      case 'Low': 
        return { 
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-100', 
          emoji: '😊', 
          label: t.lowRisk,
          tagline: t.safeHeaven
        };
      case 'Medium': 
        return { 
          color: 'text-orange-600 bg-orange-50 border-orange-100 shadow-orange-100', 
          emoji: '😐', 
          label: t.medRisk,
          tagline: t.thinkBefore
        };
      case 'High': 
        return { 
          color: 'text-rose-600 bg-rose-50 border-rose-100 shadow-rose-100', 
          emoji: '😫', 
          label: t.highRisk,
          tagline: t.spikeAlert
        };
      default: 
        return { 
          color: 'text-gray-600 bg-gray-50 border-gray-100', 
          emoji: '🤔', 
          label: 'Unknown',
          tagline: 'Analyzing...'
        };
    }
  };

  const risk = getRiskDetails(data.riskLevel);
  const estimatedPeakTotal = (userProfile?.fastingBloodSugar || 100) + data.estimatedSpike;
  const isOverTarget = userProfile ? estimatedPeakTotal > userProfile.targetPostMeal : data.estimatedSpike > 60;

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className={`flex justify-between items-start gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${data.scanType === 'recipe' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
              {data.scanType === 'recipe' ? t.modeRecipe : t.modeFood}
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight truncate">{data.name}</h2>
          <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data.portion}</span>
             <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.aiEstimated}</span>
          </div>
        </div>
        <div className={`flex flex-col items-center px-4 py-3 rounded-3xl border shadow-lg transition-transform active:scale-95 ${risk.color}`}>
          <span className="text-4xl mb-1 animate-in zoom-in-50 duration-500">{risk.emoji}</span>
          <span className="text-[11px] font-black uppercase tracking-tighter whitespace-nowrap">{risk.label}</span>
        </div>
      </div>

      {/* New Harmfulness Indicator (Bio-Impact Gauge) */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
        <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.bioImpactTitle}</h3>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isOverTarget ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {data.estimatedSpike} {t.unitMgDl} Δ
          </span>
        </div>
        
        <div className="relative pt-4 pb-2">
          {/* Gradient Gauge Bar */}
          <div className="h-4 w-full rounded-full bg-gradient-to-r from-emerald-400 via-orange-400 to-rose-500 relative">
             {/* Target Marker */}
             {userProfile && (
               <div 
                 className="absolute top-0 bottom-0 w-1 bg-white/50 z-10" 
                 style={{ left: `${Math.min(95, Math.max(5, ((userProfile.targetPostMeal - userProfile.fastingBloodSugar) / 150) * 100))}%` }}
               >
                 <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-400 whitespace-nowrap">TARGET</div>
               </div>
             )}
             
             {/* Current Impact Marker */}
             <div 
               className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-xl border-4 border-blue-600 transition-all duration-1000 ease-out z-20"
               style={{ left: `calc(${Math.min(98, Math.max(2, (data.estimatedSpike / 150) * 100))}% - 12px)` }}
             >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
                  {estimatedPeakTotal}
                </div>
             </div>
          </div>
          
          <div className={`flex justify-between mt-3 text-[9px] font-black text-gray-300 uppercase tracking-tighter ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <span>{t.meterSafe}</span>
            <span className="text-center">{t.meterCaution}</span>
            <span>{t.meterHarmful}</span>
          </div>
        </div>
      </div>

      {userProfile && (
        <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${isOverTarget ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="text-2xl">{isOverTarget ? '😫' : '😊'}</div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">HbA1c {userProfile.hbA1c}% {t.hba1cManagement}</h4>
            <p className="text-sm font-bold text-gray-800">
              {isOverTarget ? t.exceedsTarget : t.withinTarget}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t.maxSpike} value={`+${data.estimatedSpike}`} unit={t.unitMgDl} color="blue" icon="📈" isRTL={isRTL} />
        <StatCard label={t.calories} value={data.calories} unit={t.unitKcal} color="purple" icon="🔥" isRTL={isRTL} />
        <StatCard label={t.giIndex} value={data.gi} unit={t.unitGi} color="amber" icon="⚡" isRTL={isRTL} />
        <StatCard label={t.carbs} value={data.carbs} unit={t.unitG} color="emerald" icon="🍞" isRTL={isRTL} />
      </div>

      <div className="bg-gray-50/50 p-5 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group">
        <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.predictedCurve}</h3>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">{risk.tagline}</p>
          </div>
          {userProfile && (
            <div className="bg-white px-2 py-1 rounded-lg border border-gray-200 flex items-center gap-1.5">
               <span className="text-[8px] font-black text-rose-500 uppercase">{t.targetLabel}: {userProfile.targetPostMeal}</span>
            </div>
          )}
        </div>
        
        <div className={`h-44 w-full ${isRTL ? '-mr-4' : '-ml-4'}`}>
          <ResponsiveContainer width="105%" height="100%">
            <AreaChart data={data.glucoseCurve} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} orientation={isRTL ? 'right' : 'left'} />
              <Tooltip 
                cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-2xl shadow-xl border border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label} {t.minutes}</p>
                        <p className="text-base font-black text-blue-600">+{payload[0].value} <span className="text-[10px] font-medium text-gray-400">{t.unitMgDl}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {userProfile && (
                <ReferenceLine y={userProfile.targetPostMeal - userProfile.fastingBloodSugar} stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" />
              )}
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative group cursor-default">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
        <div className={`relative bg-white p-5 rounded-3xl border border-gray-100 flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="text-2xl mt-1">💡</div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t.dietaryInsight}</h4>
            <p className="text-gray-700 text-sm font-semibold leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, color, icon, isRTL }: { label: string; value: any; unit: string; color: string; icon: string; isRTL: boolean }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50/50 border-blue-100/50 text-blue-600',
    purple: 'bg-purple-50/50 border-purple-100/50 text-purple-600',
    amber: 'bg-amber-50/50 border-amber-100/50 text-amber-600',
    emerald: 'bg-emerald-50/50 border-emerald-100/50 text-emerald-600',
  };
  const labelColorMap: Record<string, string> = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  };

  return (
    <div className={`${colorMap[color]} p-4 rounded-3xl border transition-all hover:scale-[1.02] ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className={`flex justify-between items-start mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${labelColorMap[color]}`}>{label}</p>
        <span className="text-xs">{icon}</span>
      </div>
      <div className={`flex items-baseline gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <p className="text-2xl font-black">{value}</p>
        <p className={`text-[9px] font-bold ${labelColorMap[color]}`}>{unit}</p>
      </div>
    </div>
  );
};

export default ResultCard;
