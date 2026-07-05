import React from "react";
import { 
  Instagram, 
  LayoutDashboard, 
  Calendar, 
  PlusCircle, 
  FileImage, 
  Terminal, 
  Code, 
  Settings, 
  LogOut,
  UserCheck,
  MessageSquare
} from "lucide-react";
import { User } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenOAuth: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, onOpenOAuth }: SidebarProps) {
  const MENU_ITEMS = [
    { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "composer", label: "Schedule Post", icon: PlusCircle },
    { id: "calendar", label: "Calendar View", icon: Calendar },
    { id: "autoreply", label: "Auto Reply Bot", icon: MessageSquare },
    { id: "queue", label: "Scheduled Queue", icon: Terminal },
    { id: "media", label: "Media Library", icon: FileImage },
    { id: "daemon", label: "Python Service Logs", icon: Code },
    { id: "code", label: "Production Codebase", icon: Settings },
    { id: "settings", label: "SaaS Settings", icon: UserCheck },
  ];

  return (
    <aside className="w-64 bg-[#121214] border-r border-[#27272a] h-screen fixed left-0 top-0 flex flex-col justify-between z-40">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#27272a]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-stone-700 via-stone-800 to-stone-900 flex items-center justify-center shadow-md">
            <Instagram size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black font-display tracking-tight text-white uppercase leading-none">
              SFR DigiTech
            </h1>
            <span className="text-[8px] text-stone-500 font-mono tracking-widest uppercase block mt-1">Automation Engine</span>
          </div>
        </div>
      </div>

      {/* Main Menu Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition duration-150 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-[#E1306C]/10 to-transparent border-l-2 border-[#E1306C] text-[#E1306C]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1e]"
              }`}
            >
              <Icon size={16} className={isActive ? "text-[#E1306C]" : "text-zinc-400"} />
              <span className="font-mono text-[10px] tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Section / Log out */}
      <div className="p-4 border-t border-[#27272a]">
        {currentUser ? (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 flex flex-col space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                {currentUser.name[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[8px] text-zinc-500 font-mono truncate">{currentUser.email}</div>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="w-full py-1.5 bg-[#18181b] border border-rose-950/40 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded-lg text-[9px] font-mono tracking-widest uppercase transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <LogOut size={10} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <div className="text-center p-2">
            <span className="text-[10px] text-zinc-500 font-mono block">SFR Automation Locked</span>
          </div>
        )}
      </div>
    </aside>
  );
}
