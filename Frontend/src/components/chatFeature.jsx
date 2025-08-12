// src/components/ChatWithGemini.jsx
import React, { useState, useRef, useEffect, useContext } from "react";
import { ThemeContext } from "../Content/ThemeContent";

/*
  WARNING: storing API keys client-side is insecure.
  For demo only. Put key on server for production and call server endpoint.
*/
const GEMINI_API_KEY = "AIzaSyBPFCiU_NC1Wr5YAVW_-sAIjR-tvxkQePc";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/*
 Props:
  - lat, lon
  - predictionData (object)
  - impactSummary (object) // output from ImpactSection or computed fallback
  - area, efficiency, avg_7
*/
export default function ChatWithGemini({
  lat,
  lon,
  predictionData = {},
  impactSummary = null,
  area = 10,
  efficiency = 18,
  avg_7 = null,
  time =null
}) {
  const { theme } = useContext(ThemeContext);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi — ask me about your solar prediction, energy usage, or optimization ideas." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContextSnippet = () => {
    // compact context for prompt
    const irr = predictionData?.predicted_next_hour_wm2 ?? predictionData?.prediction_wm2 ?? predictionData?.prediction ?? null;
    const summary = {
      lat, lon,
      predicted_irradiance_wm2: irr,
      impact: impactSummary,
      area_m2: area,
      efficiency_pct: efficiency,
      avg_7hours_irr_wm2: avg_7,
      time:time
    };
    return JSON.stringify(summary, null, 0);
  };

  const sendToGemini = async (userText) => {
    // quick local fallback if no key
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("<PASTE")) {
      return `Demo reply: I estimate that with ${area} m² @ ${efficiency}% you'll produce roughly ${(
        ((predictionData?.predicted_next_hour_wm2 ?? avg_7 ?? 0) * area * (efficiency / 100)) / 1000
      ).toFixed(3)} kWh/hr. For production use a server-side key.`;
    }

    const prompt = `
You are a helpful solar-energy assistant. The user asked:
"${userText}"

Context (do not repeat entire context unless asked; summarize if necessary):
${buildContextSnippet()}

Give a concise, actionable answer (3-5 sentences). If the user asks for calculations, show them step-by-step. Prefer practical suggestions (tilt, area increase, shading, battery sizing).`;

    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    // read text from typical response paths
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return txt || "No response from Gemini.";
  };

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // add user message
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const assistantText = await sendToGemini(trimmed);
      setMessages((m) => [...m, { role: "assistant", text: assistantText }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`w-full rounded-2xl p-4 shadow ${theme === "dark" ? "bg-slate-800 text-slate-100" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Ask the Solar Assistant</h3>
          <p className="text-xs text-slate-500">Ask follow-up questions about your prediction or energy usage.</p>
        </div>
        <div className="text-xs text-slate-400">Model: Gemini</div>
      </div>

      <div className="h-56 overflow-auto rounded-md border border-slate-200 dark:border-slate-700 p-3 mb-3 bg-gradient-to-b from-white/50 to-white/0 dark:from-slate-900/50">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <div className={`inline-block max-w-full break-words px-3 py-2 rounded-md ${m.role === "user" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800" : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"}`}>
              <div className="text-sm whitespace-pre-line">{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 items-center">
        <textarea
          aria-label="Ask question"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Try: How many panels to run a refrigerator? Or how to improve tilt?"
          className="flex-1 resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 dark:bg-slate-800 dark:border-slate-700"
        />
        <button
          onClick={onSend}
          disabled={sending || !input.trim()}
          className={`px-4 py-2 rounded-md font-semibold ${sending ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"} text-white`}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Tip: you can ask for calculations like "How many m² to charge a 2kWh EV in 2 hours?" — assistant will use your panel area & efficiency if provided.
      </div>
    </div>
  );
}
