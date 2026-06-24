import React, { useState } from 'react';
import Header from '../components/Header';
import { useAuth, API_BASE } from '../context/AuthContext';
import { Bot, Sparkles, Send, Loader, ArrowRight } from 'lucide-react';

export default function WorkflowAssistant() {
  const { token, user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Workflow Assistant. I can summarize campaigns, suggest operational actions, and analyze booking trends. How can I help you today?' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt;
    setPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // We pass some mock context data. In a real app we'd fetch bookings or campaigns first.
      const res = await fetch(`${API_BASE}/workflow/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt: userMessage,
          context_data: [{ context: 'mock_data' }] 
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error while processing your request.' }]);
      }
    } catch (err) {
      console.error('AI error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Network error connecting to the AI engine.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to use the Workflow Assistant.</p>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="AI Workflow Assistant" 
        subtitle="Automate tasks, get summaries, and analyze operations with AI." 
      />

      <div className="dashboard-row" style={{ height: 'calc(100vh - 200px)' }}>
        
        {/* Main Chat Interface */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-emerald)' }}>
                    <Bot size={20} />
                  </div>
                )}
                
                <div style={{ 
                  backgroundColor: msg.role === 'user' ? 'var(--brand-navy)' : '#F8FAFC',
                  color: msg.role === 'user' ? '#FFF' : 'var(--text-primary)',
                  padding: '16px',
                  borderRadius: '16px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-card)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-emerald)' }}>
                  <Loader size={20} className="spin" />
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', borderTopLeftRadius: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Processing request...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Ask me to summarize bookings, recommend campaigns, or analyze data..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              style={{ flexGrow: 1, padding: '16px', borderRadius: '12px' }}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()} style={{ borderRadius: '12px', padding: '0 24px' }}>
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Suggested Prompts Side Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#D97706' }} /> Suggested Actions
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPrompt("Summarize the latest bookings and their status.")}
              style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px' }}
            >
              <ArrowRight size={16} style={{ color: 'var(--brand-emerald)' }} /> Summarize Bookings
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPrompt("Recommend a new campaign for next month.")}
              style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px' }}
            >
              <ArrowRight size={16} style={{ color: 'var(--brand-emerald)' }} /> Recommend Campaign
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPrompt("Are there any priority actions I need to take?")}
              style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px' }}
            >
              <ArrowRight size={16} style={{ color: 'var(--brand-emerald)' }} /> View Priority Actions
            </button>
          </div>
        </div>

      </div>

      <style>{`
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
