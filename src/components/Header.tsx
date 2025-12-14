import { useEffect, useMemo, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function Header(props: {
  balanceCoins: number;
  onBalanceClick: () => void;
}) {
  const { balanceCoins, onBalanceClick } = props;
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp as
      | { ready?: () => void; initDataUnsafe?: { user?: TelegramUser } }
      | undefined;
    if (!tg) return;

    try {
      tg.ready?.();
    } catch {
      // ignore
    }

    const user = tg.initDataUnsafe?.user ?? null;
    setTgUser(user);
  }, []);

  const displayName = useMemo(() => {
    if (tgUser?.username) return `@${tgUser.username}`;
    if (tgUser?.first_name) return tgUser.first_name;
    return 'Guest';
  }, [tgUser]);

  return (
    <div className="flex justify-between items-center mb-8">
      {/* --- Left: Logo --- */}
      <div className="flex flex-col">
        <div className="flex items-end gap-1">
          <span className="text-neon-green font-black text-2xl tracking-tighter italic">
            ODDSFLOW
          </span>
          <span className="text-white text-[10px] font-bold mb-1 opacity-80">AI</span>
        </div>

        {/* --- User display --- */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(0,255,156,0.9)]"></div>
          <span className="text-gray-300 text-[11px] font-medium tracking-wide">
            {displayName}
          </span>
        </div>
      </div>

      {/* --- Right: Balance button (keep style) --- */}
      <button
        onClick={onBalanceClick}
        className="bg-surface-highlight px-3 py-1 rounded-full text-xs font-mono border border-neon-gold/30 text-neon-gold hover:border-neon-gold/50 hover:bg-surface-highlight/80 transition-all cursor-pointer"
      >
        BAL: $
        {balanceCoins.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </button>
    </div>
  );
}


