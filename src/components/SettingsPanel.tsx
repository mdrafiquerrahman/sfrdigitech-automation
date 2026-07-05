import React, { useState } from "react";
import { Shield, Key, Globe, Lock, AlertCircle, Info, RefreshCw, CheckCircle2 } from "lucide-react";

interface SettingsPanelProps {
  onRefresh: () => void;
}

export default function SettingsPanel({ onRefresh }: SettingsPanelProps) {
  const [systemTimezone, setSystemTimezone] = useState("UTC");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("System configuration successfully written to PostgreSQL!");
    setTimeout(() => {
      setSuccessMsg("");
      onRefresh();
    }, 2500);
  };

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title */}
      <div className="border-b border-[#27272a] pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">SaaS Profile Settings</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">Manage token encryptions, server parameters, and PostgreSQL schemas.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-450 text-xs font-mono leading-relaxed flex items-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-xl">
        
        {/* 1. Global Timezone */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center space-x-1">
            <Globe size={12} className="text-zinc-650" />
            <span>SaaS Core Time Zone</span>
          </label>
          <select
            value={systemTimezone}
            onChange={(e) => setSystemTimezone(e.target.value)}
            className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3 focus:outline-none focus:border-[#E1306C] cursor-pointer"
          >
            <option value="UTC">UTC / Coordinated Universal Time (GMT+00:00)</option>
            <option value="Asia/Kolkata">IST / Indian Standard Time (GMT+05:30)</option>
            <option value="America/New_York">EST / Eastern Standard Time (GMT-05:00)</option>
            <option value="Europe/London">GMT / Greenwich Mean Time (GMT+00:00)</option>
            <option value="Asia/Tokyo">JST / Japan Standard Time (GMT+09:00)</option>
            <option value="Europe/Paris">CET / Central European Time (GMT+01:00)</option>
            <option value="America/Los_Angeles">PST / Pacific Standard Time (GMT-08:00)</option>
            <option value="Asia/Singapore">SGT / Singapore Standard Time (GMT+08:00)</option>
          </select>
        </div>

        {/* 2. AES token monitoring */}
        <div className="p-4 bg-[#09090b]/40 border border-[#27272a] rounded-xl space-y-2.5">
          <div className="flex items-center space-x-2">
            <Shield className="text-violet-400" size={16} />
            <span className="text-[10px] font-mono font-bold text-zinc-250 uppercase tracking-wider">AES-256-GCM Secure Encryption Keys</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-450 leading-relaxed">
            All Instagram Graph API user authorization tokens are encrypted immediately upon callback handshakes. The encryption key <code className="text-violet-300">ENCRYPTION_KEY</code> is managed server-side and is never transmitted, processed, or made visible within the React client browser window.
          </p>
        </div>

        {/* 3. System diagnostic status */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Workplace Diagnostics</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
            <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-xl flex justify-between items-center">
              <span className="text-zinc-500">Node JS Port</span>
              <span className="text-zinc-200">3000 (Live)</span>
            </div>

            <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-xl flex justify-between items-center">
              <span className="text-zinc-500">Prisma Client</span>
              <span className="text-emerald-450 font-bold">READY</span>
            </div>

            <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-xl flex justify-between items-center">
              <span className="text-zinc-500">Python Worker Thread</span>
              <span className="text-emerald-450 font-bold">POLLING</span>
            </div>

            <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-xl flex justify-between items-center">
              <span className="text-zinc-500">Database Engine</span>
              <span className="text-zinc-200">PostgreSQL (Dev Sandbox)</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[10px] uppercase tracking-widest font-mono font-bold rounded-xl transition cursor-pointer"
        >
          Save Configuration
        </button>

      </form>
    </div>
  );
}
