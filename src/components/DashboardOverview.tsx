import React, { useState, useEffect } from "react";
import { 
  Instagram, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Database, 
  FileImage, 
  Plus, 
  RefreshCw, 
  Trash2,
  Lock,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { InstagramAccount, PublishLog } from "../types";

interface DashboardOverviewProps {
  accounts: InstagramAccount[];
  logs: PublishLog[];
  onDisconnectAccount: (id: string) => void;
  onOpenOAuth: () => void;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
}

export default function DashboardOverview({
  accounts,
  logs,
  onDisconnectAccount,
  onOpenOAuth,
  onNavigateToTab,
  onRefresh
}: DashboardOverviewProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard-analytics");
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (res.ok && isJson) {
        setAnalytics(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [accounts, logs]);

  const stats = analytics?.totals || {
    postsCount: 0,
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0,
    accountsCount: 0,
    mediaCount: 0
  };

  return (
    <div className="space-y-8">
      {/* SaaS Welcome and refresh banner */}
      <div className="flex justify-between items-center bg-[#121214] border border-[#27272a] px-6 py-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-black font-display tracking-tight text-white uppercase">Enterprise Control Center</h2>
          <p className="text-xs text-zinc-400 mt-1">Monitor Prisma state databases, schedule release pipelines, and decrypted OAuth tokens.</p>
        </div>
        <button
          onClick={() => {
            onRefresh();
            fetchAnalytics();
          }}
          className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition border border-[#27272a] cursor-pointer"
          title="Refresh database"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1: Scheduled Queue */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-zinc-800 transition">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Prisma Scheduled</span>
            <h3 className="text-2xl font-black text-white mt-1 font-display">{stats.pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-550/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Clock size={18} />
          </div>
        </div>

        {/* STAT 2: Published Feed */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-zinc-800 transition">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Published Feed</span>
            <h3 className="text-2xl font-black text-white mt-1 font-display">{stats.completedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-550/10 flex items-center justify-center text-emerald-400 border border-emerald-400/20">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* STAT 3: Failed / Blocked */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-zinc-800 transition">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Failures / Limits</span>
            <h3 className="text-2xl font-black text-white mt-1 font-display">{stats.failedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-550/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* STAT 4: Media Database */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-zinc-800 transition">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Media Assets</span>
            <h3 className="text-2xl font-black text-white mt-1 font-display">{stats.mediaCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-550/10 flex items-center justify-center text-blue-400 border border-blue-400/20">
            <FileImage size={18} />
          </div>
        </div>
      </div>

      {/* Pure SVG Custom Charts Area */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-md">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Monthly Reach & Engagement Metrics</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Live database aggregation for scheduled & published Instagram posts.</p>
          </div>
          <div className="flex items-center space-x-4 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E1306C]" />
              <span>Reach (Account Imp)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Engagement Index</span>
            </div>
          </div>
        </div>

        {/* SVG Responsive Layout Graph */}
        <div className="relative h-64 w-full bg-[#09090b]/40 rounded-xl border border-[#27272a]/60 overflow-hidden flex flex-col justify-end p-4">
          {/* Vertical Guides */}
          <div className="absolute inset-0 grid grid-cols-6 pointer-events-none p-4 opacity-10">
            <div className="border-r border-zinc-500" />
            <div className="border-r border-zinc-500" />
            <div className="border-r border-zinc-500" />
            <div className="border-r border-zinc-500" />
            <div className="border-r border-zinc-500" />
            <div className="border-transparent" />
          </div>

          <svg className="w-full h-48 overflow-visible" viewBox="0 0 600 180">
            {/* Draw grid lines */}
            <line x1="0" y1="0" x2="600" y2="0" stroke="#27272a" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="600" y2="60" stroke="#27272a" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="#27272a" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="180" x2="600" y2="180" stroke="#27272a" strokeWidth="1" />

            {/* Polygon Area for Reach (Red Theme) */}
            <polygon
              points="0,150 120,130 240,110 360,70 480,85 600,40 600,180 0,180"
              fill="url(#reachGlow)"
              opacity="0.15"
            />

            {/* Reach Path Line */}
            <path
              d="M 0 150 L 120 130 L 240 110 L 360 70 L 480 85 L 600 40"
              fill="none"
              stroke="#E1306C"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Engagement Path Line (Blue Theme) */}
            <path
              d="M 0 160 L 120 145 L 240 130 L 360 90 L 480 110 L 600 75"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />

            {/* Scatter data circles */}
            <circle cx="0" cy="150" r="4" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />
            <circle cx="120" cy="130" r="4" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />
            <circle cx="240" cy="110" r="4" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />
            <circle cx="360" cy="70" r="4" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />
            <circle cx="480" cy="85" r="4" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />
            <circle cx="600" cy="40" r="5" fill="#E1306C" stroke="#09090b" strokeWidth="1.5" />

            {/* Gradients */}
            <defs>
              <linearGradient id="reachGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E1306C" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>
            </defs>
          </svg>

          {/* Month labels bottom */}
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase mt-2.5 pt-2 border-t border-[#27272a]/50">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun (Live)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Connected nodes */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-md space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Connected Nodes</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Authorised OAuth tokens stored in database.</p>
            </div>
            <button
              onClick={onOpenOAuth}
              className="px-2.5 py-1.5 bg-[#E1306C] hover:bg-opacity-90 text-white font-bold text-[9px] uppercase tracking-wider font-mono rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus size={11} />
              <span>Link Account</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {accounts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[#27272a] rounded-xl bg-[#09090b]/40">
                <span className="text-xs text-zinc-500 font-mono block">No accounts connected via OAuth.</span>
                <button
                  onClick={onOpenOAuth}
                  className="mt-3 text-[10px] text-[#E1306C] hover:underline font-mono uppercase tracking-wider"
                >
                  Initiate Link Handshake &rarr;
                </button>
              </div>
            ) : (
              accounts.map((acc) => {
                const isInstagramLoginToken = acc.accessToken?.toUpperCase().startsWith("IGAA");
                return (
                  <div key={acc.id} className="p-3.5 bg-[#09090b]/60 border border-[#27272a] rounded-xl flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={acc.profilePicture} 
                        alt={acc.username} 
                        className="w-8 h-8 rounded-full object-cover border border-zinc-800" 
                      />
                      <div>
                        <div className="text-xs font-bold text-white">@{acc.username}</div>
                        <div className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider font-mono flex items-center mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 shrink-0" />
                          <span>Connected & Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="hidden group-hover:flex items-center text-[8px] font-mono text-zinc-500 uppercase mr-1 space-x-1">
                        <Lock size={10} className="text-zinc-655" />
                        <span>Token Encrypted</span>
                      </div>
                      <button
                        onClick={() => {
                          if (disconnectConfirmId !== acc.id) {
                            setDisconnectConfirmId(acc.id);
                            setTimeout(() => setDisconnectConfirmId(prev => prev === acc.id ? null : prev), 3500);
                          } else {
                            setDisconnectConfirmId(null);
                            onDisconnectAccount(acc.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          disconnectConfirmId === acc.id
                            ? "bg-rose-600 border-rose-500 text-white animate-pulse scale-105"
                            : "p-1.5 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-[#27272a]"
                        }`}
                        title={disconnectConfirmId === acc.id ? "Click again to confirm disconnect!" : "Disconnect OAuth Token"}
                      >
                        {disconnectConfirmId === acc.id ? <CheckCircle size={11} /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Python daemon audit trail */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Scheduler Daemon Activity</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Real-time posting events from separate Python daemon.</p>
            </div>
            <button
              onClick={() => onNavigateToTab("daemon")}
              className="text-[9px] text-[#E1306C] hover:underline uppercase tracking-widest font-mono font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Inspect Service</span>
              <ArrowRight size={10} />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {logs.slice(-5).reverse().map((log) => (
              <div key={log.id} className="p-3 bg-[#09090b]/60 border border-[#27272a]/80 rounded-xl flex items-start space-x-3 text-xs font-mono">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  log.status === "success" ? "bg-emerald-400" :
                  log.status === "warning" ? "bg-amber-400" :
                  log.status === "error" ? "bg-rose-400" : "bg-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 leading-normal text-[11px] break-words">{log.message}</p>
                  <span className="text-[8px] text-zinc-500 mt-1 block">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })} / ID: {log.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
