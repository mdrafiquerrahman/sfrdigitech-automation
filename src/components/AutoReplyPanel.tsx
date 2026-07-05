import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Sliders, 
  HelpCircle,
  Clock,
  User,
  CheckCircle,
  ArrowRight,
  Info,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { AutoReplyRule, InstagramMessage, InstagramAccount } from "../types";

interface AutoReplyPanelProps {
  accounts: InstagramAccount[];
}

export default function AutoReplyPanel({ accounts }: AutoReplyPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"rules" | "simulator" | "integration">("rules");
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  
  // Real integration metadata
  const [appPublicUrl, setAppPublicUrl] = useState("");
  const [copiedField, setCopiedField] = useState<"callback" | "token" | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeResult, setSubscribeResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);

  const handleRegisterWebhook = async (accountId: string) => {
    setSubscribing(true);
    setSubscribeResult(null);
    try {
      const res = await fetch("/api/instagram/subscribe-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId })
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribeResult({ success: true, message: data.message || "Successfully subscribed to Meta webhooks!" });
      } else {
        setSubscribeResult({ success: false, error: data.error || "Failed to register webhook subscription." });
      }
    } catch (err: any) {
      setSubscribeResult({ success: false, error: err.message || "Failed to contact local server." });
    } finally {
      setSubscribing(false);
    }
  };

  // New Rule Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [ruleTriggerType, setRuleTriggerType] = useState<"keyword" | "always">("keyword");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleReplyType, setRuleReplyType] = useState<"static" | "ai">("static");
  const [ruleStaticText, setRuleStaticText] = useState("");
  const [ruleAiInstruction, setRuleAiInstruction] = useState("");

  // Simulator Form State
  const [simSender, setSimSender] = useState("insta_follower");
  const [simMessage, setSimMessage] = useState("");

  const presetMessages = [
    { label: "Price inquiry", text: "Hey! How much is your Pro pricing package?" },
    { label: "Technical support", text: "My Instagram link is broken. I keep getting glitch logs." },
    { label: "Collaboration proposal", text: "Hi, I am interested in partnership. Can we collaborate?" },
    { label: "General Greeting", text: "Hello there! Is this automatic response active?" }
  ];

  const isJson = (res: Response) => {
    const ct = res.headers.get("content-type");
    return ct ? ct.includes("application/json") : false;
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/autoreply/messages");
      if (res.ok && isJson(res)) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to poll messages:", err);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, settingsRes] = await Promise.all([
        fetch("/api/autoreply/rules"),
        fetch("/api/bot/settings")
      ]);
      if (rulesRes.ok && isJson(rulesRes)) setRules(await rulesRes.json());
      if (settingsRes.ok && isJson(settingsRes)) {
        const settings = await settingsRes.json();
        setAppPublicUrl(settings.appPublicUrl || window.location.origin);
      } else {
        setAppPublicUrl(window.location.origin);
      }
      await fetchMessages();
    } catch (err) {
      console.error("Failed to load auto-reply data:", err);
      setAppPublicUrl(window.location.origin);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll new simulated DMs every 5 seconds to keep sandbox updated in real-time
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Rule Status
  const handleToggleRule = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch(`/api/autoreply/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      if (res.ok) {
        setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  // Add Rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ruleTriggerType === "keyword" && !ruleKeywords.trim()) return;
    if (ruleReplyType === "static" && !ruleStaticText.trim()) return;
    if (ruleReplyType === "ai" && !ruleAiInstruction.trim()) return;

    try {
      const res = await fetch("/api/autoreply/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: ruleTriggerType,
          keywords: ruleTriggerType === "keyword" 
            ? ruleKeywords.split(",").map(k => k.trim()).filter(Boolean) 
            : [],
          replyType: ruleReplyType,
          staticReplyText: ruleReplyType === "static" ? ruleStaticText : "",
          aiPromptInstruction: ruleReplyType === "ai" ? ruleAiInstruction : "",
          isActive: true
        })
      });

      if (res.ok) {
        const newRule = await res.json();
        setRules([newRule, ...rules]);
        // Reset form
        setRuleKeywords("");
        setRuleStaticText("");
        setRuleAiInstruction("");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Failed to save rule:", err);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this auto-reply rule?")) return;
    try {
      const res = await fetch(`/api/autoreply/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  // Simulate Message
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim() || !simSender.trim()) return;

    setSimulating(true);
    try {
      const res = await fetch("/api/autoreply/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: simSender.replace("@", "").trim(),
          messageText: simMessage,
          isComment: false
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        setSimMessage("");
      }
    } catch (err) {
      console.error("Failed to simulate message:", err);
    } finally {
      setSimulating(false);
    }
  };

  // Clear Messages
  const handleClearMessages = async () => {
    if (!confirm("Are you sure you want to clear simulated conversation history?")) return;
    try {
      const res = await fetch("/api/autoreply/clear-messages", { method: "POST" });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to clear messages:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-[#e3ded5] pb-5">
        <h2 className="text-2xl font-display font-medium tracking-tight text-stone-900">
          SFR DigiTech.Automation — Auto-Reply Bot
        </h2>
        <p className="text-xs text-stone-500 font-mono mt-1 uppercase tracking-wider">
          Automatic Reply Integration Engine
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e3ded5]">
        <button
          onClick={() => setActiveSubTab("rules")}
          className={`px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase font-bold border-b-2 transition ${
            activeSubTab === "rules"
              ? "border-[#9e4b2e] text-[#9e4b2e]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          Bot Rules Configuration
        </button>
        <button
          onClick={() => setActiveSubTab("simulator")}
          className={`px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase font-bold border-b-2 transition ${
            activeSubTab === "simulator"
              ? "border-[#9e4b2e] text-[#9e4b2e]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          Interactive DM Simulator & Sandbox
        </button>
        <button
          onClick={() => setActiveSubTab("integration")}
          className={`px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase font-bold border-b-2 transition ${
            activeSubTab === "integration"
              ? "border-[#9e4b2e] text-[#9e4b2e]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          Real Webhook Guide
        </button>
      </div>

      {/* Physical webhook status banner */}
      {(() => {
        const connectedLoginAcc = accounts.find(
          acc => acc.isConnected && acc.accessToken?.toUpperCase().startsWith("IGAA")
        );
        if (!connectedLoginAcc) return null;
        return (
          <div className="mt-6 bg-[#f7f5f0] border border-[#d5ced1] p-4 rounded-2xl flex items-start space-x-3 text-[#524a3e] shadow-sm">
            <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
            <div className="text-xs space-y-1">
              <p className="font-bold font-mono uppercase tracking-wider text-emerald-800 text-[10px] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                Live Physical Auto-Reply Activated
              </p>
              <p className="leading-relaxed">
                Your account <strong>@{connectedLoginAcc.username}</strong> is fully connected using an Instagram Graph API Token (<code className="bg-stone-200/60 px-1 rounded font-mono">IGAAV...</code>).
                We will automatically monitor incoming physical webhook events for real direct messages (DMs) and comments, and immediately issue automatic replies based on your configured rules.
              </p>
              <p className="leading-relaxed text-[11px] text-stone-600">
                ⚡ <strong>Testing:</strong> You can also use the <strong>Interactive DM Simulator & Sandbox</strong> tab below to test your static and AI-powered reply rules instantly in a sandboxed environment! Live webhook logs will appear in the <strong>System Logs</strong> on your Dashboard.
              </p>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw className="animate-spin text-stone-400 mx-auto mb-2" size={24} />
          <span className="text-xs text-stone-500 font-mono">Synchronizing rules with Meta database...</span>
        </div>
      ) : activeSubTab === "rules" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Rules List (Left side - Col span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-widest">
                Active Rules ({rules.length})
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-1.5 bg-[#9e4b2e] hover:bg-[#863e24] text-white text-[10px] font-mono tracking-widest uppercase rounded-lg transition shadow-sm flex items-center space-x-1.5"
              >
                <Plus size={12} />
                <span>{showAddForm ? "Hide Form" : "Create New Rule"}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddRule} className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-4 shadow-sm">
                <div className="border-b border-[#f2efe7] pb-3 mb-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#9e4b2e]">
                    Define Auto-Reply Trigger
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                      Trigger Type
                    </label>
                    <select
                      value={ruleTriggerType}
                      onChange={(e: any) => setRuleTriggerType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans"
                    >
                      <option value="keyword">Keyword Matching</option>
                      <option value="always">Always Reply (Fallback)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                      Response Engine
                    </label>
                    <select
                      value={ruleReplyType}
                      onChange={(e: any) => setRuleReplyType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans"
                    >
                      <option value="static">Static Custom Reply</option>
                      <option value="ai">Gemini AI Smart Reply ✦</option>
                    </select>
                  </div>
                </div>

                {ruleTriggerType === "keyword" && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                      Keywords (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. price, cost, how much, pricing, package"
                      value={ruleKeywords}
                      onChange={(e) => setRuleKeywords(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-mono placeholder:text-stone-300"
                    />
                    <span className="text-[9px] text-stone-400 font-sans mt-1 block">
                      The bot will reply automatically when follower messages contain any of these keywords.
                    </span>
                  </div>
                )}

                {ruleReplyType === "static" ? (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                      Static Custom Reply Text
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write your automated response here..."
                      value={ruleStaticText}
                      onChange={(e) => setRuleStaticText(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans placeholder:text-stone-300"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500">
                        Gemini AI Brain Instructions
                      </label>
                      <Sparkles size={11} className="text-[#9e4b2e] animate-pulse" />
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Give Gemini instructions: e.g., 'Draft a warm, polite response explaining that our pro tier costs $49/mo. Include emojis and ask them if they would like to sign up.'"
                      value={ruleAiInstruction}
                      onChange={(e) => setRuleAiInstruction(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans placeholder:text-stone-300"
                    />
                    <span className="text-[9px] text-stone-400 font-sans mt-1 block">
                      Gemini will generate a unique, contextually flawless response based on these instructions and the specific customer's message text.
                    </span>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-mono uppercase hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#9e4b2e] text-white rounded-lg text-[10px] font-mono uppercase tracking-widest font-bold hover:bg-[#863e24] transition"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            )}

            {rules.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e3ded5] py-12 text-center rounded-2xl">
                <Sliders className="text-stone-300 mx-auto mb-2" size={32} />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600">No Rules Found</h4>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto mt-1 font-sans">
                  You haven't defined any automatic reply rules yet. Click "Create New Rule" above to configure your bot.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition duration-150 ${
                      rule.isActive ? "border-[#e3ded5]" : "border-stone-200 opacity-75"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        {/* Title Badges */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {rule.triggerType === "keyword" ? (
                            <span className="px-2 py-0.5 bg-[#f5eae4] text-[#9e4b2e] text-[9px] font-mono uppercase tracking-wider rounded-md font-bold">
                              Keyword Match
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-mono uppercase tracking-wider rounded-md font-bold">
                              Always Fallback
                            </span>
                          )}

                          {rule.replyType === "ai" ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-mono uppercase tracking-wider rounded-md font-bold flex items-center space-x-1">
                              <Sparkles size={8} />
                              <span>Gemini AI Brain</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-mono uppercase tracking-wider rounded-md font-bold">
                              Static Text Response
                            </span>
                          )}

                          <span className="text-[9px] text-stone-400 font-mono">
                            Created: {new Date(rule.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Keyword list */}
                        {rule.triggerType === "keyword" && (
                          <div className="mt-3">
                            <span className="text-[10px] text-stone-400 font-mono uppercase">Triggers: </span>
                            <div className="inline-flex flex-wrap gap-1 mt-1 ml-1 align-middle">
                              {rule.keywords.map((kw, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[9px] font-mono text-stone-600">
                                  "{kw}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Content display */}
                        <div className="mt-3.5 bg-stone-50 rounded-xl p-3.5 border border-[#f2efe7]">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
                            {rule.replyType === "ai" ? "Gemini Guidelines" : "Response Template"}
                          </span>
                          <p className="text-xs font-sans text-stone-800 leading-relaxed italic">
                            "{rule.replyType === "ai" ? rule.aiPromptInstruction : rule.staticReplyText}"
                          </p>
                        </div>
                      </div>

                      {/* Action controllers */}
                      <div className="flex items-center space-x-3 ml-4">
                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className="text-stone-500 hover:text-stone-800 transition"
                          title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                        >
                          {rule.isActive ? (
                            <ToggleRight size={24} className="text-[#9e4b2e]" />
                          ) : (
                            <ToggleLeft size={24} className="text-stone-300" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-stone-300 hover:text-red-600 transition"
                          title="Delete Rule"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guide Sidebar (Right side - Col span 1) */}
          <div className="bg-[#f5eae4]/40 border border-[#e3ded5] p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-800 flex items-center space-x-2">
              <Info size={14} className="text-[#9e4b2e]" />
              <span>How Auto-Reply Works</span>
            </h4>
            <div className="space-y-3.5 text-xs text-stone-600 font-sans leading-relaxed">
              <p>
                SFR DigiTech's automated reply integration monitors direct messages and comments on your Instagram accounts.
              </p>
              <div>
                <span className="font-bold text-stone-800 block">1. Keyword Priority Matching:</span>
                Whenever a message arrives, the bot searches for matches in active <strong>Keyword Match</strong> rules.
              </div>
              <div>
                <span className="font-bold text-stone-800 block">2. Always-On Fallback:</span>
                If no keyword is matched, the bot falls back to any active <strong>Always Fallback</strong> rule.
              </div>
              <div>
                <span className="font-bold text-stone-800 block">3. Gemini AI Smart replies:</span>
                By selecting <strong>Gemini AI Brain</strong>, the system doesn't just reply with canned answers. It crafts personalized, dynamic, and polite responses following your specific guidelines in real-time.
              </div>
              <div className="bg-[#9e4b2e]/10 p-3 rounded-xl border border-[#9e4b2e]/20 text-[11px] text-[#9e4b2e]">
                <strong className="block mb-1 font-mono tracking-wider uppercase text-[9px]">Simulator Sandbox Note:</strong>
                Switch tabs to the <strong>Interactive DM Simulator & Sandbox</strong> to safely test your auto-reply triggers!
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === "simulator" ? (
        /* Simulator Sandbox */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Simulator Inputs (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleSimulate} className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-4 shadow-sm">
              <div className="border-b border-[#f2efe7] pb-3 mb-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#9e4b2e] flex items-center space-x-2">
                  <Sliders size={13} />
                  <span>Configure Simulated Message</span>
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Follower Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-stone-400">@</span>
                  <input
                    type="text"
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-mono"
                    placeholder="travel_enthusiast"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Message Presets (Click to Load)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presetMessages.map((pm, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSimMessage(pm.text)}
                      className="p-2 border border-dashed border-[#e3ded5] hover:border-[#9e4b2e] text-left rounded-xl transition cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-stone-700 block">{pm.label}</span>
                      <span className="text-[9px] text-stone-400 truncate block mt-0.5 font-sans">"{pm.text}"</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Custom Message Content
                </label>
                <textarea
                  rows={4}
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans placeholder:text-stone-300"
                  placeholder="Write whatever you want to simulate sending..."
                />
              </div>

              <button
                type="submit"
                disabled={simulating || !simMessage.trim()}
                className="w-full py-2.5 bg-[#9e4b2e] hover:bg-[#863e24] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-[10px] font-mono tracking-widest uppercase font-bold rounded-xl transition flex items-center justify-center space-x-2"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="animate-spin" size={12} />
                    <span>Processing Gemini Brain...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Simulate Incoming DM</span>
                  </>
                )}
              </button>
            </form>

            {/* Clear History Card */}
            <div className="bg-[#f5eae4]/20 border border-[#e3ded5] p-4 rounded-2xl flex justify-between items-center">
              <div className="space-y-0.5">
                <h5 className="text-[10px] font-mono font-bold uppercase text-stone-700">Sandbox Logs</h5>
                <p className="text-[10px] text-stone-400 font-sans">Wipe conversation history logs securely from storage.</p>
              </div>
              <button
                onClick={handleClearMessages}
                className="px-3 py-1.5 border border-[#e3ded5] text-stone-500 hover:text-red-600 hover:border-red-200 rounded-lg text-[9px] font-mono uppercase tracking-widest transition"
              >
                Clear Chats
              </button>
            </div>
          </div>

          {/* DM Chat mockup (Col span 7) */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-[#e3ded5] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[520px]">
              {/* Instagram App Chat Header */}
              <div className="bg-[#faf8f4] border-b border-[#e3ded5] px-4 py-3.5 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <User size={14} className="text-stone-600" />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">Instagram Sandbox Direct</h5>
                    <span className="text-[9px] text-stone-400 font-mono tracking-wide">Live Auto-Responder Simulator</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider">Bot Active</span>
                </div>
              </div>

              {/* Chat bubble body container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#faf8f4]/30">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-75 py-12">
                    <MessageSquare size={36} className="text-stone-300 mb-2" />
                    <h6 className="text-xs font-mono font-bold uppercase text-stone-600">No Simulation Active</h6>
                    <p className="text-[11px] text-stone-400 max-w-xs mt-1 font-sans">
                      Select or type an incoming follower message on the left, then click send to see the AI response instantly.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-3">
                      {/* Follower message (Received) */}
                      <div className="flex items-end space-x-2 max-w-[85%]">
                        <div className="w-6 h-6 rounded-full bg-stone-200 border border-[#e3ded5] flex items-center justify-center text-[10px] font-bold text-stone-600">
                          {msg.senderUsername[0].toUpperCase()}
                        </div>
                        <div className="bg-[#f2efe7] border border-[#e3ded5] text-stone-800 px-3.5 py-2.5 rounded-2xl rounded-bl-none text-xs leading-relaxed font-sans shadow-sm">
                          <div className="text-[8px] font-mono text-stone-400 uppercase tracking-wider mb-1">
                            @{msg.senderUsername}
                          </div>
                          {msg.messageText}
                        </div>
                      </div>

                      {/* Bot reply (Sent) */}
                      {msg.replySent && (
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-end justify-end space-x-2 max-w-[85%] self-end">
                            <div className="bg-[#9e4b2e] text-white px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs leading-relaxed font-sans shadow-sm text-right self-end">
                              <div className="flex items-center justify-end space-x-1.5 text-[8px] font-mono text-orange-200 uppercase tracking-widest mb-1">
                                {msg.replyType === "ai" && (
                                  <>
                                    <Sparkles size={8} />
                                    <span>Gemini Reply</span>
                                  </>
                                )}
                                {msg.replyType === "static" && (
                                  <span>Static Rule Reply</span>
                                )}
                                {msg.replyType === "none" && (
                                  <span>Fallback Default</span>
                                )}
                              </div>
                              {msg.replySent}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#9e4b2e] flex items-center justify-center text-[9px] font-bold text-white shadow-sm font-mono">
                              ig
                            </div>
                          </div>
                          {/* Subtext info matched rule */}
                          <div className="text-[8px] font-mono text-stone-400 mr-8 flex items-center space-x-1">
                            <Clock size={8} />
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.matchedRuleId && (
                              <>
                                <span>•</span>
                                <span className="text-[#9e4b2e]">Matched {msg.matchedRuleId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Real Webhook Integration Guide */
        <div className="space-y-8 animate-fadeIn">
          {/* Header Description */}
          <div className="bg-[#FAF8F5] border border-[#e3ded5] p-6 rounded-2xl">
            <h3 className="text-lg font-display font-medium text-[#9e4b2e] flex items-center space-x-2">
              <Sparkles size={18} />
              <span>Real Meta Developer Webhook Connection Hub</span>
            </h3>
            <p className="text-xs text-stone-600 font-sans mt-1.5 leading-relaxed">
              Connect your actual Instagram Business Account to the SFR DigiTech auto-reply automation brain. 
              Our container runs on a real public address, enabling live, bidirectional message delivery and comment resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Your Connection Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-4 shadow-sm">
                <div className="border-b border-[#f2efe7] pb-3 mb-1">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-700">
                    Your Webhook Endpoints
                  </h4>
                </div>

                {/* Callback URL */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">
                    Webhook Callback URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={`${(appPublicUrl || "").replace("ais-dev-", "ais-pre-")}/api/webhook/instagram`}
                      className="flex-1 bg-stone-50 border border-[#e3ded5] rounded-lg px-3 py-2 text-xs text-stone-700 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const publicUrl = `${(appPublicUrl || "").replace("ais-dev-", "ais-pre-")}/api/webhook/instagram`;
                        navigator.clipboard.writeText(publicUrl);
                        setCopiedField("callback");
                        setTimeout(() => setCopiedField(null), 2500);
                      }}
                      className="p-2.5 bg-[#f5f3ef] hover:bg-[#eadecc] rounded-lg border border-[#e3ded5] text-stone-600 transition flex items-center justify-center cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedField === "callback" ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Verify Token */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">
                    Verify Token
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value="sfr_digitech_verify_token"
                      className="flex-1 bg-stone-50 border border-[#e3ded5] rounded-lg px-3 py-2 text-xs text-stone-700 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("sfr_digitech_verify_token");
                        setCopiedField("token");
                        setTimeout(() => setCopiedField(null), 2500);
                      }}
                      className="p-2.5 bg-[#f5f3ef] hover:bg-[#eadecc] rounded-lg border border-[#e3ded5] text-stone-600 transition flex items-center justify-center cursor-pointer"
                      title="Copy Token"
                    >
                      {copiedField === "token" ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Webhook Connection Requisite Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 mt-2">
                  <div className="flex items-center space-x-1.5 text-amber-800 font-mono text-[9px] font-bold uppercase tracking-wider">
                    <span>⚠️ CRITICAL CONNECTION REQUIREMENT</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Meta's verification servers require a completely public URL. You <strong>MUST</strong> use the <strong>Shared App URL</strong> containing <code>ais-pre-</code> shown above. Do not use your private development URL (which contains <code>ais-dev-</code>), as Meta's requests will be blocked by authorization checks.
                  </p>
                </div>

                {/* Webhook events subscription */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">
                    Required Webhook Field Subscriptions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-stone-50 border border-[#e3ded5] px-3 py-2 rounded-lg text-center font-mono text-[10px] text-[#9e4b2e] font-bold">
                      messages
                    </div>
                    <div className="bg-stone-50 border border-[#e3ded5] px-3 py-2 rounded-lg text-center font-mono text-[10px] text-[#9e4b2e] font-bold">
                      comments
                    </div>
                  </div>
                </div>

                {/* Webhook Subscription Engine */}
                {(() => {
                  const connectedLoginAcc = accounts.find(
                    acc => acc.isConnected && acc.accessToken && acc.accessToken.length > 30 && !acc.accessToken.includes("mock")
                  );
                  if (!connectedLoginAcc) return null;
                  return (
                    <div className="border-t border-[#f2efe7] pt-4 mt-2 space-y-3">
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">
                        Webhook Subscription Engine
                      </label>
                      <button
                        disabled={subscribing}
                        onClick={() => handleRegisterWebhook(connectedLoginAcc.id)}
                        className="w-full py-2 bg-[#9e4b2e] hover:bg-[#863e24] disabled:bg-stone-300 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                      >
                        {subscribing ? (
                          <span>Registering with Meta...</span>
                        ) : (
                          <span>Trigger Meta Webhook Subscription</span>
                        )}
                      </button>
                      {subscribeResult && (
                        <div className={`p-3 rounded-lg text-xs leading-relaxed font-mono ${
                          subscribeResult.success 
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}>
                          {subscribeResult.success ? (
                            <div className="space-y-1">
                              <span className="font-bold text-emerald-950 block">✔ SUCCESS</span>
                              <p className="text-[10px] text-emerald-700">{subscribeResult.message}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="font-bold text-rose-950 block">❌ SUBSCRIPTION ALERT</span>
                              <p className="text-[10px] text-rose-700">{subscribeResult.error}</p>
                              <p className="text-[9px] text-stone-500 mt-1.5 leading-normal">
                                Tip: Instagram direct message webhooks require a Meta App to be configured. If you are connected via an Instagram User login, ensure you have subscribed your corresponding Facebook Page manually inside the Webhooks settings of your Meta Developer App, and toggled 'Allow Access to Messages' in the Instagram Mobile App Settings.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Troubleshooting Card */}
              <div className="bg-amber-50/60 border border-amber-200/70 p-5 rounded-2xl space-y-3">
                <h5 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-800 flex items-center space-x-2">
                  <ShieldAlert size={14} />
                  <span>Not Replying to Real Users?</span>
                </h5>
                <ul className="text-[11px] text-amber-900/80 space-y-2 leading-relaxed list-disc list-inside">
                  <li>
                    <strong>Access Token Verification:</strong> Check if the page token in your <strong>Settings Panel</strong> is valid and possesses the <code>instagram_manage_messages</code> permission.
                  </li>
                  <li>
                    <strong>Application Mode:</strong> If your Meta App is still in <strong>"Development"</strong> mode, only developers/testers added to your Meta app can receive responses. Switch your Meta App to <strong>"Live Mode"</strong> to reply to general followers.
                  </li>
                  <li>
                    <strong>Check Rules Match:</strong> The bot only replies if incoming messages match active keyword filters, or if you have set an <strong>Always Fallback</strong> rule.
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Meta Integration Checklist */}
            <div className="lg:col-span-7 bg-white border border-[#e3ded5] p-6 rounded-2xl shadow-sm space-y-6">
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-700 border-b border-[#f2efe7] pb-3">
                Step-by-Step Meta Setup Tutorial
              </h4>

              <div className="space-y-5">
                {/* Step 1 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#9e4b2e]/10 text-[#9e4b2e] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-stone-800 font-mono uppercase tracking-wider">
                      Create Meta Developer App
                    </h5>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-[#9e4b2e] underline hover:text-[#863e24] inline-flex items-center space-x-1"><span>Meta for Developers portal</span><ExternalLink size={10} className="ml-0.5 inline" /></a> and create a new App. Select <strong>"Other"</strong> &gt; <strong>"Business"</strong> as the app type to ensure access to Instagram APIs.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#9e4b2e]/10 text-[#9e4b2e] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-stone-800 font-mono uppercase tracking-wider">
                      Add Instagram Graph API Product
                    </h5>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      In your Developer App Dashboard, click <strong>Set Up</strong> under the <strong>Instagram Graph API</strong> product card. This enables permission scopes for professional accounts.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#9e4b2e]/10 text-[#9e4b2e] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-stone-800 font-mono uppercase tracking-wider">
                      Configure Webhook Callback & Fields
                    </h5>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      On the sidebar, go to <strong>Webhooks</strong>. Select <strong>Instagram</strong> from the dropdown menu and select <strong>Subscribe to this object</strong>. 
                      Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> listed on the left panel. Click <strong>Verify and Save</strong>.
                      Once verified, subscribe to <code>messages</code> (for DMs) and <code>comments</code> (for Post Comment auto-replies).
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#9e4b2e]/10 text-[#9e4b2e] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-stone-800 font-mono uppercase tracking-wider">
                      Connect Page Access Token in Settings
                    </h5>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      To allow the SFR DigiTech auto-reply engine to write back replies automatically, copy your generated **Page Access Token** from Meta, open the <strong>Settings</strong> panel inside this app, and paste it into your active connected account's Token field.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
