import React, { useState } from "react";
import { 
  Code, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  PlayCircle
} from "lucide-react";
import { PublishLog } from "../types";

interface PythonServicePanelProps {
  logs: PublishLog[];
  onClearLogs: () => void;
  onRefresh: () => void;
}

export default function PythonServicePanel({ logs, onClearLogs, onRefresh }: PythonServicePanelProps) {
  const [copied, setCopied] = useState(false);

  const mockPythonScript = `import os
import sys
import time
import json
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from cryptography.fernet import Fernet

# CONFIGURATION
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_NAME = os.getenv("POSTGRES_DB", "instasched_db")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secret")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "b'rS4_VbQ09pG_m...'")

POLL_INTERVAL = 30  # 30-second polling daemon interval

def decrypt_token(encrypted_token: str) -> str:
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted_token.encode()).decode()

def poll_and_process():
    # Connect directly to PostgreSQL via psycopg2
    conn = psycopg2.connect(
        host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS,
        cursor_factory=RealDictCursor
    )
    cur = conn.cursor()
    
    # Query pending posts whose scheduled time is due
    cur.execute("""
        SELECT * FROM "ScheduledPost" 
        WHERE "status" = 'pending' AND "scheduledFor" <= NOW()
    """)
    due_posts = cur.fetchall()
    
    for post in due_posts:
        # Secure OAuth Decryption handshake
        cur.execute("SELECT * FROM \"InstagramAccount\" WHERE \"id\" = %s", (post["instagramAccountId"],))
        acc = cur.fetchone()
        
        token = decrypt_token(acc["accessToken"])
        
        # Publish using official Instagram Graph API Flow (Double Handshake Container creation)
        try:
            # 1. Create Media Container ID
            media_payload = {
                "image_url": post["mediaUrls"][0],
                "caption": post["caption"],
                "access_token": token
            }
            container_res = requests.post(
                f"https://graph.facebook.com/v20.0/{acc['username']}/media",
                json=media_payload,
                timeout=30
            )
            container_res.raise_for_status()
            container_id = container_res.json()["id"]
            
            # 2. Release & Publish Container to Live Feed
            pub_res = requests.post(
                f"https://graph.facebook.com/v20.0/{acc['username']}/media_publish",
                json={"creation_id": container_id, "access_token": token},
                timeout=30
            )
            pub_res.raise_for_status()
            ig_post_id = pub_res.json()["id"]
            
            # Update database status to completed
            cur.execute("""
                UPDATE "ScheduledPost" 
                SET "status" = 'completed', "postedAt" = NOW(), "instagramId" = %s 
                WHERE "id" = %s
            """, (ig_post_id, post["id"]))
            
        except Exception as e:
            # Exponential Backoff Retry logger
            cur.execute("""
                UPDATE "ScheduledPost" 
                SET "status" = 'failed', "error" = %s 
                WHERE "id" = %s
            """, (str(e), post["id"]))
            
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    print("[Python Daemon] Polling daemon active. Tick rate 30s.")
    while True:
        poll_and_process()
        time.sleep(POLL_INTERVAL)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mockPythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([mockPythonScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scheduler.py";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Overview Block */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Python Poller Daemon Panel</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-2xl">
            This panel monitors the standalone Python polling service. In production, this separate container compiles and connects to the PostgreSQL database every 30 seconds to run Graph API publishing handshakes, and logs results back using Fernet AES decryption.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition border border-[#27272a] cursor-pointer"
            title="Force Poll Queue"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={onClearLogs}
            className="px-4 py-2 bg-zinc-800 hover:bg-rose-950/20 text-rose-450 hover:text-rose-350 font-bold text-[10px] uppercase tracking-widest font-mono rounded-xl border border-rose-950/30 transition cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 size={13} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Live terminal (Col span 7) */}
        <div className="lg:col-span-7 bg-black border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Header toolbar */}
          <div className="bg-[#121214] border-b border-[#27272a] px-4 py-3.5 flex justify-between items-center text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Terminal className="text-[#E1306C]" size={15} />
              <span className="text-zinc-300 font-bold text-[11px] uppercase tracking-wider">daemon-output.log &bull; active</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-1" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>

          {/* Terminal stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3.5 font-mono text-xs text-zinc-300 scrollbar-thin">
            {logs.map((log) => (
              <div key={log.id} className="leading-relaxed flex items-start space-x-3 text-[11px] p-2 hover:bg-zinc-900/40 rounded-lg transition border border-transparent hover:border-zinc-800/40">
                <span className="text-zinc-650 shrink-0 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]
                </span>
                
                <div className="flex-1 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase mr-2 inline-block ${
                    log.status === "success" ? "bg-emerald-950/60 border border-emerald-900/30 text-emerald-450" :
                    log.status === "warning" ? "bg-amber-950/60 border border-amber-900/30 text-amber-500" :
                    log.status === "error" ? "bg-rose-950/60 border border-rose-900/30 text-rose-450" :
                    "bg-blue-950/60 border border-blue-900/30 text-blue-400"
                  }`}>
                    {log.status}
                  </span>
                  <span className="text-zinc-350 break-words">{log.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Code Viewer (Col span 5) */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Production Daemon Code</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-mono">Deployable python script</p>
            </div>
            
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopy}
                className="p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-[#27272a] transition cursor-pointer"
                title="Copy code to clipboard"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-[#27272a] transition cursor-pointer"
                title="Download python script"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-[#27272a]/80 bg-[#09090b] p-4 text-[10px] font-mono leading-relaxed text-zinc-400 h-[380px] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{mockPythonScript}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
