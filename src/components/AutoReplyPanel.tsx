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
  ShieldAlert,
  Users,
  Mail,
  Phone,
  Layers,
  Zap
} from "lucide-react";
import { AutoReplyRule, InstagramMessage, InstagramAccount, CapturedLead } from "../types";

interface AutoReplyPanelProps {
  accounts: InstagramAccount[];
}

export default function AutoReplyPanel({ accounts }: AutoReplyPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"rules" | "simulator" | "leads" | "integration" | "diagnostics">("rules");
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [leads, setLeads] = useState<CapturedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Live Diagnostics States
  const [diagnostics, setDiagnostics] = useState<{
    lastWebhookPayload: any;
    lastIncomingMessage: any;
    lastReplyAttempt: any;
    lastMetaApiError: any;
    lastGeminiApiError?: any;
    settings: any;
    accounts: any[];
  } | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch("/api/bot/diagnostics");
      if (res.ok && isJson(res)) {
        setDiagnostics(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch diagnostics:", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "diagnostics") {
      fetchDiagnostics();
    }
  }, [activeSubTab]);
  
  // Real integration metadata
  const [appPublicUrl, setAppPublicUrl] = useState("");
  const [verifyToken, setVerifyToken] = useState("meta_verify_token_example_123");
  const [copiedField, setCopiedField] = useState<"callback" | "token" | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeResult, setSubscribeResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);

  // Custom Webhook URL States
  const [customWebhookUrl, setCustomWebhookUrl] = useState("");
  const [isCustomWebhookEnabled, setIsCustomWebhookEnabled] = useState(false);
  const [isSavingCustomWebhook, setIsSavingCustomWebhook] = useState(false);
  const [customWebhookInput, setCustomWebhookInput] = useState("");

  // ManyChat Branding States
  const [manychatBranding, setManychatBranding] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const handleToggleBranding = async (enabled: boolean) => {
    setIsSavingBranding(true);
    try {
      const res = await fetch("/api/bot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manychatBranding: enabled })
      });
      if (res.ok) {
        const settings = await res.json();
        setManychatBranding(!!settings.manychatBranding);
      }
    } catch (err) {
      console.error("Failed to save branding settings:", err);
    } finally {
      setIsSavingBranding(false);
    }
  };

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

  // ManyChat Rule Enhancements
  const [ruleDelaySeconds, setRuleDelaySeconds] = useState<number>(0);
  const [ruleButtonsInput, setRuleButtonsInput] = useState("");
  const [ruleCaptureLeadField, setRuleCaptureLeadField] = useState<"none" | "email" | "phone">("none");
  const [ruleCaptureSuccessText, setRuleCaptureSuccessText] = useState("");

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
      const [rulesRes, settingsRes, leadsRes] = await Promise.all([
        fetch("/api/autoreply/rules"),
        fetch("/api/bot/settings"),
        fetch("/api/autoreply/leads").catch(() => null)
      ]);
      if (rulesRes.ok && isJson(rulesRes)) setRules(await rulesRes.json());
      if (settingsRes.ok && isJson(settingsRes)) {
        const settings = await settingsRes.json();
        setAppPublicUrl(settings.appPublicUrl || window.location.origin);
        const cUrl = settings.customWebhookUrl || "";
        setCustomWebhookUrl(cUrl);
        setCustomWebhookInput(cUrl);
        setIsCustomWebhookEnabled(!!cUrl);
        if (settings.manychatBranding !== undefined) {
          setManychatBranding(!!settings.manychatBranding);
        }
        if (settings.verifyToken) {
          setVerifyToken(settings.verifyToken);
        }
      } else {
        setAppPublicUrl(window.location.origin);
      }
      if (leadsRes && leadsRes.ok && isJson(leadsRes)) {
        setLeads(await leadsRes.json());
      }
      await fetchMessages();
    } catch (err) {
      console.error("Failed to load auto-reply data:", err);
      setAppPublicUrl(window.location.origin);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/autoreply/leads");
      if (res.ok && isJson(res)) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead from CRM?")) return;
    try {
      const res = await fetch(`/api/autoreply/leads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLeads(leads.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const handleClearLeads = async () => {
    if (!confirm("Are you sure you want to wipe all captured leads? This is irreversible!")) return;
    try {
      const res = await fetch("/api/autoreply/clear-leads", { method: "POST" });
      if (res.ok) {
        setLeads([]);
      }
    } catch (err) {
      console.error("Failed to clear CRM leads:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll new simulated DMs every 5 seconds to keep sandbox updated in real-time
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save custom webhook configuration
  const handleSaveCustomWebhook = async (enabled: boolean, value: string) => {
    setIsSavingCustomWebhook(true);
    try {
      const urlToSave = enabled ? value.trim() : "";
      const res = await fetch("/api/bot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customWebhookUrl: urlToSave })
      });
      if (res.ok) {
        const settings = await res.json();
        const updatedUrl = settings.customWebhookUrl || "";
        setCustomWebhookUrl(updatedUrl);
        setCustomWebhookInput(updatedUrl);
        setIsCustomWebhookEnabled(!!updatedUrl);
      }
    } catch (err) {
      console.error("Failed to save custom webhook settings:", err);
    } finally {
      setIsSavingCustomWebhook(false);
    }
  };

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

    // Parse comma-separated buttons into list of triggers
    const buttonsParsed = ruleButtonsInput.trim()
      ? ruleButtonsInput.split(",").map(b => {
          const label = b.trim();
          return { label, triggerKeyword: label.toLowerCase() };
        }).filter(item => item.label.length > 0)
      : undefined;

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
          isActive: true,
          delaySeconds: ruleDelaySeconds > 0 ? Number(ruleDelaySeconds) : undefined,
          buttons: buttonsParsed,
          captureLeadField: ruleCaptureLeadField,
          captureSuccessText: ruleCaptureLeadField !== "none" ? ruleCaptureSuccessText : ""
        })
      });

      if (res.ok) {
        const newRule = await res.json();
        setRules([newRule, ...rules]);
        // Reset form
        setRuleKeywords("");
        setRuleStaticText("");
        setRuleAiInstruction("");
        setRuleDelaySeconds(0);
        setRuleButtonsInput("");
        setRuleCaptureLeadField("none");
        setRuleCaptureSuccessText("");
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

  const [isBotTyping, setIsBotTyping] = useState(false);

  // Trigger button click simulation
  const handleTriggerButtonSimulate = async (label: string) => {
    if (simulating || isBotTyping) return;
    setSimulating(true);
    try {
      const res = await fetch("/api/autoreply/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: simSender.replace("@", "").trim(),
          messageText: label,
          isComment: false
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        
        // Find if rule has delay
        const matchedRule = rules.find(r => r.id === newMessage.matchedRuleId);
        const delaySec = matchedRule?.delaySeconds || 0;

        if (delaySec > 0) {
          // 1. Append user's message only first
          const userOnlyMsg: InstagramMessage = {
            id: "temp_" + Math.random().toString(36).substring(2, 11),
            senderUsername: simSender.replace("@", "").trim(),
            messageText: label,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, userOnlyMsg]);
          
          // 2. Trigger typing delay
          setIsBotTyping(true);
          await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
          setIsBotTyping(false);

          // 3. Replace temp with final
          setMessages(prev => prev.filter(m => m.id !== userOnlyMsg.id).concat(newMessage));
        } else {
          setMessages(prev => [...prev, newMessage]);
        }
        
        setSimMessage("");
        fetchLeads(); // Update CRM
      }
    } catch (err) {
      console.error("Failed to simulate button:", err);
    } finally {
      setSimulating(false);
    }
  };

  // Simulate Message
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim() || !simSender.trim() || simulating || isBotTyping) return;

    const messageText = simMessage;
    setSimulating(true);
    try {
      const res = await fetch("/api/autoreply/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: simSender.replace("@", "").trim(),
          messageText: messageText,
          isComment: false
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        
        // Find if rule has delay
        const matchedRule = rules.find(r => r.id === newMessage.matchedRuleId);
        const delaySec = matchedRule?.delaySeconds || 0;

        if (delaySec > 0) {
          // 1. Append user's message only first
          const userOnlyMsg: InstagramMessage = {
            id: "temp_" + Math.random().toString(36).substring(2, 11),
            senderUsername: simSender.replace("@", "").trim(),
            messageText: messageText,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, userOnlyMsg]);
          
          // 2. Trigger typing delay
          setIsBotTyping(true);
          await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
          setIsBotTyping(false);

          // 3. Replace temp with final
          setMessages(prev => prev.filter(m => m.id !== userOnlyMsg.id).concat(newMessage));
        } else {
          setMessages(prev => [...prev, newMessage]);
        }

        setSimMessage("");
        fetchLeads(); // Update CRM
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
          onClick={() => setActiveSubTab("leads")}
          className={`px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase font-bold border-b-2 transition ${
            activeSubTab === "leads"
              ? "border-[#9e4b2e] text-[#9e4b2e]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          ManyChat CRM Leads ({leads.length})
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
        <button
          onClick={() => setActiveSubTab("diagnostics")}
          className={`px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase font-bold border-b-2 transition ${
            activeSubTab === "diagnostics"
              ? "border-[#9e4b2e] text-[#9e4b2e]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          🔍 Webhook Diagnostics
        </button>
      </div>

      {/* Physical webhook status banner */}
      {(() => {
        const connectedLoginAcc = accounts.find(
          acc => acc.isConnected && 
                 acc.accessToken?.toUpperCase().startsWith("IGAA") && 
                 (!acc.messagingAccessToken || !acc.messagingAccessToken.toUpperCase().startsWith("EAA"))
        );
        if (!connectedLoginAcc) return null;
        return (
          <div className="mt-6 bg-[#fdf2f2] border border-[#f5c6cb] p-4 rounded-2xl flex items-start space-x-3 text-[#721c24] shadow-sm">
            <ShieldAlert className="text-[#dc3545] mt-0.5 shrink-0" size={18} />
            <div className="text-xs space-y-1">
              <p className="font-bold font-mono uppercase tracking-wider text-[#bd2130] text-[10px] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc3545] animate-pulse mr-1.5" />
                ⚠️ Direct Message Auto-Reply Warning
              </p>
              <p className="leading-relaxed">
                Your account <strong>@{connectedLoginAcc.username}</strong> is connected using an <strong>Instagram Basic Display Token</strong> (<code className="bg-[#f8d7da] px-1 rounded font-mono text-[#721c24]">IGAAV...</code>).
                While this token supports scheduling posts, Meta <strong>blocks</strong> basic tokens from receiving webhooks and sending direct message replies.
              </p>
              <p className="leading-relaxed text-[11px] text-[#856404] bg-[#fff3cd] border border-[#ffeeba] p-2 rounded-lg mt-2 font-mono">
                💡 <strong>To Enable Real DM Replies:</strong> You must connect an <strong>Instagram Business or Creator</strong> profile using a <strong>Facebook Page Access Token</strong> (starts with <code className="bg-[#fff px-1 rounded font-mono">EAA...</code>) via the Link Account flow.
              </p>
              <p className="leading-relaxed text-[11px] text-[#524a3e] mt-2">
                ⚡ <strong>Testing:</strong> In the meantime, you can use the <strong>Interactive DM Simulator & Sandbox</strong> tab below to test your static and AI-powered auto-reply rules instantly in our sandboxed environment!
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

                {/* ManyChat Delay & Interactive Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#f2efe7] pt-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1 flex items-center">
                      <Clock size={11} className="mr-1 text-stone-400" />
                      Typing Delay (Seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={ruleDelaySeconds}
                      onChange={(e) => setRuleDelaySeconds(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-mono"
                    />
                    <span className="text-[9px] text-stone-400 mt-0.5 block">
                      Delay bot response in sandbox to simulate human-like typing (0-10s).
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1 flex items-center">
                      <Layers size={11} className="mr-1 text-stone-400" />
                      Quick Reply Buttons (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Get Pricing, Book Demo, Contact"
                      value={ruleButtonsInput}
                      onChange={(e) => setRuleButtonsInput(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans placeholder:text-stone-300"
                    />
                    <span className="text-[9px] text-stone-400 mt-0.5 block">
                      Pills that followers can click. Clicking triggers keyword matching.
                    </span>
                  </div>
                </div>

                {/* ManyChat CRM Lead Capture */}
                <div className="border-t border-[#f2efe7] pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9e4b2e] flex items-center">
                      <Zap size={11} className="mr-1 text-[#9e4b2e]" />
                      ManyChat Lead Capture CRM Flow
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                        Input Field to Capture
                      </label>
                      <select
                        value={ruleCaptureLeadField}
                        onChange={(e: any) => setRuleCaptureLeadField(e.target.value)}
                        className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans"
                      >
                        <option value="none">No Capture (Standard Response)</option>
                        <option value="email">Email Address</option>
                        <option value="phone">Phone Number</option>
                      </select>
                      <span className="text-[9px] text-stone-400 mt-0.5 block">
                        Check if the response is a valid contact; automatically record in leads CRM.
                      </span>
                    </div>

                    {ruleCaptureLeadField !== "none" && (
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                          Success Confirmation Text
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Awesome, got your email! We sent you the files. 🚀"
                          value={ruleCaptureSuccessText}
                          onChange={(e) => setRuleCaptureSuccessText(e.target.value)}
                          className="w-full px-3 py-2 border border-[#e3ded5] rounded-xl text-xs font-sans placeholder:text-stone-300"
                        />
                        <span className="text-[9px] text-stone-400 mt-0.5 block">
                          The bot will reply with this once their info is securely saved to CRM.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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

                        {/* ManyChat Flow Enhancements badges */}
                        {(rule.delaySeconds || (rule.buttons && rule.buttons.length > 0) || (rule.captureLeadField && rule.captureLeadField !== "none")) && (
                          <div className="mt-3 flex flex-wrap gap-2 items-center">
                            {rule.delaySeconds && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-mono">
                                <Clock size={10} />
                                <span>{rule.delaySeconds}s Delay</span>
                              </span>
                            )}
                            
                            {rule.buttons && rule.buttons.length > 0 && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[9px] font-mono">
                                <Layers size={10} />
                                <span>{rule.buttons.length} Buttons</span>
                              </span>
                            )}

                            {rule.captureLeadField && rule.captureLeadField !== "none" && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-mono font-bold">
                                <Zap size={10} className="animate-pulse" />
                                <span>Capture {rule.captureLeadField.toUpperCase()}</span>
                              </span>
                            )}
                          </div>
                        )}
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

              {/* ManyChat Watermark Signature Toggle */}
              <div className="p-3 bg-stone-50 rounded-xl border border-[#e3ded5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center">
                    <Zap size={11} className="mr-1 text-[#9e4b2e]" />
                    ManyChat Branding Signature
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manychatBranding}
                      onChange={(e) => handleToggleBranding(e.target.checked)}
                      disabled={isSavingBranding}
                      className="rounded border-[#e3ded5] text-[#9e4b2e] focus:ring-[#9e4b2e] w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                    />
                  </label>
                </div>
                <p className="text-[9px] text-stone-400 font-sans leading-relaxed">
                  Sends an additional <strong>"Automation powered by @Manychat 🐙"</strong> message bubble alongside your automated replies, matching the official ManyChat free tier experience.
                </p>
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

                          {/* ManyChat branding signature watermark bubble */}
                          {msg.includeBranding && (
                            <div className="flex items-end justify-end space-x-2 max-w-[85%] self-end mt-1 animate-fadeIn">
                              <div className="bg-[#f5eae4] border border-[#f0ded5] text-[#9e4b2e] px-3 py-1.5 rounded-xl rounded-tr-none text-[10px] font-sans shadow-xs flex items-center space-x-1.5">
                                <span className="font-mono text-[9px] uppercase tracking-wider font-bold">ManyChat</span>
                                <span className="text-orange-300">|</span>
                                <span className="font-medium">Automation powered by @Manychat 🐙</span>
                              </div>
                              <div className="w-6 h-6 opacity-0" />
                            </div>
                          )}
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

                          {/* ManyChat Interactive Quick Reply Buttons */}
                          {msg.buttons && msg.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 justify-end mr-8 mt-1.5 mb-2">
                              {msg.buttons.map((btn, bidx) => (
                                <button
                                  key={bidx}
                                  type="button"
                                  onClick={() => handleTriggerButtonSimulate(btn.label)}
                                  className="px-3 py-1.5 bg-white border border-[#e3ded5] hover:border-[#9e4b2e] text-[#9e4b2e] hover:bg-orange-50 text-[10px] font-mono rounded-full transition shadow-xs cursor-pointer flex items-center space-x-1 font-bold"
                                >
                                  <Zap size={8} />
                                  <span>{btn.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Animated typing bubble */}
                {isBotTyping && (
                  <div className="flex items-end justify-end space-x-2 max-w-[85%] self-end mt-2 animate-pulse">
                    <div className="bg-[#9e4b2e] text-white px-4 py-2.5 rounded-2xl rounded-br-none text-xs leading-relaxed font-mono shadow-sm flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-orange-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-orange-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-orange-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="ml-1 text-[9px] uppercase tracking-widest text-orange-200 font-bold">Bot is typing...</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#9e4b2e] flex items-center justify-center text-[9px] font-bold text-white shadow-sm font-mono animate-spin">
                      ig
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === "leads" ? (
        /* ManyChat Captured Leads CRM Tab */
        <div className="space-y-6 animate-fadeIn">
          {/* CRM Header */}
          <div className="bg-[#FAF8F5] border border-[#e3ded5] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-medium text-[#9e4b2e] flex items-center space-x-2">
                <Users size={18} />
                <span>ManyChat Interactive Lead Capture CRM</span>
              </h3>
              <p className="text-xs text-stone-600 font-sans mt-1 leading-relaxed">
                Review and manage followers who triggered lead-capture rules and submitted their contact information (email or phone numbers) interactively.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={fetchLeads}
                disabled={loadingLeads}
                className="px-3 py-1.5 border border-[#e3ded5] text-stone-600 hover:bg-[#faf8f4] disabled:opacity-50 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center space-x-1"
              >
                <RefreshCw size={11} className={loadingLeads ? "animate-spin" : ""} />
                <span>Refresh CRM</span>
              </button>
              
              <button
                onClick={handleClearLeads}
                disabled={leads.length === 0}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 disabled:opacity-50 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center space-x-1"
              >
                <Trash2 size={11} />
                <span>Clear Leads</span>
              </button>
            </div>
          </div>

          {/* Leads Grid/Table */}
          {loadingLeads ? (
            <div className="py-20 text-center bg-white border border-[#e3ded5] rounded-2xl">
              <RefreshCw className="animate-spin text-stone-400 mx-auto mb-2" size={24} />
              <span className="text-xs text-stone-500 font-mono">Loading captured leads database...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white border border-dashed border-[#e3ded5] py-16 text-center rounded-2xl space-y-3">
              <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto border border-[#e3ded5]">
                <Users className="text-stone-300" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600">No Captured Leads</h4>
                <p className="text-[11px] text-stone-400 max-w-sm mx-auto font-sans leading-relaxed">
                  No followers have entered a lead capture flow yet. Go to the <strong>Rules Configuration</strong> tab, create a rule with "Email" or "Phone" capture enabled, and test it in the <strong>DM Simulator</strong>!
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#e3ded5] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#faf8f4] border-b border-[#e3ded5] text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                      <th className="py-3 px-4">Instagram Handle</th>
                      <th className="py-3 px-4">Captured Email</th>
                      <th className="py-3 px-4">Captured Phone</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2efe7] text-xs">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-stone-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#9e4b2e]">
                          @{lead.username}
                        </td>
                        <td className="py-3.5 px-4">
                          {lead.email ? (
                            <div className="flex items-center space-x-1.5">
                              <Mail size={12} className="text-stone-400 shrink-0" />
                              <span className="font-mono text-[11px] text-stone-800">{lead.email}</span>
                            </div>
                          ) : (
                            <span className="text-stone-300 italic">not captured</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {lead.phone ? (
                            <div className="flex items-center space-x-1.5">
                              <Phone size={12} className="text-stone-400 shrink-0" />
                              <span className="font-mono text-[11px] text-stone-800">{lead.phone}</span>
                            </div>
                          ) : (
                            <span className="text-stone-300 italic">not captured</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 text-[11px] font-mono">
                          {new Date(lead.lastInteracted).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-mono uppercase tracking-wider font-bold">
                            {lead.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1 text-stone-400 hover:text-red-600 transition"
                            title="Remove Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conceptual Flow Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-stone-50 border border-[#e3ded5] p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#f5eae4] text-[#9e4b2e] flex items-center justify-center font-mono font-bold text-xs">1</div>
              <h4 className="text-xs font-mono font-bold uppercase text-stone-700">Trigger Rule Matching</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                When a user sends a DM or triggers a keyword, the bot matches the corresponding rule. If that rule is set to capture a lead, the bot asks for their contact details.
              </p>
            </div>
            <div className="bg-stone-50 border border-[#e3ded5] p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#f5eae4] text-[#9e4b2e] flex items-center justify-center font-mono font-bold text-xs">2</div>
              <h4 className="text-xs font-mono font-bold uppercase text-stone-700">Automatic Extraction</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Our backend automatically parses the follower's reply using email and phone regex lookups to extract real, validated contact records securely.
              </p>
            </div>
            <div className="bg-stone-50 border border-[#e3ded5] p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#f5eae4] text-[#9e4b2e] flex items-center justify-center font-mono font-bold text-xs">3</div>
              <h4 className="text-xs font-mono font-bold uppercase text-stone-700">CRM Enrollment</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                The captured record is persisted in our database, appearing live in this CRM dashboard for immediate sales outreach or spreadsheet export.
              </p>
            </div>
          </div>
        </div>
      ) : activeSubTab === "integration" ? (
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">
                      Webhook Callback URL
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isCustomWebhookEnabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsCustomWebhookEnabled(checked);
                          if (!checked) {
                            handleSaveCustomWebhook(false, "");
                          }
                        }}
                        className="rounded border-[#e3ded5] text-[#bca280] focus:ring-[#bca280] w-3 h-3 cursor-pointer"
                      />
                      <span className="text-[10px] font-sans text-stone-600">Customize</span>
                    </label>
                  </div>

                  {isCustomWebhookEnabled ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={customWebhookInput}
                          onChange={(e) => setCustomWebhookInput(e.target.value)}
                          placeholder="e.g. https://your-domain.vercel.app/api/webhook/instagram"
                          className="flex-1 bg-stone-50 border border-[#e3ded5] rounded-lg px-3 py-2 text-xs text-stone-700 font-mono focus:outline-none focus:border-[#bca280] focus:ring-1 focus:ring-[#bca280]"
                        />
                        <button
                          onClick={() => handleSaveCustomWebhook(true, customWebhookInput)}
                          disabled={isSavingCustomWebhook}
                          className="px-3 py-2 bg-[#bca280] text-white hover:bg-[#a68c6a] rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
                        >
                          {isSavingCustomWebhook ? "Saving..." : "Save"}
                        </button>
                      </div>
                      {customWebhookUrl && (
                        <div className="flex items-center justify-between bg-[#f5f3ef] border border-[#e3ded5] rounded-lg px-3 py-1.5 text-[11px] text-stone-600">
                          <span className="font-mono truncate mr-2">{customWebhookUrl}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(customWebhookUrl);
                              setCopiedField("callback");
                              setTimeout(() => setCopiedField(null), 2500);
                            }}
                            className="text-stone-500 hover:text-stone-700 font-medium shrink-0 flex items-center space-x-1"
                            title="Copy Custom URL"
                          >
                            {copiedField === "callback" ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedField === "callback" ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )}
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
                      value={verifyToken}
                      className="flex-1 bg-stone-50 border border-[#e3ded5] rounded-lg px-3 py-2 text-xs text-stone-700 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(verifyToken);
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
                    <span>⚠️ GOOGLE AI STUDIO SECURITY WARNING</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Google AI Studio protects both <code>ais-dev-</code> and <code>ais-pre-</code> domains behind a cookie authentication gate. Because of this, Meta's external verification crawler receives a redirect (302) and <strong>cannot verify the ais-pre- URL</strong>.
                  </p>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    To connect a real production webhook, please check the <strong>"Customize"</strong> checkbox above and paste your public <strong>Vercel Webhook URL</strong> (e.g., <code>https://sfrwebhook.vercel.app/api/webhook/instagram</code>), which is fully public and verifies successfully.
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
                    acc => acc.isConnected && 
                           ((acc.accessToken && acc.accessToken.length > 30 && !acc.accessToken.includes("mock")) ||
                            (acc.messagingAccessToken && acc.messagingAccessToken.length > 30 && !acc.messagingAccessToken.includes("mock")))
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
      ) : (
        /* Live Webhook Diagnostics Control Center */
        <div className="space-y-8 animate-fadeIn">
          {/* Header Description */}
          <div className="bg-[#FAF8F5] border border-[#e3ded5] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-medium text-[#9e4b2e] flex items-center space-x-2">
                <RefreshCw size={18} className={loadingDiagnostics ? "animate-spin text-[#9e4b2e]" : "text-[#9e4b2e]"} />
                <span>Live Webhook Diagnostics Control Center</span>
              </h3>
              <p className="text-xs text-stone-600 font-sans mt-1.5 leading-relaxed">
                Review raw incoming payloads, check message processing paths, evaluate token scopes, and debug Meta API error responses in real-time.
              </p>
            </div>
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiagnostics}
              className="px-4 py-2 bg-[#9e4b2e] hover:bg-[#863e24] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw size={12} className={loadingDiagnostics ? "animate-spin" : ""} />
              <span>{loadingDiagnostics ? "Refreshing..." : "Refresh Diagnostic"}</span>
            </button>
          </div>

          {/* Connection Checkup */}
          {(() => {
            const connectedAcc = diagnostics?.accounts?.find(acc => acc.isConnected);
            const token = connectedAcc?.messagingAccessToken || connectedAcc?.accessToken || "";
            const isBasicToken = token.trim().toUpperCase().startsWith("IGAA");
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border ${isBasicToken ? "bg-red-50/50 border-red-200" : "bg-emerald-50/50 border-emerald-200"}`}>
                  <h4 className={`text-xs font-mono font-bold uppercase tracking-widest ${isBasicToken ? "text-red-800" : "text-emerald-800"}`}>
                    Meta Access Token Authorization
                  </h4>
                  {connectedAcc ? (
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="font-sans text-stone-700">
                        Connected Account: <strong className="font-mono text-stone-900">@{connectedAcc.username}</strong>
                      </p>
                      <p className="font-sans text-stone-700">
                        Token Header: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold border border-[#e3ded5]">{token.substring(0, 15)}...</code>
                      </p>
                      <p className="font-sans text-stone-700 leading-relaxed">
                        Authentication Type: {isBasicToken ? (
                          <span className="text-rose-700 font-bold font-mono bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">Instagram Basic Display Token (Blocked)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">Facebook Page Token (EAA...)</span>
                        )}
                      </p>
                      {isBasicToken ? (
                        <div className="bg-white border border-red-200/80 p-3.5 rounded-xl mt-3 text-[11px] text-red-900/95 leading-relaxed space-y-1.5 shadow-xs">
                          <p className="font-bold flex items-center text-red-850">
                            <ShieldAlert size={14} className="mr-1 inline shrink-0" />
                            CRITICAL INTEGRATION LIMITATION DETECTED:
                          </p>
                          <p>
                            Your connected account <strong>@{connectedAcc.username}</strong> is linked with an Instagram Basic Display Token (starting with <code className="bg-rose-50 text-red-700 px-0.5 rounded font-mono">IGAA...</code>).
                          </p>
                          <p>
                            Meta's platform architecture **strictly blocks** Basic Display Tokens from receiving webhooks or sending direct message replies. These actions require Page Tokens.
                          </p>
                          <p className="text-amber-800 font-bold pt-1">
                            💡 Resolution: Please connect an Instagram Business or Creator account using a Facebook Page Token (starts with EAA...) in the Settings.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white border border-emerald-200/80 p-3.5 rounded-xl mt-3 text-[11px] text-emerald-900/95 leading-relaxed shadow-xs">
                          <p className="font-bold text-emerald-950">✔ Page Token Configured Properly:</p>
                          <p className="mt-1">This token supports the full direct message reply and comment auto-reply webhooks.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 mt-2">No connected accounts. Please connect an account first under settings.</p>
                  )}
                </div>

                <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-800">
                    Meta Sandbox Tester Accounts Rule (Task 5)
                  </h4>
                  <div className="text-xs text-stone-700 space-y-2 leading-relaxed">
                    <p>
                      If your Meta Application in Developers Portal is still in <strong>"Development Mode"</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-1.5 text-stone-600 pl-1 text-[11px]">
                      <li>Incoming direct messages from followers will **NOT** trigger webhooks.</li>
                      <li>To receive DMs during development, you **MUST** register the sender's Instagram account as a <strong>"Tester"</strong> in your Meta Developer App settings (under Roles &gt; Testers), and accept the invitation on the user's Instagram account.</li>
                      <li>Alternatively, move your Meta App to <strong>"Live Mode"</strong> to reply to general public followers.</li>
                    </ul>
                    <p className="text-[11px] font-mono text-amber-900 bg-white/70 p-2 rounded-lg border border-amber-200/60 mt-1">
                      💡 <strong>Sandbox Tip:</strong> Use the <strong>Interactive DM Simulator & Sandbox</strong> subtab to test all rules immediately without configure webhooks!
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Diagnostics JSON Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Panel 1: Last Webhook Payload */}
            <div className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-3 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between border-b border-[#f2efe7] pb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-700 flex items-center space-x-1.5">
                  <span>1. Last Raw Webhook Payload</span>
                </h4>
                {diagnostics?.lastWebhookPayload?.timestamp && (
                  <span className="text-[9px] font-mono text-stone-400">
                    Received: {new Date(diagnostics.lastWebhookPayload.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex-1 bg-stone-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-auto whitespace-pre-wrap leading-normal select-text">
                {diagnostics?.lastWebhookPayload ? (
                  JSON.stringify(diagnostics.lastWebhookPayload, null, 2)
                ) : (
                  <span className="text-stone-500 italic">No incoming webhooks received yet. Check your Meta subscription status.</span>
                )}
              </div>
            </div>

            {/* Panel 2: Last Incoming Message */}
            <div className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-3 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between border-b border-[#f2efe7] pb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-700 flex items-center space-x-1.5">
                  <span>2. Last Messaging Event (Verify IDs)</span>
                </h4>
                {diagnostics?.lastIncomingMessage?.timestamp && (
                  <span className="text-[9px] font-mono text-stone-400">
                    Captured: {new Date(diagnostics.lastIncomingMessage.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex-1 bg-stone-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-auto whitespace-pre-wrap leading-normal select-text">
                {diagnostics?.lastIncomingMessage ? (
                  JSON.stringify(diagnostics.lastIncomingMessage, null, 2)
                ) : (
                  <span className="text-stone-500 italic">No messaging event captured yet. Send a test DM to trigger webhooks.</span>
                )}
              </div>
            </div>

            {/* Panel 3: Last Reply Attempt */}
            <div className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-3 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between border-b border-[#f2efe7] pb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-700 flex items-center space-x-1.5">
                  <span>3. Last Reply Dispatch Payload</span>
                </h4>
                {diagnostics?.lastReplyAttempt?.timestamp && (
                  <span className="text-[9px] font-mono text-stone-400">
                    Dispatched: {new Date(diagnostics.lastReplyAttempt.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex-1 bg-stone-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-auto whitespace-pre-wrap leading-normal select-text">
                {diagnostics?.lastReplyAttempt ? (
                  JSON.stringify(diagnostics.lastReplyAttempt, null, 2)
                ) : (
                  <span className="text-stone-500 italic">No replies dispatched yet. Match rules to send.</span>
                )}
              </div>
            </div>

            {/* Panel 4: API Error Responses */}
            <div className="bg-white border border-[#e3ded5] p-5 rounded-2xl space-y-4 shadow-sm flex flex-col h-[400px]">
              {/* Meta Error */}
              <div className="flex flex-col flex-1 min-h-[160px]">
                <div className="flex items-center justify-between border-b border-[#f2efe7] pb-1.5 mb-2">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-700 flex items-center space-x-1.5">
                    <span>4a. Last Meta API Error</span>
                  </h4>
                  {diagnostics?.lastMetaApiError?.timestamp && (
                    <span className="text-[9px] font-mono text-stone-400">
                      Logged: {new Date(diagnostics.lastMetaApiError.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-stone-900 rounded-xl p-3 font-mono text-[9px] text-rose-400 overflow-auto whitespace-pre-wrap leading-normal select-text max-h-[130px]">
                  {diagnostics?.lastMetaApiError ? (
                    JSON.stringify(diagnostics.lastMetaApiError, null, 2)
                  ) : (
                    <span className="text-emerald-500 font-semibold">✔ No active Meta Graph API errors reported!</span>
                  )}
                </div>
              </div>

              {/* Gemini Error */}
              <div className="flex flex-col flex-1 min-h-[160px]">
                <div className="flex items-center justify-between border-b border-[#f2efe7] pb-1.5 mb-2">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-700 flex items-center space-x-1.5">
                    <span>4b. Last Gemini AI API Error</span>
                  </h4>
                  {diagnostics?.lastGeminiApiError?.timestamp && (
                    <span className="text-[9px] font-mono text-stone-400">
                      Logged: {new Date(diagnostics.lastGeminiApiError.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-stone-900 rounded-xl p-3 font-mono text-[9px] text-amber-400 overflow-auto whitespace-pre-wrap leading-normal select-text max-h-[130px]">
                  {diagnostics?.lastGeminiApiError ? (
                    JSON.stringify(diagnostics.lastGeminiApiError, null, 2)
                  ) : (
                    <span className="text-emerald-500 font-semibold">✔ No active Gemini AI API errors reported! AI Auto-Response is healthy.</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
