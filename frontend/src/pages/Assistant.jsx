import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Bot,
  User,
  Send,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  PackageCheck,
  CheckCircle2,
  Cpu,
  Zap,
} from "lucide-react";
import { getDealers, sendAssistantMessage } from "../services/api";

const SUGGESTED_PROMPTS = [
  "Do you have brake pads for a Pulsar 150?",
  "Check available stock for BRK-1044",
  "Order 2 units of BRK-1044",
  "Do you have coolant for a Duke 390?",
  "Check inventory for OIL-1001",
];

export function Assistant() {
  const [searchParams] = useSearchParams();
  const queryDealerId = searchParams.get("dealer_id");

  // Dealers
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [loadingDealers, setLoadingDealers] = useState(true);

  // Session
  const [sessionId, setSessionId] = useState("");

  // Chat conversation
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Collapsed tool calls state per message index
  const [expandedTools, setExpandedTools] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate or restore session ID
    let currentSession = sessionStorage.getItem("vikmo_assistant_session");
    if (!currentSession) {
      currentSession = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem("vikmo_assistant_session", currentSession);
    }
    setSessionId(currentSession);

    // Fetch real dealers
    fetchDealers();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const fetchDealers = async () => {
    setLoadingDealers(true);
    try {
      const res = await getDealers({ page_size: 50 });
      const list = res.results || [];
      setDealers(list);

      if (queryDealerId && list.some((d) => d.id.toString() === queryDealerId)) {
        setSelectedDealerId(queryDealerId);
      } else if (list.length > 0) {
        setSelectedDealerId(list[0].id.toString());
      }
    } catch {
      // Ignored
    } finally {
      setLoadingDealers(false);
    }
  };

  const handleNewSession = () => {
    const newSession = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem("vikmo_assistant_session", newSession);
    setSessionId(newSession);
    setMessages([]);
    setChatError(null);
  };

  const toggleToolExpand = (msgIndex) => {
    setExpandedTools((prev) => ({
      ...prev,
      [msgIndex]: !prev[msgIndex],
    }));
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const cleanMsg = inputText.trim();
    if (!cleanMsg || isSending || !selectedDealerId) return;

    setInputText("");
    setChatError(null);

    const userTurn = {
      role: "user",
      content: cleanMsg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userTurn]);
    setIsSending(true);

    try {
      const res = await sendAssistantMessage({
        sessionId,
        dealerId: parseInt(selectedDealerId, 10),
        message: cleanMsg,
      });

      const assistantTurn = {
        role: "assistant",
        content: res.reply || "",
        cited_skus: res.cited_skus || [],
        tool_calls: res.tool_calls || [],
        actions: res.actions || [],
        engine: res.engine || "deterministic",
        provider: res.provider || res.engine || "deterministic",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err) {
      setChatError(err.message || "Failed to communicate with assistant engine.");
    } finally {
      setIsSending(false);
    }
  };

  const currentDealer = dealers.find((d) => d.id.toString() === selectedDealerId);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto card-warm rounded-3xl border border-[#E8D5BD] shadow-xs overflow-hidden">
      {/* Top Bar: Session & Dealer Info */}
      <div className="px-6 py-4 bg-[#F2DEC4] border-b border-[#E8D5BD] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D96A25] flex items-center justify-center text-[#FFFDF9] font-bold shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-bold text-base text-[#211D1B] tracking-tight flex items-center gap-2">
              VIKMO AI Commerce Assistant
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4D5B7] text-[#BE571B] border border-[#E8D5BD]">
                Grounded Engine
              </span>
            </div>
            <div className="text-xs text-[#817568]">
              Multi-turn tool-calling with live inventory grounding
            </div>
          </div>
        </div>

        {/* Dealer Selector & New Session */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FAF2E8] px-3 py-1.5 rounded-full border border-[#E8D5BD]">
            <span className="text-xs font-medium text-[#817568]">Acting as:</span>
            {loadingDealers ? (
              <span className="text-xs text-[#817568]">Loading...</span>
            ) : (
              <select
                value={selectedDealerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDealerId(newId);
                  const freshSession = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                  sessionStorage.setItem("vikmo_assistant_session", freshSession);
                  setSessionId(freshSession);
                  setMessages([]);
                  setChatError(null);
                }}
                className="text-xs bg-transparent text-[#211D1B] font-semibold focus:outline-none cursor-pointer"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#FAF2E8] text-[#211D1B]">
                    {d.dealer_code} — {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleNewSession}
            className="btn-secondary rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-2xs"
            title="Reset conversation and start fresh session"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D96A25]" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F8E9D5]/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4D5B7] flex items-center justify-center text-[#D96A25] shadow-2xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="max-w-md">
              <h3 className="font-display font-bold text-2xl text-[#211D1B]">
                How can I assist your dealership today?
              </h3>
              <p className="text-xs text-[#817568] mt-1.5 leading-relaxed">
                I can look up genuine parts across 600 catalogue items, check real-time warehouse stock, and create draft orders directly on behalf of{" "}
                <span className="font-semibold text-[#211D1B]">
                  {currentDealer ? currentDealer.name : "your dealership"}
                </span>
                .
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg pt-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(prompt);
                  }}
                  className="px-4 py-2 text-xs font-medium bg-[#F2DEC4] hover:bg-[#D96A25] hover:text-[#FFFDF9] text-[#211D1B] border border-[#E8D5BD] rounded-full transition-all duration-200 shadow-2xs cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#D96A25] flex items-center justify-center text-[#FFFDF9] font-bold shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 space-y-2.5 shadow-2xs ${
                    isUser
                      ? "bg-[#D96A25] text-[#FFFDF9] rounded-tr-xs"
                      : "bg-[#FAF2E8] text-[#211D1B] border border-[#E8D5BD] rounded-tl-xs"
                  }`}
                >
                  {/* Engine Indicator Header */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8D5BD]/60 mb-1">
                      <span className="text-[10px] font-bold text-[#817568] uppercase tracking-wider">
                        VIKMO Assistant
                      </span>
                      {(msg.provider === "gemini" || msg.engine === "gemini") ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6EFE4] text-[#3F6236] border border-[#C5DDC0]">
                          <Sparkles className="w-2.5 h-2.5 text-[#3F6236]" />
                          Gemini Live
                        </span>
                      ) : (msg.provider === "groq" || msg.engine === "groq") ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4D5B7] text-[#BE571B] border border-[#E8D5BD]">
                          <Zap className="w-2.5 h-2.5 text-[#BE571B]" />
                          Groq Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBD1B2] text-[#817568] border border-[#E8D5BD]">
                          <Cpu className="w-2.5 h-2.5 text-[#817568]" />
                          Deterministic Fallback
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Actions Result Box (e.g. Draft Order Created) */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {msg.actions.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#E6EFE4] border border-[#C5DDC0] text-[#2E4A28] text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#3F6236] shrink-0" />
                            <div>
                              <span className="font-semibold">Draft Order Created: </span>
                              <span className="font-mono font-bold text-[#211D1B]">
                                {act.order_number}
                              </span>
                            </div>
                          </div>
                          <Link
                            to={`/orders?order=${act.order_number}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#D96A25] hover:text-[#BE571B] hover:underline"
                          >
                            <span>Inspect Order</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cited SKUs Badges */}
                  {!isUser && msg.cited_skus && msg.cited_skus.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-[#817568]">
                        Cited Catalogue SKUs:
                      </span>
                      {msg.cited_skus.map((sku) => (
                        <Link
                          key={sku}
                          to={`/products?search=${sku}`}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#F4D5B7] text-[#BE571B] border border-[#E8D5BD] hover:bg-[#D96A25] hover:text-[#FFFDF9] transition-colors"
                        >
                          {sku}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Tool Calls Inspector Dropdown */}
                  {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="pt-1.5 border-t border-[#E8D5BD]/60">
                      <button
                        onClick={() => toggleToolExpand(idx)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#817568] hover:text-[#211D1B] transition-colors cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-[#817568]" />
                        <span>
                          Executed {msg.tool_calls.length} Tool Call(s)
                        </span>
                        {expandedTools[idx] ? (
                          <ChevronDown className="w-3 h-3 text-[#817568]" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-[#817568]" />
                        )}
                      </button>

                      {expandedTools[idx] && (
                        <div className="mt-2 space-y-1.5 p-3 bg-[#211D1B] text-[#FAF2E8] rounded-xl text-xs font-mono border border-[#3E3631]">
                          {msg.tool_calls.map((tc, tIdx) => (
                            <div key={tIdx} className="space-y-0.5 pb-1 border-b border-[#3E3631] last:border-0">
                              <div className="text-[#F4D5B7] font-bold">
                                {tIdx + 1}. {tc.name}()
                              </div>
                              <div className="text-[11px] text-[#EBD1B2] overflow-x-auto">
                                args: {JSON.stringify(tc.arguments)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#211D1B] flex items-center justify-center text-[#FFFDF9] font-bold shrink-0 mt-1 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Sending / Thinking Indicator */}
        {isSending && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-[#D96A25] flex items-center justify-center text-[#FFFDF9] font-bold shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#FAF2E8] border border-[#E8D5BD] rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2 text-xs text-[#817568] font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D96A25]" />
              <span>Checking parts catalogue & reasoning with live tools...</span>
            </div>
          </div>
        )}

        {chatError && (
          <div className="p-3.5 bg-[#FBEAE8] border border-[#F1C4BF] rounded-xl text-[#8E2819] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#8E2819]" />
            <span>{chatError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-[#F2DEC4] border-t border-[#E8D5BD]">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            disabled={isSending || !selectedDealerId}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedDealerId
                ? "Ask about parts, inventory availability, or say 'Order 2 units of BRK-1044'..."
                : "Select a dealer above to begin chat..."
            }
            className="flex-1 px-4 py-2.5 input-warm bg-[#FAF2E8] border border-[#E8D5BD] text-[#211D1B] placeholder-[#A39788] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D96A25] transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending || !selectedDealerId}
            className="btn-primary rounded-2xl px-5 py-2.5 flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-white" />
            <span>Send</span>
          </button>
        </form>
        <div className="mt-2 text-[11px] text-[#817568] flex items-center justify-between">
          <span>Session ID: {sessionId}</span>
          <span>Only DRAFT orders can be created by assistant (safety guardrail)</span>
        </div>
      </div>
    </div>
  );
}
