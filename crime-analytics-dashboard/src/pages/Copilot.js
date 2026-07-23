import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MdSend, MdSmartToy, MdAutoAwesome, MdRefresh } from 'react-icons/md';
import CopilotMessage from '../features/copilot/CopilotMessage';
import { useSecurity } from '../context/SecurityContext';

const API_BASE = '/server/crime_api/api';

// Fallback: runs local queryEngine if the API is unreachable
async function fetchLocalFallback(message, history) {
  try {
    const { parseIntent } = await import('../features/copilot/intentParser');
    const { executeQuery } = await import('../features/copilot/queryEngine');
    const parsed = parseIntent(message);
    const output = executeQuery(parsed.intent, parsed.params);
    return {
      intent: parsed.intent,
      entities: parsed.params,
      answer: `[Offline mode] ${output.summary}`,
      summary: output.summary,
      results: output.results,
      chartData: output.chartData,
      suggestions: output.suggestions,
      sources: ['Local fallback — Data Store unavailable'],
      _offline: true,
    };
  } catch (_) {
    return {
      intent: 'ERROR',
      answer: 'The AI Copilot backend is currently unreachable. Please ensure the Catalyst dev server is running.',
      summary: 'Backend unavailable',
      results: [],
      chartData: [],
      suggestions: ['Try again in a moment', 'Restart catalyst serve'],
      sources: [],
      _offline: true,
    };
  }
}

function Copilot() {
  const { isCommandMode } = useSecurity();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      intent: 'WELCOME',
      content: 'Welcome Commissioner. I am MADHUKAR, the KSP AI Command Intelligence Copilot — powered by live Catalyst Data Store. I can:\n\n• Query real FIR records across all 31 Karnataka districts\n• Identify crime hotspots, temporal patterns, and repeat offenders\n• Cross-reference accused, victims, and case linkages\n• Generate intelligence briefings and risk assessments\n• Support officer workload and IO queries\n\nHow can I assist you today?',
      suggestions: [
        "Generate today's intelligence briefing",
        'Which district has the most heinous crimes?',
        'Find repeat offenders in Bengaluru City',
        'Show robbery cases in Mysuru this month',
      ],
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const handleSend = useCallback(async (text) => {
    const queryText = (text || input).trim();
    if (!queryText || isThinking) return;
    if (!isCommandMode) {
      window.alert('PII-protected AI queries require an unlocked Command session. Use the header lock control to verify access.');
      return;
    }

    const userMsg = {
      id: `u-${Date.now()}`,
      type: 'user',
      content: queryText,
      timestamp: new Date(),
    };

    // Build history payload for the backend (last 10 turns)
    const historyPayload = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({
        type: m.type,
        content: m.content,
        intent: m.intent || null,
        entities: m.entities || null,
      }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    let aiResponse;
    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: queryText, history: historyPayload }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      aiResponse = {
        id: `a-${Date.now()}`,
        type: 'ai',
        intent: data.intent,
        entities: data.entities,
        content: data.answer || data.summary || 'Query executed.',
        summary: data.summary,
        results: data.results || [],
        chartData: data.chartData || [],
        predictions: data.predictions || [],
        suggestions: data.suggestions || [],
        sources: data.sources || [],
        timestamp: new Date(),
      };
    } catch (err) {
      console.warn('[Copilot] API call failed, using local fallback:', err.message);
      const fallback = await fetchLocalFallback(queryText, historyPayload);
      aiResponse = {
        id: `a-${Date.now()}`,
        type: 'ai',
        ...fallback,
        timestamp: new Date(),
      };
    }

    setMessages(prev => [...prev, aiResponse]);
    setIsThinking(false);
  }, [input, isThinking, messages, isCommandMode]);

  const handleClear = () => {
    setMessages(prev => [prev[0]]); // keep welcome message
  };

  const presetQueries = [
    "Generate today's intelligence briefing",
    'Which district has the most crimes this month?',
    'Find repeat offenders in Bengaluru City',
    'Show robbery cases in Raichur',
    'Show crimes after 10 PM this week',
    'Predict crime risk for Kalaburagi',
    'Who is the IO for FIR 100230?',
    'Show pending cases in Mysuru',
  ];

  return (
    <div className="page-content animate-fade-in text-inverse">
      <div className="copilot-page">
        {/* Left Side: Chat Arena */}
        <div className="copilot-chat">
          <div className="copilot-banner">
            <MdSmartToy size={24} style={{ color: '#9b5de5' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                MADHUKAR AI COPILOT
                <div className="copilot-dot" />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                  LIVE DATA STORE
                </span>
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>KSP Intelligence Command Center — Karnataka Crime Analytics</span>
            </div>
            <button
              title="Clear conversation"
              onClick={handleClear}
              style={{
                background: 'transparent', border: '1px solid var(--border-color)',
                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px',
              }}
            >
              <MdRefresh size={14} /> Clear
            </button>
          </div>

          <div className="copilot-messages">
            {messages.map(msg => (
              <CopilotMessage key={msg.id} msg={msg} onSuggestionClick={handleSend} />
            ))}

            {isThinking && (
              <div className="chat-msg ai">
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #9b5de5 0%, #1976d2 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    boxShadow: '0 0 10px rgba(155, 93, 229, 0.4)'
                  }}>
                    <MdSmartToy size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Querying Catalyst Data Store…
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="copilot-input-bar">
            <input
              type="text"
              className="copilot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask MADHUKAR: 'Show robbery cases in Raichur', 'Find repeat offenders', 'Predict risk for Bengaluru'…"
              onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleSend()}
              disabled={isThinking}
            />
            <button
              className="copilot-send-btn"
              onClick={() => handleSend()}
              disabled={isThinking || !input.trim()}
            >
              <MdSend size={20} />
            </button>
          </div>
        </div>

        {/* Right Side: Quick presets */}
        <div className="copilot-sidebar">
          <article className="card" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <MdAutoAwesome style={{ color: 'var(--accent-gold)' }} />
              INTELLIGENCE QUERIES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => handleSend(q)}
                  disabled={isThinking}
                >
                  {q}
                </button>
              ))}
            </div>
          </article>

          {/* Status card */}
          <article className="card" style={{ padding: '12px 16px', background: 'var(--bg-panel)', marginTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Data Source</span>
                <span style={{ color: 'var(--accent-success, #22c55e)', fontWeight: 600 }}>● Catalyst Data Store</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Multi-turn History</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>● Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>QuickML Predictions</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>○ Not configured</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Conversation turns</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.max(0, messages.length - 1)}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default Copilot;
