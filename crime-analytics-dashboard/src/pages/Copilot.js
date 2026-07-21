import React, { useState, useRef, useEffect } from 'react';
import { MdSend, MdSmartToy, MdAutoAwesome } from 'react-icons/md';
import { parseIntent } from '../features/copilot/intentParser';
import { executeQuery } from '../features/copilot/queryEngine';
import CopilotMessage from '../features/copilot/CopilotMessage';

function Copilot() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      content: 'Welcome Commissioner. I am MADHUKAR, the KSP AI Command Copilot. I can query spatial boundaries, find repeat offenders, parse FIR patterns, or generate tactical recommendations. How can I assist you today?',
      suggestions: [
        'Show today\'s critical cases',
        'Find repeat offenders in Bengaluru Urban',
        'Show robbery cases near Cubbon Park PS',
        'Generate daily status briefing'
      ],
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = (text) => {
    const queryText = (text || input).trim();
    if (!queryText) return;

    // User message
    const userMsg = {
      id: Math.random().toString(),
      type: 'user',
      content: queryText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // AI execution with thinking delay
    setTimeout(() => {
      const parsed = parseIntent(queryText);
      const output = executeQuery(parsed.intent, parsed.params);
      
      const aiMsg = {
        id: Math.random().toString(),
        type: 'ai',
        content: `Analyzing KSP Database... [Intent: ${parsed.intent}]. Here is the extracted operational intelligence:`,
        summary: output.summary,
        results: output.results,
        chartData: output.chartData,
        suggestions: output.suggestions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
    }, 800);
  };

  const presetQueries = [
    'Show robbery cases near schools',
    'Find repeat offenders in Bengaluru',
    'Show vehicle thefts after 10 PM',
    'List crimes involving same vehicle',
    'Find similar FIRs',
    'Generate daily status briefing'
  ];

  return (
    <div className="page-content animate-fade-in text-inverse">
      <div className="copilot-page">
        {/* Left Side: Chat Arena */}
        <div className="copilot-chat">
          <div className="copilot-banner">
            <MdSmartToy size={24} style={{ color: '#9b5de5' }} />
            <div>
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                MADHUKAR AI COPILOT
                <div className="copilot-dot" />
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>KSP Intelligence Command Center Assist</span>
            </div>
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
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
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
              placeholder="Ask copilot: 'Show robbery cases near Cubbon Park', 'Find repeat offenders'..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="copilot-send-btn" onClick={() => handleSend()}>
              <MdSend size={20} />
            </button>
          </div>
        </div>

        {/* Right Side: Quick presets */}
        <div className="copilot-sidebar">
          <article className="card" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <MdAutoAwesome style={{ color: 'var(--accent-gold)' }} />
              COGNITIVE QUICK QUERIES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default Copilot;
