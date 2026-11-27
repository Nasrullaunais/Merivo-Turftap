import { useEffect, useRef, useState } from "react";

import { choicesOf, fetchInbox, sendMedia, sendMessage, sendTap } from "./api";
import { Composer } from "./components/Composer";
import { ControlPanel } from "./components/ControlPanel";
import { Header } from "./components/Header";
import { MessageBubble } from "./components/MessageBubble";
import { TypingIndicator } from "./components/TypingIndicator";
import { useLocalStorage } from "./lib/useLocalStorage";
import { nowStamp, uid } from "./lib/util";
import type { ChatMessage, Choice, Choices, Settings } from "./types";

const POLL_INTERVAL_MS = 1500;
const REPLY_WAIT_MS = 20_000;

const greeting = (): ChatMessage => ({
  id: uid(),
  role: "sys",
  text: "Pick the business number and your phone in settings, then write to the Assistant as a customer would on WhatsApp.",
  time: nowStamp(),
});

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>("settings", {
    businessNumberId: "",
    phone: "",
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting()]);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const waitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const live = settings.businessNumberId.trim() !== "" && settings.phone.trim() !== "";

  const push = (msg: Omit<ChatMessage, "id" | "time">) =>
    setMessages((prev) => [...prev, { ...msg, id: uid(), time: nowStamp() }]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  // Pin to the visual viewport so the on-screen keyboard shrinks the layout instead of scrolling it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => document.documentElement.style.setProperty("--app-h", vv.height + "px");
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  // The Assistant answers through pretend Meta, so its replies are read from there.
  useEffect(() => {
    if (!live) return;
    let stopped = false;
    let afterId: number | undefined;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const fresh = await fetchInbox(settings, afterId ?? 0);
        const last = fresh.at(-1);
        if (stopped || !last) return;
        const caughtUp = afterId !== undefined;
        afterId = last.id;
        // Replies from before this page opened stay hidden; a chat starts empty.
        if (!caughtUp) return;
        clearTimeout(waitTimer.current);
        setWaiting(false);
        setMessages((prev) => [
          ...prev,
          ...fresh.map((m) => ({
            id: uid(),
            role: "rx" as const,
            text: m.text,
            choices: choicesOf(m.messageId, m.interactive),
            footer: m.interactive?.footer?.text,
            time: new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })),
        ]);
      } catch {
        // n8n is down or the workflows aren't loaded yet; the next tick tries again.
      } finally {
        afterId ??= 0;
      }
    };
    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [live, settings]);

  /** Shows what the customer sent, delivers it like Meta, and waits for the answer. */
  async function deliver(
    shown: Pick<ChatMessage, "text" | "attachment">,
    delivery: () => Promise<{ ok: boolean; status: number }>,
  ) {
    push({ role: "tx", ...shown });
    try {
      const res = await delivery();
      if (!res.ok) {
        push({ role: "err", text: `The Assistant refused the message (HTTP ${res.status}).` });
        return;
      }
      setWaiting(true);
      clearTimeout(waitTimer.current);
      waitTimer.current = setTimeout(() => {
        setWaiting(false);
        push({
          role: "sys",
          text: "No reply. A turned-off tenant or an unlinked number gets none; otherwise check the run in n8n.",
        });
      }, REPLY_WAIT_MS);
    } catch (err) {
      push({
        role: "err",
        text: `Could not reach n8n: ${err instanceof Error ? err.message : String(err)}. Is it running, with bun run assistant:setup done?`,
      });
    }
  }

  function ready() {
    if (live) return true;
    push({ role: "err", text: "Set the business number and your phone in settings first." });
    setPanelOpen(true);
    return false;
  }

  function send() {
    const text = draft.trim();
    if (!text || !ready()) return;
    setDraft("");
    void deliver({ text }, () => sendMessage(settings, text));
  }

  function attach(file: File) {
    if (!ready()) return;
    const caption = draft.trim();
    setDraft("");
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    void deliver({ text: caption, attachment: { name: file.name, previewUrl } }, () =>
      sendMedia(settings, file, caption),
    );
  }

  // WhatsApp shows a tapped button or list row as the customer's own message.
  const tap = (choices: Choices, choice: Choice) =>
    void deliver({ text: choice.title }, () => sendTap(settings, choices, choice));

  return (
    <div className="app">
      <Header
        settings={settings}
        live={live}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((open) => !open)}
        onNewChat={() => setMessages([greeting()])}
      />
      <ControlPanel open={panelOpen} settings={settings} onChange={setSettings} />
      <main className="stream" ref={scrollRef}>
        <div className="stream__inner">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onTap={tap} />
          ))}
          {waiting && <TypingIndicator />}
        </div>
      </main>
      <Composer value={draft} onChange={setDraft} onSend={send} onAttach={attach} />
    </div>
  );
}
