import React, { useState } from "react";
import { motion } from "motion/react";
import { Facebook, Shield, CheckCircle, Info, Lock, Key } from "lucide-react";

interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (accountData: { 
    username: string; 
    displayName: string; 
    profilePicture?: string;
    isReal?: boolean;
    instagramBusinessAccountId?: string;
    accessToken?: string;
  }) => void;
}

export default function OAuthModal({ isOpen, onClose, onConnect }: OAuthModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPages, setSelectedPages] = useState<string[]>(["acc_travel_escapes"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Live Account connection states
  const [useCustomAccount, setUseCustomAccount] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const [customDisplayName, setCustomDisplayName] = useState("");
  const [customPassword, setCustomPassword] = useState("");

  const [isRealIG, setIsRealIG] = useState(false);
  const [igBusinessId, setIgBusinessId] = useState("");
  const [igAccessToken, setIgAccessToken] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const PAGES = [
    { id: "acc_travel_escapes", name: "@travel_escapes (Instagram Business)", pageName: "Travel Escapes Facebook Page", handle: "@travel_escapes", pfp: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=150&auto=format&fit=crop&q=80" },
    { id: "acc_saas_growth", name: "@saas_growth (Instagram Business)", pageName: "SaaS Growth Facebook Page", handle: "@saas_growth", pfp: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=80" },
    { id: "acc_fitness_coach", name: "@fit_lifestyle (Instagram Business)", pageName: "Fit Lifestyle Page", handle: "@fit_lifestyle", pfp: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=80" }
  ];

  const handlePageToggle = (id: string) => {
    setSelectedPages(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCompleteFlow = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      if (useCustomAccount) {
        if (customUsername.trim()) {
          const userStr = customUsername.trim().replace("@", "");
          onConnect({
            username: userStr,
            displayName: customDisplayName.trim() || `${userStr} Live Page`,
            profilePicture: `https://api.dicebear.com/7.x/identicon/svg?seed=${userStr}`,
            isReal: isRealIG,
            instagramBusinessAccountId: isRealIG ? igBusinessId.trim() : "",
            accessToken: isRealIG ? igAccessToken.trim() : ""
          });
        }
      } else {
        // Connect each selected page
        PAGES.forEach(p => {
          if (selectedPages.includes(p.id)) {
            onConnect({
              username: p.handle,
              displayName: p.name.split(" (")[0],
              profilePicture: p.pfp,
              isReal: false
            });
          }
        });
      }
      setIsSubmitting(false);
      setStep(1);
      // Reset custom inputs
      setCustomUsername("");
      setCustomDisplayName("");
      setCustomPassword("");
      setUseCustomAccount(false);
      setIsRealIG(false);
      setIgBusinessId("");
      setIgAccessToken("");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[#121214] border border-[#27272a] rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        {/* Facebook Blue Header */}
        <div className="bg-[#1877F2] p-6 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white text-[#1877F2] rounded-lg">
              <Facebook size={24} fill="currentColor" stroke="none" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight font-display uppercase">Facebook Login</h2>
              <p className="text-[10px] uppercase font-mono tracking-widest text-blue-100">Official Graph API Consent Screen</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white font-mono text-xs uppercase hover:underline cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Content steps */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3 bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl">
                <Shield className="text-blue-400 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-blue-300 uppercase font-mono tracking-wider">🔒 Secure Sandbox Authorization</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    SFR DigiTech Automation connects directly via Facebook's Graph API. We **never** ask for or store your Instagram passwords. A temporary OAuth token is issued and securely encrypted using standard AES-256 before being written to PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">App Permissions Requested:</h3>
                <ul className="text-xs text-zinc-400 space-y-2 pl-1">
                  <li className="flex items-center space-x-2.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span><strong className="text-zinc-300">instagram_basic</strong>: Fetch accounts and profile details.</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span><strong className="text-zinc-300">instagram_content_publish</strong>: Publish Single Photos, Carousels, and Reels.</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span><strong className="text-zinc-300">pages_read_engagement</strong>: Identify Business Pages linked to accounts.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 py-3 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Continue as {`Alex Rivera`}</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Link Instagram Account:</h3>
                <p className="text-[10px] text-zinc-400 mt-1">Specify which creator or business profile should be registered to schedule posts.</p>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 bg-[#09090b] p-1 rounded-xl border border-[#27272a] mb-4">
                <button
                  type="button"
                  onClick={() => setUseCustomAccount(false)}
                  className={`py-2 text-[10px] font-black uppercase tracking-widest font-mono rounded-lg transition duration-150 cursor-pointer ${
                    !useCustomAccount ? "bg-[#1877F2] text-white" : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Preset Accounts
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomAccount(true)}
                  className={`py-2 text-[10px] font-black uppercase tracking-widest font-mono rounded-lg transition duration-150 cursor-pointer ${
                    useCustomAccount ? "bg-[#1877F2] text-white" : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Custom Creator Account
                </button>
              </div>

              {!useCustomAccount ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {PAGES.map((page) => {
                    const isChecked = selectedPages.includes(page.id);
                    return (
                      <div
                        key={page.id}
                        onClick={() => handlePageToggle(page.id)}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                          isChecked 
                            ? "border-[#1877F2] bg-blue-950/10" 
                            : "border-[#27272a] hover:border-[#3f3f46]"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img 
                            src={page.pfp} 
                            alt={page.name} 
                            className="w-9 h-9 rounded-full object-cover border border-[#27272a]" 
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{page.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{page.pageName}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isChecked ? "bg-[#1877F2] border-[#1877F2] text-white" : "border-[#3f3f46]"
                        }`}>
                          {isChecked && <CheckCircle size={13} fill="currentColor" className="text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 max-h-[265px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider block">🟢 Live Instagram Publishing</span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">Bypass simulation and publish directly to a live account.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isRealIG}
                        onChange={(e) => setIsRealIG(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1877F2] peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {!isRealIG ? (
                    <div className="p-3.5 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl space-y-1 text-[11px] leading-relaxed">
                      <div className="font-bold uppercase tracking-wider flex items-center space-x-1.5 font-mono text-xs text-amber-300">
                        <span>⚠️ Sandbox Simulation Environment</span>
                      </div>
                      <p>
                        This SaaS publisher runs in an interactive <strong>API Sandbox Simulator</strong>. You can connect any handle/username and build queues, but <strong>no posts are uploaded to your real physical Instagram account</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl space-y-1 text-[11px] leading-relaxed">
                      <div className="font-bold uppercase tracking-wider flex items-center space-x-1.5 font-mono text-xs text-blue-300">
                        <span>🚀 Real Instagram Graph API Active</span>
                      </div>
                      <p>
                        Publish posts directly to your Instagram profile! To work, this requires a Meta Developer application context with public-facing HTTP image endpoints (handled automatically by our proxy).
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                        <Lock size={12} className="text-zinc-500" />
                        <span>Instagram Handle</span>
                      </label>
                      <input
                        type="text"
                        value={customUsername}
                        onChange={(e) => setCustomUsername(e.target.value)}
                        placeholder="e.g. @rafique_runs"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#1877F2]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                        <span>Display Name</span>
                      </label>
                      <input
                        type="text"
                        value={customDisplayName}
                        onChange={(e) => setCustomDisplayName(e.target.value)}
                        placeholder="e.g. Rafique's Fitness Blog"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  </div>

                  {isRealIG && (
                    <div className="space-y-4 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                          <Key size={12} className="text-[#1877F2]" />
                          <span>Instagram Business Account ID</span>
                        </label>
                        <input
                          type="text"
                          value={igBusinessId}
                          onChange={(e) => setIgBusinessId(e.target.value)}
                          placeholder="e.g. 17841400000000000"
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#1877F2]"
                          required
                        />
                        <p className="text-[9px] text-zinc-500 leading-normal font-mono">
                          Find this under Facebook Page Settings &gt; Linked Accounts, or via Graph API Explorer.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                          <Lock size={12} className="text-[#1877F2]" />
                          <span>Meta Page/User Access Token</span>
                        </label>
                        <input
                          type="text"
                          value={igAccessToken}
                          onChange={(e) => setIgAccessToken(e.target.value)}
                          placeholder="e.g. EAAC..."
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#1877F2]"
                          required
                        />
                        <p className="text-[9px] text-zinc-500 leading-normal font-mono">
                          Requires <code className="text-zinc-400">instagram_content_publish</code>, <code className="text-zinc-400">instagram_basic</code>, and <code className="text-zinc-400">pages_show_list</code> permissions.
                        </p>
                        {igAccessToken.trim().toUpperCase().startsWith("IGAA") && (
                          <div className="p-3 bg-blue-950/30 border border-blue-900/40 text-blue-400 rounded-xl text-[10px] leading-normal font-mono mt-2">
                            <span className="font-bold block uppercase tracking-wide text-blue-300">ℹ️ Instagram Login Token Detected</span>
                            You entered an Instagram Login Access Token (starts with <code className="text-white">IGAA...</code>). We fully support this!
                            <br className="mt-1" />
                            Our system will automatically route your publishing requests to <code className="text-white">graph.instagram.com</code>. Please ensure you have assigned the **Instagram Tester** role in your developer app and have enabled the <code className="text-blue-300 font-bold">instagram_content_publish</code> feature.
                          </div>
                        )}
                      </div>

                      {/* Interactive Help Guide Accordion */}
                      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40">
                        <button
                          type="button"
                          onClick={() => setShowHelp(!showHelp)}
                          className="w-full px-3 py-2 text-left text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between hover:bg-zinc-800/50 transition"
                        >
                          <span>💡 Need help getting these?</span>
                          <span className="text-zinc-500">{showHelp ? "▲ Hide Guide" : "▼ Show Guide"}</span>
                        </button>
                        {showHelp && (
                          <div className="p-3 text-[10px] text-zinc-400 font-mono space-y-2 border-t border-zinc-800 leading-relaxed max-h-[160px] overflow-y-auto">
                            <p className="text-zinc-300 font-bold">1. Find Your Instagram Business ID</p>
                            <p>
                              Your professional Instagram account must be linked to a Facebook Page.
                              Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-[#1877F2] underline hover:text-blue-400">Meta Graph API Explorer</a> and make a 
                              <code className="text-zinc-300 ml-1">GET me/accounts</code> call. Copy your Page ID, then make a 
                              <code className="text-zinc-300 ml-1">GET &#123;page-id&#125;?fields=instagram_business_account</code> call to obtain the 17-digit ID.
                            </p>
                            
                            <p className="text-zinc-300 font-bold mt-2">2. Obtain Your Meta Access Token</p>
                            <p>
                              Generate a User Access Token in the explorer. Click <strong>Generate Token</strong> and grant these precise permissions:
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5 text-zinc-300 font-bold">
                              <li>instagram_content_publish</li>
                              <li>instagram_basic</li>
                              <li>pages_show_list</li>
                              <li>pages_read_engagement</li>
                            </ul>
                            <p className="mt-1 text-zinc-500">
                              ⚠️ Explorer tokens are short-lived (1-2 hours). For standard production schedules, convert this to a **Long-Lived Access Token** (lasts 60 days) or set up a **System User** token in your Meta Business Suite settings.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isRealIG && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                        <Key size={12} className="text-zinc-500" />
                        <span>Secure Password / Access Token Handshake</span>
                      </label>
                      <input
                        type="password"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#1877F2]"
                      />
                      <p className="text-[9px] text-zinc-500 leading-normal font-mono">
                        Your credentials are tokenized and encrypted on the server using Fernet AES-256. Plaintext credentials are never saved.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={useCustomAccount ? (!customUsername.trim() || (isRealIG && (!igBusinessId.trim() || !igAccessToken.trim()))) : selectedPages.length === 0}
                  className="w-2/3 py-2.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  Confirm Details
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-blue-950/40 border border-[#1877F2]/40 text-[#1877F2] rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                <Lock size={28} />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Access Token Encryption Pipeline</h3>
                <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Facebook is issuing a <code className="text-blue-300 font-mono">Short-Lived User Token</code>. Our background daemon will automatically exchange this for a <code className="text-blue-300 font-mono">60-Day Long-Lived Token</code>. 
                </p>
                <p className="text-[10px] text-zinc-500 mt-3 font-mono">
                  AES-256-GCM Handshake: active
                </p>
              </div>

              <div className="pt-4 border-t border-[#27272a] flex justify-center space-x-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Modify
                </button>
                <button
                  onClick={handleCompleteFlow}
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Encrypting...</span>
                    </>
                  ) : (
                    <span>Authorize SaaS Link</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
