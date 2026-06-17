"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_CHAT_PHONE, DEMO_PAYMENT_SCREENSHOT_URL } from "@/data/demo-seed";
import { restaurantConfig } from "@/data/restaurant-config";

type ChatMessage = {
  id: string;
  role: "customer" | "bot";
  body: string;
  mediaUrl?: string;
};

const quickActions = ["menu", "cart", "checkout", "track", "help"];

export function WhatsAppDemoChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      body: `Welcome to ${restaurantConfig.name} demo chat. Type "menu" or use the quick actions below to start ordering.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(body: string, mediaUrl?: string) {
    if (!body.trim() && !mediaUrl) return;

    const customerMessage: ChatMessage = {
      id: `customer-${Date.now()}`,
      role: "customer",
      body: body || "Payment screenshot",
      mediaUrl,
    };
    setMessages((current) => [...current, customerMessage]);
    setSending(true);

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: DEMO_CHAT_PHONE,
          body,
          mediaUrl,
        }),
      });
      const data = (await response.json()) as {
        messages: { body: string; mediaUrl?: string }[];
      };

      const botMessages = (data.messages ?? []).map((message, index) => ({
        id: `bot-${Date.now()}-${index}`,
        role: "bot" as const,
        body: message.body,
        mediaUrl: message.mediaUrl,
      }));

      setMessages((current) => [...current, ...botMessages]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "bot",
          body: "Could not reach the demo bot. Make sure the dev server is running.",
        },
      ]);
    } finally {
      setSending(false);
      setInput("");
    }
  }

  async function resetChat() {
    await fetch("/api/demo/reset-chat", { method: "POST" });
    setMessages([
      {
        id: "welcome-reset",
        role: "bot",
        body: "Chat reset. Type menu to start a fresh order.",
      },
    ]);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            WhatsApp Demo
          </p>
          <h1 className="text-3xl font-bold text-stone-900">{restaurantConfig.name}</h1>
          <p className="text-sm text-stone-600">
            Simulate customer ordering without Twilio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Counter
          </Link>
          <Link
            href="/kitchen"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Kitchen
          </Link>
          <button
            type="button"
            onClick={() => void resetChat()}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Reset chat
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-stone-900">Demo script</h2>
          <ol className="space-y-2 text-sm text-stone-600">
            <li>1. Send menu and pick a category</li>
            <li>2. Add items like 1x2</li>
            <li>3. Checkout, choose delivery or takeaway</li>
            <li>4. Confirm with yes</li>
            <li>5. Send payment screenshot</li>
            <li>6. Open Counter to approve payment</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => void sendMessage(action)}
                className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-900"
              >
                {action}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void sendMessage("", DEMO_PAYMENT_SCREENSHOT_URL)}
            className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Send payment screenshot
          </button>
        </aside>

        <section className="flex flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-[#e5ddd5] shadow-lg">
          <div className="flex items-center gap-3 bg-[#075e54] px-5 py-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              B
            </div>
            <div>
              <p className="font-semibold">{restaurantConfig.name}</p>
              <p className="text-xs text-emerald-100">online - demo mode</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5" style={{ minHeight: "420px" }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    message.role === "customer"
                      ? "rounded-br-sm bg-[#dcf8c6] text-stone-900"
                      : "rounded-bl-sm bg-white text-stone-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  {message.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.mediaUrl}
                      alt="Attachment"
                      className="mt-2 max-h-40 rounded-lg object-cover"
                    />
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2 border-t border-stone-300 bg-[#f0f0f0] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-full bg-[#075e54] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
