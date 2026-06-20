import React, { useState, useEffect, useRef } from 'react';
import ChatThread from './components/ChatThread';
import MessageBubble from './components/MessageBubble';
import ModeSelector from './components/ModeSelector';
import DecisionForm from './components/DecisionForm';
import DecisionCard from './components/DecisionCard';
import BaselineQuestionnaire from './components/BaselineQuestionnaire';
import BaselineCard from './components/BaselineCard';
import RecommendationList from './components/RecommendationList';
import WhatIfSlider from './components/WhatIfSlider';
import { api } from './api';

function App() {
  const [userId, setUserId] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const userIdRef = useRef('');
  const [messages, setMessages] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [lastBaselineData, setLastBaselineData] = useState(null);
  
  // App states: 'welcome' | 'chatting'
  const [appState, setAppState] = useState('welcome');

  // Load username from localStorage if present on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('carboniq_user');
    if (savedUser) {
      setUserId(savedUser);
      setUserNameInput(savedUser);
      userIdRef.current = savedUser;
    }
  }, []);

  const addMessage = (role, children) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random().toString(36).substr(2, 9), role, children }
    ]);
  };

  const handleWelcomeSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = userNameInput.trim();
    if (!trimmedName) return;

    userIdRef.current = trimmedName;
    setUserId(trimmedName);
    localStorage.setItem('carboniq_user', trimmedName);
    setAppState('chatting');

    // Welcome message sequence
    addMessage('assistant', (
      <p>Connecting to CarbonIQ engine...</p>
    ));

    try {
      const res = await api.getSessions(trimmedName);
      const sessions = res.sessions || [];

      if (sessions.length > 0) {
        // Find most recent committed decision/baseline
        const committedSession = sessions.find(s => s.committed === true);
        const baselineSession = sessions.find(s => s.type === 'baseline');

        if (baselineSession) {
          setLastBaselineData(baselineSession.payload);
        }

        let welcomeText = `Welcome back, ${trimmedName}! It's great to see you again. `;
        if (committedSession) {
          if (committedSession.type === 'decision') {
            const savings = committedSession.payload?.comparison?.savingsKgIfBestChosenOverWorst || 0;
            welcomeText += `Last time, you committed to a green choice that saved ${savings} kg CO2e. Keep up the amazing work!`;
          } else {
            welcomeText += `I've loaded your profile history. You can audit it again or check trip options.`;
          }
        } else {
          welcomeText += `Ready to continue your carbon footprint tracking?`;
        }

        addMessage('assistant', <p>{welcomeText}</p>);
      } else {
        addMessage('assistant', (
          <p>
            Hello ${trimmedName}! I am <strong>CarbonIQ</strong>, your carbon-awareness assistant. I'm designed to help you analyze, track, and make sustainable carbon decisions in real-time.
          </p>
        ));
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      addMessage('assistant', (
        <p>Hello ${trimmedName}! I'm running in offline/local fallback mode. Let's get started!</p>
      ));
    }

    // Offer starting actions
    showModeSelector();
  };

  const showModeSelector = () => {
    addMessage('assistant', (
      <ModeSelector onSelect={handleModeSelect} />
    ));
  };

  const handleModeSelect = (mode) => {
    if (mode === 'decision') {
      addMessage('user', <p>I want to log a quick decision.</p>);
      addMessage('assistant', (
        <div>
          <p>Let's compare transport options for a specific trip. Tell me your trip distance and choose the modes of travel you'd like to compare.</p>
          <DecisionForm onSubmit={handleDecisionSubmit} />
        </div>
      ));
    } else if (mode === 'baseline') {
      addMessage('user', <p>I want to build my carbon profile.</p>);
      addMessage('assistant', (
        <div>
          <p>Let's run a complete lifestyle audit. Answer these questions to establish your profile.</p>
          <BaselineQuestionnaire onSubmit={handleBaselineSubmit} />
        </div>
      ));
    }
  };

  const handleDecisionSubmit = async ({ distanceKm, options }) => {
    addMessage('user', <p>Comparing travel options for a {distanceKm} km trip.</p>);
    addMessage('assistant', <p>Running comparison engine...</p>);

    try {
      const data = await api.compareDecision(distanceKm, options);
      
      // Append DecisionCard to the chat thread
      addMessage('assistant', (
        <DecisionCard data={data} />
      ));

      // Save session in background
      try {
        const sessionRecord = await api.createSession(userIdRef.current, 'decision', data);
        setCurrentSessionId(sessionRecord.id);

        if (data.comparison?.savingsKgIfBestChosenOverWorst > 0) {
          addMessage('assistant', (
            <div>
              <p>Would you like to commit to the lower-impact option (<strong>{data.comparison.best.label}</strong>)?</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCommitDecision(sessionRecord.id)}
                >
                  Yes, I commit!
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDeclineCommit}
                >
                  No, maybe next time
                </button>
              </div>
            </div>
          ));
        } else {
          showLoopSelector();
        }
      } catch (sessErr) {
        console.error('Session creation failed:', sessErr);
        showLoopSelector();
      }
    } catch (err) {
      console.error(err);
      addMessage('assistant', <p style={{ color: 'var(--color-high)' }}>Error comparing options: {err.message}</p>);
      showLoopSelector();
    }
  };

  const handleCommitDecision = async (sessionId) => {
    addMessage('user', <p>Yes, I commit to the greener option!</p>);
    addMessage('assistant', <p>Logging commitment...</p>);

    try {
      await api.commitSession(sessionId);
      addMessage('assistant', (
        <p>
          💚 <strong>Awesome choice!</strong> Your commitment has been logged. Making small green decisions in the moment is the most effective way to shift your long-term environmental impact.
        </p>
      ));
    } catch (err) {
      console.error(err);
      addMessage('assistant', <p>I've noted your preference! Every green choice counts.</p>);
    }

    showLoopSelector();
  };

  const handleDeclineCommit = () => {
    addMessage('user', <p>No, maybe next time.</p>);
    addMessage('assistant', <p>No problem! Staying informed is a great step on its own. What would you like to do next?</p>);
    showLoopSelector();
  };

  const handleBaselineSubmit = async (answers) => {
    addMessage('user', <p>Establishing my carbon footprint baseline...</p>);
    addMessage('assistant', <p>Analyzing habits and computing emissions...</p>);

    try {
      const calcData = await api.calculate(answers);
      
      // Request Gemini or fallback advice
      let adviceData = { advice: 'Calculating advice...', source: 'rule-based' };
      try {
        adviceData = await api.getAdvice(calcData.result, calcData.recommendations);
      } catch (adviceErr) {
        console.error('Could not get advice:', adviceErr);
      }

      // Save baseline session
      try {
        await api.createSession(userIdRef.current, 'baseline', calcData);
      } catch (sessErr) {
        console.error(sessErr);
      }

      // Append cards & AI summary to chat
      addMessage('assistant', (
        <div>
          <BaselineCard data={calcData} answers={answers} />
          
          <RecommendationList recommendations={calcData.recommendations} />
          
          <div className="embed-card" style={{ marginTop: '1.25rem' }} aria-label="Advisor feedback">
            <p style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
              CarbonIQ Advisor
              {adviceData.source === 'gemini' && (
                <span className="ai-badge">AI Enhanced</span>
              )}
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {adviceData.advice}
            </p>
          </div>

          <WhatIfSlider
            initialAnswers={answers}
            initialGrandTotal={calcData.result.grandTotal}
          />
        </div>
      ));

      addMessage('assistant', <p>Your lifestyle carbon baseline is successfully saved. What would you like to do next?</p>);
      showLoopSelector();
    } catch (err) {
      console.error(err);
      addMessage('assistant', <p style={{ color: 'var(--color-high)' }}>Error establishing baseline: {err.message}</p>);
      showLoopSelector();
    }
  };

  const showLoopSelector = () => {
    addMessage('assistant', (
      <div style={{ marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Would you like to analyze something else?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => handleModeSelect('decision')}>
            Compare another trip
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleModeSelect('baseline')}>
            Update/Re-audit Profile
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleResetUser}>
            Switch User
          </button>
        </div>
      </div>
    ));
  };

  const handleResetUser = () => {
    localStorage.removeItem('carboniq_user');
    userIdRef.current = '';
    setUserId('');
    setUserNameInput('');
    setMessages([]);
    setAppState('welcome');
  };

  return (
    <div className="app-container" role="main">
      <header>
        <h1>Carbon<span>IQ</span></h1>
        {userId && <div className="user-tag" id="user-tag">User: {userId}</div>}
      </header>

      {appState === 'welcome' ? (
        <div className="welcome-card">
          <div className="icon" aria-hidden="true">🌱</div>
          <h2>Analyze. Optimize. Reduce.</h2>
          <p>
            An intelligent carbon-awareness decision assistant. Build your ecological baseline or compare trip options in real-time.
          </p>
          <form onSubmit={handleWelcomeSubmit} style={{ marginTop: '1.5rem', width: '100%', maxWidth: '380px', margin: '1.5rem auto 0 auto' }}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label htmlFor="username-input">Enter your name or identifier</label>
              <input
                id="username-input"
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="e.g. Alex"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Launch CarbonIQ
            </button>
          </form>
        </div>
      ) : (
        <ChatThread>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role}>
              {msg.children}
            </MessageBubble>
          ))}
        </ChatThread>
      )}
    </div>
  );
}

export default App;
