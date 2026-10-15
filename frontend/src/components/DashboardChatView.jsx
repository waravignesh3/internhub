import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Card, Button } from './UIComponents';
import { Bot, Send, Sparkles, User, Copy, Check, RefreshCw, MessageSquare, RotateCcw, Zap } from 'lucide-react';

export const DashboardChatView = ({ studentName = '' }) => {
  const getInitialGreeting = () => ({
    id: 1,
    sender: 'ASSISTANT',
    text: `Hello${studentName ? ` ${studentName.split(' ')[0]}` : ''}! I'm your Dashboard AI Assistant. Ask me anything about finding matching internships, improving your resume, or understanding application statuses.`
  });

  const [messages, setMessages] = useState([getInitialGreeting()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    { label: 'Find matching internships', prompt: 'Which internships on the portal best match my profile skills and CGPA?' },
    { label: 'Improve my profile', prompt: 'What steps should I take to improve my profile completion and stand out?' },
    { label: 'Prepare for internship', prompt: 'Give me top technical interview preparation tips for software engineering roles.' },
    { label: 'Explain application status', prompt: 'How does the application review process work after applying?' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const queryText = (textToSend || input || '').trim();
    if (!queryText || loading) return;

    const userMsg = { id: Date.now(), sender: 'USER', text: queryText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setLoading(true);
    setLastFailedMessage(null);

    const historyPayload = updatedMessages.slice(0, -1).map((m) => ({
      role: m.sender === 'USER' ? 'user' : 'model',
      text: m.text
    }));

    const aiMsgId = Date.now() + 1;
    let accumulatedText = '';
    let providerName = 'Google Gemini AI';
    let duration = null;

    try {
      // Stream response using fetch + reader
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      // Check if response is stream or JSON fallback
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ASSISTANT',
            text: data.response || 'Response received.',
            provider: data.provider,
            isFallback: data.isFallback
          }
        ]);
        setLoading(false);
        return;
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ASSISTANT',
          text: '',
          isStreaming: true
        }
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m))
                );
              }
              if (parsed.done) {
                providerName = parsed.provider || providerName;
                duration = parsed.durationMs;
              }
            } catch (e) {
              // Ignore line parse error
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: accumulatedText || 'No output generated.', isStreaming: false, provider: providerName, durationMs: duration }
            : m
        )
      );
    } catch (err) {
      console.warn('Dashboard Chat Stream fallback to standard chat endpoint:', err.message);
      try {
        const res = await api.post('/ai/chat', {
          message: queryText,
          history: historyPayload
        });
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ASSISTANT',
            text: res.data.response || 'Response received.',
            provider: res.data.provider,
            durationMs: res.data.durationMs,
            isFallback: res.data.isFallback
          }
        ]);
      } catch (fallbackErr) {
        setLastFailedMessage(queryText);
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ASSISTANT',
            isError: true,
            text: `Connection error (${fallbackErr.message}). Click 'Retry' to resend.`
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="flex flex-col h-[520px] p-0 overflow-hidden border-[var(--border-color)] shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-gradient-to-r from-[var(--primary)] via-indigo-600 to-purple-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-1.5">
              Dashboard AI Assistant <Sparkles className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
            </h3>
            <p className="text-[10px] text-white/80">Real-time career guidance & portal assistant</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMessages([getInitialGreeting()])}
          className="text-white border-white/30 hover:bg-white/20 text-xs py-1"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>

      {/* Quick Suggested Prompt Pills */}
      <div className="px-3 py-2 bg-[var(--bg-main)] border-b border-[var(--border-color)] flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.prompt)}
            disabled={loading}
            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-secondary)] transition-all shadow-2xs flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-[var(--primary)]" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[var(--bg-main)]/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ASSISTANT' && (
              <div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs relative group ${
                msg.sender === 'USER'
                  ? 'bg-[var(--primary)] text-white rounded-br-none shadow-xs font-medium'
                  : msg.isError
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-bl-none'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-none shadow-2xs'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text || (msg.isStreaming ? '...' : '')}</div>

              {msg.provider && (
                <div className="mt-2 pt-1 border-t border-[var(--border-color)]/30 flex items-center justify-between text-[9px] font-bold text-[var(--text-muted)]">
                  <span>✦ {msg.provider}</span>
                  {msg.durationMs && (
                    <span className="flex items-center gap-0.5 text-emerald-500">
                      <Zap className="w-2.5 h-2.5" /> {msg.durationMs}ms
                    </span>
                  )}
                </div>
              )}

              {msg.sender === 'ASSISTANT' && !msg.isError && msg.text && (
                <button
                  onClick={() => handleCopy(msg.id, msg.text)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-muted)] transition-opacity"
                  title="Copy response"
                >
                  {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            {msg.sender === 'USER' && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {lastFailedMessage && !loading && (
          <div className="flex justify-center my-2">
            <button
              onClick={() => handleSend(lastFailedMessage)}
              className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-rose-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Last Message
            </button>
          </div>
        )}

        {loading && (
          <div className="flex gap-2.5 items-center">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-ping" />
              InternHub AI generating streaming response...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center gap-2">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask AI anything... (Enter to send, Shift+Enter for new line)"
          className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)] resize-none max-h-20 overflow-y-auto disabled:opacity-50"
        />
        <Button type="submit" disabled={!input.trim() || loading} size="sm" className="px-4 py-2.5 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
};
