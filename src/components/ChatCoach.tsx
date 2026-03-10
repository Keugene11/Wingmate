"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatCoachProps {
  onBack: () => void;
  fromPhoto?: boolean;
  imageData?: string | null;
}

const STORAGE_KEY = "approachai-messages";

function getSavedMessages(): Message[] | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveMessages(messages: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

export function clearSavedMessages() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("approachai-state");
  } catch {}
}

export default function ChatCoach({ onBack, fromPhoto, imageData }: ChatCoachProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [sessionsRemaining, setSessionsRemaining] = useState<number | null>(null);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const isSubscribed = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    if (initialized && messages.length > 0) {
      const toSave = messages.filter((m) => m.content.length > 0);
      if (toSave.length > 0) saveMessages(toSave);
    }
  }, [messages, initialized]);

  // Check usage and increment session count on mount
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

        // Only increment session for new chats (no saved messages)
        const saved = getSavedMessages();
        if (saved && saved.length > 0) return;

        fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "session" }),
        })
          .then((res) => res.json())
          .then((d) => {
            if (d.sessionsRemaining !== undefined) setSessionsRemaining(d.sessionsRemaining);
            if (d.messagesRemaining !== undefined) setMessagesRemaining(d.messagesRemaining);
            if (d.limitReached) setLimitReached(true);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const streamResponse = useCallback(
    async (messagesToSend: Message[]) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend,
            mode: fromPhoto ? "photo-approach" : "general",
          }),
        });
        if (!response.ok) throw new Error("Failed");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let content = "";
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
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
                content += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content };
                  return updated;
                });
              }
            } catch {}
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong on my end. But you already know what to do — walk over and say hi.",
          },
        ]);
      }
      setIsLoading(false);
    },
    [fromPhoto]
  );

  useEffect(() => {
    if (initialized) return;

    // Try to get image from prop or sessionStorage
    let photo = imageData;
    if (!photo && fromPhoto) {
      try { photo = sessionStorage.getItem("approachai-image"); } catch {}
    }

    // If we have a photo, always analyze it fresh — don't restore old messages
    if (fromPhoto && photo) {
      setInitialized(true);
      const analyzeAndStart = async () => {
        let sceneDescription = "";
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageData: photo }),
          });
          const data = await res.json();
          sceneDescription = data.analysis || "";
        } catch (e) {
          console.error("[ChatCoach] analyze failed:", e);
        }
        const apiContent = sceneDescription
          ? `I just spotted someone I want to approach. I'm in the moment right now.\n\nHere is EXACTLY what the scene looks like:\n${sceneDescription}\n\nYou MUST reference these specific details in your response — the setting, what they're doing, what's around them. Your opener MUST be tailored to this exact scene. Do NOT give generic advice. Give me the motivation, a game plan for THIS specific moment, and help me crush my fears. I need to move NOW.`
          : "I just spotted someone I want to approach. I'm in the moment right now. Give me the motivation, the game plan, and help me crush my fears about this. I need to move NOW.";
        // Show a clean message to user, send full context to API
        const displayMsg: Message = { role: "user", content: "I just spotted someone. Help me approach." };
        const apiMsg: Message = { role: "user", content: apiContent };
        setMessages([displayMsg]);
        streamResponse([apiMsg]);
      };
      analyzeAndStart();
      return;
    }

    const saved = getSavedMessages();
    if (saved && saved.length > 0) {
      setMessages(saved);
      setInitialized(true);
      return;
    }

    if (fromPhoto) {
      const trigger: Message = {
        role: "user",
        content: "I just spotted someone I want to approach. I'm in the moment right now. Give me the motivation, the game plan, and help me crush my fears about this. I need to move NOW.",
      };
      setMessages([trigger]);
      setInitialized(true);
      streamResponse([trigger]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "What's going on? Tell me where you are, who caught your eye, and what's running through your head right now.",
        },
      ]);
      setInitialized(true);
    }
  }, [initialized, fromPhoto, imageData, streamResponse]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 50;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || limitReached) return;
    const userMessage: Message = { role: "user", content: content.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Increment message usage for free users
    if (!isSubscribed.current) {
      try {
        const res = await fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "message" }),
        });
        const data = await res.json();
        if (data.messagesRemaining !== undefined) setMessagesRemaining(data.messagesRemaining);
        if (data.limitReached) {
          setLimitReached(true);
          return;
        }
      } catch {}
    }

    await streamResponse(updated);
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

  const handleBack = () => {
    clearSavedMessages();
    onBack();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0 border-b border-border">
        <button onClick={handleBack} className="text-text press -ml-1 p-1">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <button onClick={handleBack} className="font-display text-[17px] font-bold flex-1 text-left cursor-pointer">
          ApproachAI
        </button>
        {isLoading && (
          <span className="text-[12px] text-text-muted animate-fade-in">typing...</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 pb-4 space-y-5 pt-5"
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end msg-in">
              <div className="max-w-[80%] bg-white text-black rounded-[18px] rounded-br-[4px] px-4 py-2.5">
                <p className="text-[15px] leading-[1.5] whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="msg-in">
              {msg.content.split("\n").map((line, j) => {
                const trimmed = line.trim();
                const isTitle =
                  trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 5 && trimmed.length < 80;
                return isTitle ? (
                  <p key={j} className="text-[16px] font-bold leading-[1.65] mt-5 mb-1 text-text">{trimmed.slice(1, -1)}</p>
                ) : trimmed === "" ? (
                  <br key={j} />
                ) : (
                  <p key={j} className="text-[15px] leading-[1.65] text-text">{line}</p>
                );
              })}
            </div>
          )
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="animate-fade-in py-2">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Paywall */}
      {limitReached ? (
        <div className="px-5 py-6 shrink-0 border-t border-border text-center animate-fade-in">
          <Lock size={20} strokeWidth={1.5} className="mx-auto text-text-muted mb-2" />
          <p className="font-display font-bold text-[16px] mb-1">Free trial used up</p>
          <p className="text-text-muted text-[13px] mb-4">
            Upgrade to keep your AI coach in your pocket.
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="w-full bg-white text-black py-3 rounded-xl font-medium text-[14px] press"
          >
            Unlock ApproachAI
          </button>
        </div>
      ) : (
        <>
          {/* Free usage counter */}
          {messagesRemaining !== null && messagesRemaining >= 0 && (
            <div className="text-center py-1.5 text-[11px] text-text-muted border-t border-border">
              {messagesRemaining} free {messagesRemaining === 1 ? "message" : "messages"} remaining
            </div>
          )}
          {/* Input */}
          <div className={`px-4 py-3 shrink-0 ${sessionsRemaining === null ? "border-t border-border" : ""}`}>
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 bg-bg-input rounded-full pl-5 pr-2 py-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                rows={1}
                className="flex-1 bg-transparent text-text text-[15px] placeholder-text-muted focus:outline-none resize-none leading-normal py-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-white disabled:opacity-20 text-black p-2 rounded-full press shrink-0 transition-opacity"
              >
                <ArrowUp size={15} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
