
import React, { useState } from 'react';
import { User, UserProfile } from '../types';
import { translations, Language } from '../translations';

interface AuthScreenProps {
  onAuthComplete: (user: User, stayLoggedIn: boolean) => void;
  lang: Language;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, lang }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true); // 항상 기본값 true
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = translations[lang];
  const isRTL = lang === 'ar';

  const defaultProfile: UserProfile = {
    hbA1c: 6.5,
    fastingBloodSugar: 110,
    targetPostMeal: 160,
    conditions: []
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const rawPassword = password;

    if (!normalizedEmail || !rawPassword) {
      setError(t.authError);
      return;
    }

    const savedUsersStr = localStorage.getItem('glucoscanc_users') || '{}';
    let users: Record<string, any> = {};
    try {
      users = JSON.parse(savedUsersStr);
    } catch (e) {
      users = {};
    }

    if (view === 'login') {
      const storedUser = users[normalizedEmail];
      
      if (storedUser && storedUser.password === rawPassword) {
        const userToLogin: User = {
          email: normalizedEmail,
          password: rawPassword,
          profile: storedUser.profile || defaultProfile,
          history: storedUser.history || []
        };
        // 사용자가 명시적으로 로그아웃할 때까지 유지하도록 true 전달
        onAuthComplete(userToLogin, true);
      } else {
        setError(t.authError);
      }
    } else if (view === 'signup') {
      if (rawPassword !== confirmPassword) {
        setError(t.passwordMismatch);
        return;
      }
      
      if (users[normalizedEmail]) {
        setError("User already exists");
        return;
      }
      
      const newUser = {
        password: rawPassword,
        profile: defaultProfile,
        history: []
      };
      
      users[normalizedEmail] = newUser;
      localStorage.setItem('glucoscanc_users', JSON.stringify(users));
      
      onAuthComplete({ 
        email: normalizedEmail,
        password: rawPassword,
        profile: defaultProfile, 
        history: [] 
      }, true);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const savedUsersStr = localStorage.getItem('glucoscanc_users') || '{}';
    const users = JSON.parse(savedUsersStr);

    if (resetStep === 1) {
      if (!normalizedEmail) {
        setError("Please enter your email");
        return;
      }
      if (!users[normalizedEmail]) {
        setError(t.emailNotFound);
        return;
      }
      setResetStep(2);
    } else {
      if (!newPassword) {
        setError("Please enter a new password");
        return;
      }
      users[normalizedEmail].password = newPassword;
      localStorage.setItem('glucoscanc_users', JSON.stringify(users));
      setSuccess(t.resetSuccess);
      
      setTimeout(() => {
        setView('login');
        setResetStep(1);
        setSuccess('');
        setError('');
        setPassword('');
        setConfirmPassword('');
      }, 2000);
    }
  };

  const handleGuest = () => {
    onAuthComplete({
      email: 'guest',
      profile: defaultProfile,
      history: []
    }, false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-6 ${isRTL ? 'font-arabic' : ''}`}>
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mb-4 shadow-xl shadow-blue-200">G</div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{t.appTitle}</h1>
          <p className="text-gray-400 font-bold text-sm mt-1">
            {view === 'login' ? t.loginTitle : view === 'signup' ? t.signupTitle : t.resetPasswordTitle}
          </p>
        </div>

        {view !== 'forgot' ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                className={`w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <input
                type="password"
                placeholder={t.passwordPlaceholder}
                className={`w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {view === 'signup' && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <input
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
                  className={`w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}

            <div className={`flex items-center justify-between mt-2 px-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="stayLoggedIn" 
                  checked={stayLoggedIn} 
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="stayLoggedIn" className="text-[11px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none">
                  {t.autoLogin}
                </label>
              </div>
              {view === 'login' && (
                <button 
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError('');
                  }}
                  className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  {t.forgotPassword}
                </button>
              )}
            </div>

            {error && <p className="text-rose-500 text-xs font-black text-center">{error}</p>}

            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4">
              {view === 'login' ? t.loginBtn : t.signupBtn}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {resetStep === 1 ? (
              <div className="space-y-1">
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  className={`w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] text-emerald-600 font-bold mb-2 text-center uppercase tracking-widest">Code Verified! Set new password.</p>
                <input
                  type="password"
                  placeholder={t.newPasswordPlaceholder}
                  className={`w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-rose-500 text-xs font-black text-center">{error}</p>}
            {success && <p className="text-emerald-500 text-xs font-black text-center">{success}</p>}

            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4">
              {resetStep === 1 ? t.sendResetLink : t.updatePassword}
            </button>
            
            <button 
              type="button"
              onClick={() => {
                setView('login');
                setResetStep(1);
                setError('');
              }}
              className="w-full py-2 text-gray-400 text-[11px] font-black uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              {t.backToLogin}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col gap-4 items-center">
          {view !== 'forgot' && (
            <button 
              onClick={() => {
                setView(view === 'login' ? 'signup' : 'login');
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline"
            >
              {view === 'login' ? t.switchSignup : t.switchLogin}
            </button>
          )}
          
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] text-gray-300 font-black uppercase">OR</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <button 
            onClick={handleGuest}
            className="text-gray-400 text-xs font-black uppercase tracking-widest hover:text-gray-900 transition-colors"
          >
            {t.guestBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
