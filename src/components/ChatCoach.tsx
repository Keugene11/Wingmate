"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
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
          ? `I just spotted someone I want to approach. I'm in the moment right now. Here's what the scene looks like: "${sceneDescription}"\n\nReference this scene directly. Give me the motivation, a game plan tailored to THIS specific setting and situation, and help me crush my fears. I need to move NOW.`
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
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: content.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
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
    <div className="flex flex-col h-screen max-w-md mx-auto bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0 border-b border-border bg-bg-card">
        <button onClick={handleBack} className="text-text active:opacity-60 -ml-1 p-1">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <button onClick={handleBack} className="text-[17px] font-bold flex-1 text-left">
          ApproachAI
        </button>
        {isLoading && (
          <span className="text-[12px] text-text-muted">typing...</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 pt-4"
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-black text-white rounded-[18px] rounded-br-sm px-4 py-2.5">
                <p className="text-[15px] leading-[1.6] whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={i}>
              <p className="text-[15px] leading-[1.6] whitespace-pre-wrap text-text">{msg.content}</p>
            </div>
          )
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="px-1 py-3">
              <div className="flex gap-1 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 shrink-0 border-t border-border bg-bg-card">
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
            className="bg-black disabled:opacity-20 text-white p-2 rounded-full transition shrink-0"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
