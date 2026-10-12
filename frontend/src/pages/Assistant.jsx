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
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Bar: Session & Dealer Info */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-2">
              VIKMO AI Commerce Assistant
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Grounded Engine
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Multi-turn tool-calling with live inventory grounding
            </div>
          </div>
        </div>

        {/* Dealer Selector & New Session */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400">Acting as:</span>
            {loadingDealers ? (
              <span className="text-xs text-slate-300">Loading...</span>
            ) : (
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="text-xs bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                    {d.dealer_code} — {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Reset conversation and start fresh session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/60">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="font-bold text-slate-900 text-base">
                How can I assist your dealership today?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                I can look up genuine parts across 600 catalogue items, check real-time warehouse stock, and create draft orders directly on behalf of{" "}
                <span className="font-semibold text-slate-700">
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
                  className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full transition-colors shadow-2xs"
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
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 space-y-2 shadow-2xs ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-xs"
                      : "bg-white text-slate-900 border border-slate-200 rounded-tl-xs"
                  }`}
                >
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
                          className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold">Draft Order Created: </span>
                              <span className="font-mono font-bold text-slate-900">
                                {act.order_number}
                              </span>
                            </div>
                          </div>
                          <Link
                            to={`/orders?order=${act.order_number}`}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
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
                      <span className="text-[11px] font-semibold text-slate-400">
                        Cited Catalogue SKUs:
                      </span>
                      {msg.cited_skus.map((sku) => (
                        <Link
                          key={sku}
                          to={`/products?search=${sku}`}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          {sku}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Tool Calls Inspector Dropdown */}
                  {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => toggleToolExpand(idx)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Executed {msg.tool_calls.length} Tool Call(s)
                        </span>
                        {expandedTools[idx] ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>

                      {expandedTools[idx] && (
                        <div className="mt-2 space-y-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono">
                          {msg.tool_calls.map((tc, tIdx) => (
                            <div key={tIdx} className="space-y-0.5 pb-1 border-b border-slate-800 last:border-0">
                              <div className="text-amber-400 font-bold">
                                {tIdx + 1}. {tc.name}()
                              </div>
                              <div className="text-[11px] text-slate-300 overflow-x-auto">
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
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 font-bold shrink-0 mt-1">
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
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2 text-xs text-slate-500 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Checking parts catalogue & reasoning with live tools...</span>
            </div>
          </div>
        )}

        {chatError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-slate-200">
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
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending || !selectedDealerId}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4 text-amber-400" />
            <span>Send</span>
          </button>
        </form>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Session ID: {sessionId}</span>
          <span>Only DRAFT orders can be created by assistant (safety guardrail)</span>
        </div>
      </div>
    </div>
  );
}
