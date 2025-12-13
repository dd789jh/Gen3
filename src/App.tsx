import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// --- 👇 这里是新增的“翻译说明书”，专门消除红色波浪线 👇 ---
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}
// -----------------------------------------------------------

// 初始化 Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('radar');
  
  // 这里的 <any> 是为了让 TS 别太严格，防止报错
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const initApp = async () => {
      // 告诉 Telegram WebApp 我们准备好了
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } else {
        // 如果不在 TG 里，为了方便调试，允许显示加载中，或者报错
        console.log("Not in Telegram WebApp");
      }

      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      
      // 如果没有获取到 TG 用户，先暂停（生产环境），或者用假数据（开发环境）
      // 这里我们严谨一点：没有 TG 用户就不登录
      if (!tgUser) {
        setLoading(false); 
        return;
      }

      const telegramId = tgUser.id;
      const email = `${telegramId}@oddsflow.user`;
      const password = `secret_${telegramId}`;

      try {
        // 1. 尝试登录
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        let userId = signInData.user?.id;

        // 2. 如果失败，尝试注册
        if (signInError) {
          const { data: signUpData } = await supabase.auth.signUp({
            email,
            password
          });
          userId = signUpData.user?.id;

          // 注册成功后，写入 users 表
          if (userId) {
            await supabase.from('users').insert({
              id: userId,
              telegram_id: telegramId,
              username: tgUser.username || "User",
              first_name: tgUser.first_name || "",
              vip_level: 'free'
            });
          }
        }

        // 3. 获取用户档案
        if (userId) {
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          
          setUser({ id: userId, email });
          setProfile(profileData || { username: tgUser.username, vip_level: 'free' });
        }

      } catch (error) {
        console.error("Login logic error:", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff' }}>
        <div className="loader">Loading OddsFlow...</div>
      </div>
    );
  }

  // --- 漂亮的 UI 界面 ---
  return (
    <div className="app-container" style={{ background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'Arial, sans-serif', paddingBottom: '80px' }}>
      
      {/* 顶部导航 */}
      <header style={{ padding: '15px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#38bdf8' }}>OddsFlow Radar</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
          {profile?.username ? `@${profile.username}` : 'Guest'}
          <span style={{ padding: '2px 8px', borderRadius: '10px', background: profile?.vip_level === 'vip' ? '#eab308' : '#475569', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
            {profile?.vip_level?.toUpperCase() || 'FREE'}
          </span>
        </div>
      </header>

      {/* 主内容区 */}
      <main style={{ padding: '20px' }}>
        {activeTab === 'radar' && (
          <div className="animate-fade-in">
            <h2 style={{ color: '#38bdf8', marginTop: 0 }}>📡 Live Market Radar</h2>
            
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', marginTop: '15px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
              <p style={{ color: '#94a3b8' }}>Scanning 250+ pairs for whale activity...</p>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>BTC/USDT</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Large Buy Wall Detected (Binance)</div>
              </div>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #eab308' }}>
                <div style={{ fontWeight: 'bold', color: '#eab308' }}>ETH/USDT</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Unusual Volume Spike (+450%)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vip' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>👑</div>
            <h2 style={{ margin: '10px 0' }}>Upgrade to VIP</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Get real-time alerts before the pump.</p>
            
            <button style={{ 
              background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', 
              border: 'none', 
              padding: '16px 32px', 
              borderRadius: '30px', 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
              width: '100%'
            }}>
              Get Premium Access
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h2 style={{ marginTop: 0 }}>👤 Profile</h2>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', marginTop: '15px', border: '1px solid #334155' }}>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>TELEGRAM ID</div>
                  <div style={{ fontSize: '16px', fontFamily: 'monospace' }}>{profile?.telegram_id || '---'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>STATUS</div>
                  <div style={{ color: profile?.vip_level === 'vip' ? '#eab308' : '#94a3b8', fontWeight: 'bold' }}>
                    {profile?.vip_level?.toUpperCase() || 'FREE TIER'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>JOINED</div>
                  <div>{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部 Tab 栏 */}
      <nav style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'rgba(30, 41, 59, 0.9)', 
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #334155', 
        display: 'flex', 
        justifyContent: 'space-around', 
        padding: '15px 0',
        zIndex: 100
      }}>
        <button onClick={() => setActiveTab('radar')} style={{ background: 'none', border: 'none', color: activeTab === 'radar' ? '#38bdf8' : '#64748b', fontSize: '24px', cursor: 'pointer' }}>📡</button>
        <button onClick={() => setActiveTab('vip')} style={{ background: 'none', border: 'none', color: activeTab === 'vip' ? '#eab308' : '#64748b', fontSize: '24px', cursor: 'pointer' }}>👑</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#38bdf8' : '#64748b', fontSize: '24px', cursor: 'pointer' }}>👤</button>
      </nav>
    </div>
  );
}
export default App;
// update final
