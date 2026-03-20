"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowUp, Lock, List, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient, signInWithGoogle } from "@/lib/supabase-browser";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatCoachProps {
  onBack: () => void;
  checkinMode?: "talked" | "didnt-talk";
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  onShowHistory?: () => void;
  onNewChat?: () => void;
  showBottomPadding?: boolean;
  isLoggedIn?: boolean;
}

export default function ChatCoach({ onBack, checkinMode, conversationId, onConversationCreated, onShowHistory, onNewChat, showBottomPadding, isLoggedIn = true }: ChatCoachProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [sessionsRemaining, setSessionsRemaining] = useState<number | null>(null);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [viewingHistory, setViewingHistory] = useState(false);
  const isSubscribed = useRef(false);
  const convoIdRef = useRef<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUp = useRef(false);

  // Save messages to database
  const saveMessages = useCallback(async (convoId: string, msgs: Message[]) => {
    try {
      await fetch(`/api/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
    } catch {}
  }, []);

  // Create a new conversation
  const ensureConversation = useCallback(async (mode?: string): Promise<string | null> => {
    if (convoIdRef.current) return convoIdRef.current;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode || "general" }),
      });
      const data = await res.json();
      if (data.id) {
        convoIdRef.current = data.id;
        onConversationCreated?.(data.id);
        return data.id;
      }
    } catch {}
    return null;
  }, [onConversationCreated]);

  const sessionCounted = useRef(!!conversationId);

  // Check usage on mount
  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscribed) {
          isSubscribed.current = true;
          return;
        }
        if (data.limitReached) {
          setLimitReached(true);
          return;
        }
        setSessionsRemaining(data.sessionsRemaining);
        setMessagesRemaining(data.messagesRemaining);
      })
      .catch(() => {});
  }, [conversationId]);

  const streamResponse = useCallback(
    async (messagesToSend: Message[], convoId: string | null) => {
      setIsLoading(true);
      let assistantContent = "";
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend,
            mode: checkinMode ? `checkin-${checkinMode}` : "general",
          }),
        });
        if (!response.ok) throw new Error("Failed");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let rafId: number | null = null;
        let needsUpdate = false;

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const flushUpdate = () => {
          rafId = null;
          if (needsUpdate) {
            needsUpdate = false;
            const snapshot = assistantContent;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: snapshot };
              return updated;
            });
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                needsUpdate = true;
                if (!rafId) {
                  rafId = requestAnimationFrame(flushUpdate);
                }
              }
            } catch {}
          }
        }

        if (rafId) cancelAnimationFrame(rafId);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      } catch {
        assistantContent = "Something went wrong on my end. But you already know what to do — walk over and say hi.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantContent },
        ]);
      }
      setIsLoading(false);

      // Save the last user message + assistant response to DB
      if (convoId && assistantContent) {
        const lastUserMsg = messagesToSend[messagesToSend.length - 1];
        saveMessages(convoId, [
          lastUserMsg,
          { role: "assistant", content: assistantContent },
        ]);
      }
    },
    [checkinMode, saveMessages]
  );

  // Initialize: load existing conversation or start new
  useEffect(() => {
    if (initialized) return;

    // Loading an existing conversation
    if (conversationId) {
      setInitialized(true);
      setViewingHistory(true);
      fetch(`/api/conversations/${conversationId}/messages`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages?.length > 0) {
            setMessages(data.messages);
          }
          setViewingHistory(false);
        })
        .catch(() => setViewingHistory(false));
      return;
    }

    // New conversation
    if (checkinMode) {
      const initialMsg: Message = {
        role: "assistant",
        content: checkinMode === "talked"
          ? "Nice — you made a move today. Tell me what happened. Where were you, what did you say, and how did she respond?"
          : "No worries — most guys don't approach every day. What happened today? Where were you, and what held you back?",
      };
      setMessages([initialMsg]);
      setInitialized(true);
    } else {
      const initialMsg: Message = {
        role: "assistant",
        content: "Too scared to go up to her? That's normal — every guy feels that. Tell me what's going on. Where are you, what's she doing, and what's holding you back right now?",
      };
      setMessages([initialMsg]);
      setInitialized(true);

      // Check for pending message saved before OAuth redirect
      if (isLoggedIn) {
        try {
          const pending = sessionStorage.getItem("wingmate-pending-message");
          if (pending) {
            sessionStorage.removeItem("wingmate-pending-message");
            const userMsg: Message = { role: "user", content: pending };
            const allMsgs = [initialMsg, userMsg];
            setMessages(allMsgs);

            // Count session + message usage
            if (!isSubscribed.current) {
              sessionCounted.current = true;
              fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "session" }) }).catch(() => {});
              fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "message" }) }).catch(() => {});
            }

            ensureConversation().then((id) => {
              if (id) saveMessages(id, allMsgs);
              streamResponse(allMsgs, id);
            });
          }
        } catch {}
      }
    }
  }, [initialized, conversationId, checkinMode, streamResponse, ensureConversation, saveMessages]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // User is "scrolled up" if they're more than 100px from the bottom
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || limitReached) return;

    // If not logged in, save message and redirect to Google OAuth
    if (!isLoggedIn) {
      try {
        sessionStorage.setItem("wingmate-pending-message", content.trim());
      } catch {}
      signInWithGoogle();
      return;
    }

    const userMessage: Message = { role: "user", content: content.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    let hitLimit = false;
    if (!isSubscribed.current) {
      // Count session on first message (not on mount)
      if (!sessionCounted.current) {
        sessionCounted.current = true;
        try {
          await fetch("/api/usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "session" }),
          });
        } catch {}
      }

      try {
        const res = await fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "message" }),
        });
        const data = await res.json();
        if (data.messagesRemaining !== undefined) setMessagesRemaining(data.messagesRemaining);
        if (data.limitReached) hitLimit = true;
      } catch {}
    }

    const isFirstMessage = !convoIdRef.current;
    const convoId = await ensureConversation();
    // On first message, save the initial greeting + user message so history is complete
    if (isFirstMessage && convoId && messages.length > 0) {
      saveMessages(convoId, messages);
    }
    await streamResponse(updated, convoId);

    // Block further messages after the response has been shown
    if (hitLimit) setLimitReached(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className={`fixed inset-0 flex flex-col max-w-md mx-auto bg-bg animate-fade-in overflow-hidden ${showBottomPadding ? "h-[calc(100dvh-4.5rem)]" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 bg-bg/80 backdrop-blur-lg sticky top-0 z-10">
        {onShowHistory ? (
          <button onClick={onShowHistory} className="text-text-muted press p-1.5 rounded-full hover:bg-bg-card-hover transition-colors" title="Chat history">
            <List size={18} strokeWidth={2} />
          </button>
        ) : (
          <button onClick={onBack} className="text-text-muted press p-1.5 rounded-full hover:bg-bg-card-hover transition-colors">
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
        )}
        <div className="flex-1 text-center">
          <p className="font-display text-[15px] font-bold">Wingmate</p>
          <p className={`text-[11px] text-orange-500 font-medium transition-opacity ${isLoading ? "opacity-100" : "opacity-0"}`}>thinking...</p>
        </div>
        {onNewChat ? (
          <button onClick={onNewChat} className="text-text-muted press p-1.5 rounded-full hover:bg-bg-card-hover transition-colors" title="New chat">
            <Plus size={18} strokeWidth={2} />
          </button>
        ) : (
          <div className="w-[34px]" />
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 pt-3"
      >
        {viewingHistory ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {messages.length <= 1 && !conversationId && (
              <div className="bg-bg-card border border-border/60 rounded-2xl px-4 py-4 mb-2 animate-fade-in">
                <p className="text-[13px] leading-relaxed text-text-muted">
                  See someone you want to talk to but can&apos;t get yourself to walk over? Tell Wingmate what&apos;s going on — where you are, how you&apos;re feeling, what&apos;s holding you back — and it&apos;ll help you get out of your head and into the conversation.
                </p>
              </div>
            )}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end msg-in">
                  <div className="max-w-[82%] bg-[#1a1a1a] text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-card">
                    <p className="text-[15px] leading-[1.55] whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="msg-in">
                  <div className="bg-bg-card border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-card max-w-[92%]">
                    {msg.content.split("\n").map((line, j) => {
                      const trimmed = line.trim();
                      const isTitle =
                        trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 5 && trimmed.length < 80;
                      return isTitle ? (
                        <p key={j} className="text-[15px] font-bold leading-[1.6] mt-4 mb-1 text-orange-500 first:mt-0">{trimmed.slice(1, -1)}</p>
                      ) : trimmed === "" ? (
                        <div key={j} className="h-2" />
                      ) : (
                        <p key={j} className="text-[14.5px] leading-[1.7] text-text/90">{line}</p>
                      );
                    })}
                  </div>
                </div>
              )
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="animate-fade-in py-2 pl-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Paywall */}
      {limitReached ? (
        <div className="mx-4 mb-4 px-5 py-6 shrink-0 bg-bg-card border border-border rounded-2xl text-center animate-fade-in">
          <Lock size={18} strokeWidth={1.5} className="mx-auto text-text-muted mb-2" />
          <p className="font-display font-bold text-[16px] mb-1">Pro feature</p>
          <p className="text-text-muted text-[13px] mb-4">
            Upgrade to Pro for unlimited AI coaching.
          </p>
          <button
            onClick={() => router.push("/plans")}
            className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press"
          >
            Unlock Wingmate Pro
          </button>
        </div>
      ) : (
        <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="px-4 py-2">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 bg-bg-card border border-border rounded-2xl shadow-card pl-4 pr-2 py-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind..."
                rows={1}
                className="flex-1 bg-transparent text-text text-[15px] placeholder-text-muted/60 focus:outline-none resize-none leading-normal py-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-[#1a1a1a] disabled:opacity-15 text-white p-2.5 rounded-xl press shrink-0 transition-opacity"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
