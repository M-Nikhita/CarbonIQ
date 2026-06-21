import React, { useState, useEffect, useRef } from 'react';
import ChatThread from './components/ChatThread';
import MessageBubble from './components/MessageBubble';
import DecisionForm from './components/DecisionForm';
import DecisionCard from './components/DecisionCard';
import BaselineQuestionnaire from './components/BaselineQuestionnaire';
import BaselineCard from './components/BaselineCard';
import RecommendationList from './components/RecommendationList';
import WhatIfSlider from './components/WhatIfSlider';
import { api } from './api';

const triviaQuestions = [
  {
    q: "Which of these foods produces the highest greenhouse gas emissions per kilogram?",
    options: [
      { text: "🐔 Poultry", correct: false, explanation: "Poultry has moderate emissions (~6 kg CO2e/kg), which is much lower than beef." },
      { text: "🥩 Beef", correct: true, explanation: "Correct! Beef produces up to 60-99 kg CO2e per kg—nearly 10x higher than poultry and 50x higher than tofu due to enteric fermentation (methane) and pasture land requirements." },
      { text: "🍲 Tofu", correct: false, explanation: "Tofu has very low emissions (~3 kg CO2e/kg). Transitioning from beef to plant proteins cuts dietary impact by up to 90%." }
    ]
  },
  {
    q: "What percentage of a home's electric carbon footprint is eliminated by switching to a 100% renewable grid provider?",
    options: [
      { text: "About 25%", correct: false, explanation: "Switching power sources provides a much larger reduction since fossil fuel generation accounts for the vast majority of grid electricity carbon." },
      { text: "Around 60%", correct: false, explanation: "We can actually offset almost all of it!" },
      { text: "Over 90%", correct: true, explanation: "Correct! Sourcing electricity from certified wind, solar, or hydro utility plans eliminates ~92% to 95% of active household electric carbon." }
    ]
  },
  {
    q: "Per kilometer traveled, which commute method produces the lowest CO2e impact per passenger?",
    options: [
      { text: "🚗 Electric Vehicle (EV)", correct: false, explanation: "EVs are excellent (emitting ~50g/km), but single-occupant driving still consumes more energy per person than loaded public transit." },
      { text: "🚊 Mass Transit Metro / Subway", correct: true, explanation: "Correct! Electric subways and passenger trains emit only ~18-24g CO2e per passenger-kilometer, making them the lowest-impact motorized transit." },
      { text: "🚌 Local Diesel Bus", correct: false, explanation: "Diesel buses emit ~80-100g/km per passenger, which is higher than a fully electric train or subway." }
    ]
  }
];

function App() {
  // Authentication & Core State
  const [userId, setUserId] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [appState, setAppState] = useState('welcome'); // 'welcome' | 'dashboard'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'comparator' | 'history' | 'assistant'
  const [loggingIn, setLoggingIn] = useState(false);



  // Expanded Dashboard Trivia states
  const [activeTriviaQuestions, setActiveTriviaQuestions] = useState([]);
  const [currentTriviaIndex, setCurrentTriviaIndex] = useState(0);
  const [dashboardTriviaScore, setDashboardTriviaScore] = useState(0);
  const [dashboardTriviaState, setDashboardTriviaState] = useState('intro');
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState(null);
  const [isQAnswered, setIsQAnswered] = useState(false);

  // Landing page interactive carbon telemetry and hotspot scanner
  const [activeHotspot, setActiveHotspot] = useState('commute');


  // Sessions and History data
  const [sessions, setSessions] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [lastBaselineData, setLastBaselineData] = useState(null);

  // Active inputs & results states
  const [activeAnswers, setActiveAnswers] = useState(null);
  const [activeBaselineResult, setActiveBaselineResult] = useState(null);
  const [activeAdvice, setActiveAdvice] = useState('');
  const [adviceSource, setAdviceSource] = useState('rule-based');
  const [auditLoading, setAuditLoading] = useState(false);

  // Trip comparator states
  const [decisionResult, setDecisionResult] = useState(null);
  const [decisionInputs, setDecisionInputs] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Chat Assistant states
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  const userIdRef = useRef('');

  // Pre-load from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('carboniq_user');
    if (savedUser) {
      setUserId(savedUser);
      setUserNameInput(savedUser);
      userIdRef.current = savedUser;
    }
  }, []);



  const handleStartTriviaView = () => {
    const shuffled = [...triviaQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    setActiveTriviaQuestions(selected);
    setCurrentTriviaIndex(0);
    setDashboardTriviaScore(0);
    setSelectedAnswerIdx(null);
    setIsQAnswered(false);
    setDashboardTriviaState('intro');
    setCurrentView('trivia');
  };


  const addMessage = (role, text) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random().toString(36).substr(2, 9), role, text }
    ]);
  };

  const loadUserData = async (username) => {
    try {
      const res = await api.getSessions(username);
      const userSessions = res.sessions || [];
      setSessions(userSessions);
      
      const userCommitments = userSessions.filter(s => s.committed === true);
      setCommitments(userCommitments);

      // Find the most recent baseline audit session
      const baselineSession = userSessions.find(s => s.type === 'baseline');
      if (baselineSession && baselineSession.payload) {
        setLastBaselineData(baselineSession.payload);
        setActiveBaselineResult(baselineSession.payload.result);
        setActiveAnswers(baselineSession.payload.answers); // Wait, make sure we saved answers in payload
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleWelcomeSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = userNameInput.trim();
    if (!trimmedName) return;

    setLoggingIn(true);
    try {
      // Warm up API and load user sessions first to verify connection
      await loadUserData(trimmedName);

      userIdRef.current = trimmedName;
      setUserId(trimmedName);
      localStorage.setItem('carboniq_user', trimmedName);
      setAppState('dashboard');
      setCurrentView('dashboard');

      // Initial assistant greeting
      setMessages([
        {
          id: '1',
          role: 'assistant',
          text: `Hello ${trimmedName}! I am CarbonIQ, your carbon intelligence assistant. How can I help you analyze or reduce your footprint today?`
        }
      ]);
    } catch (err) {
      console.error('Welcome submit connection error:', err);
      alert('Connecting to CarbonIQ engine failed. Please verify your network connection and try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Reset User Session
  const handleResetUser = () => {
    localStorage.removeItem('carboniq_user');
    userIdRef.current = '';
    setUserId('');
    setUserNameInput('');
    setSessions([]);
    setCommitments([]);
    setLastBaselineData(null);
    setActiveBaselineResult(null);
    setActiveAnswers(null);
    setDecisionResult(null);
    setMessages([]);
    setAppState('welcome');
  };

  // 1. Audit / Baseline flow inside Dashboard View
  const handleBaselineSubmit = async (answers) => {
    setAuditLoading(true);
    try {
      const calcData = await api.calculate(answers);
      
      let adviceData = { advice: 'Tracking your profile is the first step toward reducing emissions.', source: 'rule-based' };
      try {
        adviceData = await api.getAdvice(calcData.result, calcData.recommendations);
      } catch (adviceErr) {
        console.error('Could not get advice:', adviceErr);
      }

      // Save baseline session payload
      const payload = { result: calcData.result, recommendations: calcData.recommendations, answers };
      await api.createSession(userIdRef.current, 'baseline', payload);

      setLastBaselineData(payload);
      setActiveBaselineResult(calcData.result);
      setActiveAnswers(answers);
      setActiveAdvice(adviceData.advice);
      setAdviceSource(adviceData.source);

      // Reload user data
      await loadUserData(userIdRef.current);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReAudit = () => {
    setLastBaselineData(null);
    setActiveBaselineResult(null);
    setActiveAnswers(null);
  };

  // 2. Trip comparator submission
  const handleDecisionSubmit = async ({ distanceKm, options }) => {
    setDecisionResult(null);
    setDecisionInputs({ distanceKm, options });
    try {
      const data = await api.compareDecision(distanceKm, options);
      setDecisionResult(data);

      // Save decision session
      const sessionRecord = await api.createSession(userIdRef.current, 'decision', data);
      setActiveSessionId(sessionRecord.id);
      
      // Reload user data in background
      await loadUserData(userIdRef.current);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommitDecision = async () => {
    if (!activeSessionId) return;
    try {
      await api.commitSession(activeSessionId);
      
      // Reload sessions and commitments
      await loadUserData(userIdRef.current);
      
      // Flash a brief alert or reset comparator view
      alert('Green commitment logged successfully! Your savings have been added to your timeline.');
      setDecisionResult(null);
      setDecisionInputs(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Conversational chatbot interface inside "Ask Assistant" Tab
  const handleSendChat = async (e) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    addMessage('user', query);
    setChatInput('');
    setAssistantLoading(true);

    try {
      const data = await api.chat(query, userIdRef.current, activeBaselineResult);
      addMessage('assistant', data.reply);
    } catch (err) {
      console.error('Chat error:', err);
      addMessage('assistant', "I'm not able to reach my AI assistant right now, but you can get a precise answer using Decision Mode or Baseline Mode above.");
    } finally {
      setAssistantLoading(false);
    }
  };

  // Math helper: sum of committed savings
  const calculateTotalSaved = () => {
    return commitments.reduce((acc, c) => {
      const savings = c.payload?.comparison?.savingsKgIfBestChosenOverWorst || 0;
      return acc + savings;
    }, 0);
  };

  return (
    <div className={`app-container ${appState === 'welcome' ? 'welcome-mode' : ''}`} role="main">
      {appState === 'welcome' ? (
        <div className="welcome-grid">
          <div className="welcome-hero">
            <div className="welcome-hero-content">
              <h1 className="welcome-logo">Carbon<span>IQ</span></h1>
              <p className="welcome-tagline">
                Your premium carbon intelligence gateway. Explore global emissions live and scan the interactive carbon hotspot map below to trace emission sources.
              </p>

              {/* Real-time Global Carbon Odometer Ticker */}
              <div className="live-odometer-box" aria-live="polite">
                <div className="odometer-title">GLOBAL EMISSIONS DETECTED TODAY</div>
                <EmissionsOdometer />
                <div className="odometer-footer">
                  <span className="live-dot" aria-hidden="true"></span> Telemetry ticking in real-time at ~1,170,000 kg / second worldwide.
                </div>
              </div>

              {/* Interactive Futuristic SVG blueprint and Hotspot Scanner */}
              <div className="blueprint-scanner">
                <div className="blueprint-map">
                  <svg viewBox="0 0 500 230" className="blueprint-svg">
                    {/* Grid Pattern Background */}
                    <defs>
                      <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
                    
                    {/* Glowing schematic paths */}
                    <path d="M 40 120 Q 200 30 380 180" fill="none" stroke="rgba(251, 191, 36, 0.08)" strokeWidth="3" />
                    <path d="M 40 120 Q 200 30 380 180" fill="none" stroke="var(--color-transport)" strokeWidth="1.5" strokeDasharray="6,4" className="flowing-line-transport" />

                    <path d="M 120 220 L 250 130 L 420 50" fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="3" />
                    <path d="M 120 220 L 250 130 L 420 50" fill="none" stroke="var(--color-energy)" strokeWidth="1.5" strokeDasharray="8,6" className="flowing-line-energy" />

                    {/* Vector Outlines */}
                    {/* Home Structure */}
                    <path d="M 230 115 L 250 95 L 270 115 L 270 145 L 230 145 Z" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1.5" />
                    {/* Power Grid Tower */}
                    <rect x="395" y="35" width="30" height="30" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1.5" />
                    <line x1="395" y1="65" x2="425" y2="35" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                    {/* Farm Fields */}
                    <circle cx="80" cy="170" r="22" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1.5" />
                    <line x1="80" y1="148" x2="80" y2="192" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                    <line x1="58" y1="170" x2="102" y2="170" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

                    {/* Interactive Radar Hotspots */}
                    {/* Commute Radar */}
                    <g 
                      className={`radar-group ${activeHotspot === 'commute' ? 'active' : ''}`}
                      onClick={() => setActiveHotspot('commute')}
                    >
                      <circle cx="210" cy="75" r="16" className="radar-ring" fill="none" />
                      <circle cx="210" cy="75" r="5" className="radar-core" />
                      <text x="210" y="60" className="radar-label" textAnchor="middle">COMMUTE</text>
                    </g>

                    {/* Home Utilities Radar */}
                    <g 
                      className={`radar-group ${activeHotspot === 'energy' ? 'active' : ''}`}
                      onClick={() => setActiveHotspot('energy')}
                    >
                      <circle cx="250" cy="130" r="16" className="radar-ring" fill="none" />
                      <circle cx="250" cy="130" r="5" className="radar-core" />
                      <text x="250" y="158" className="radar-label" textAnchor="middle">UTILITY</text>
                    </g>

                    {/* Diet Radar */}
                    <g 
                      className={`radar-group ${activeHotspot === 'diet' ? 'active' : ''}`}
                      onClick={() => setActiveHotspot('diet')}
                    >
                      <circle cx="80" cy="170" r="16" className="radar-ring" fill="none" />
                      <circle cx="80" cy="170" r="5" className="radar-core" />
                      <text x="80" y="145" className="radar-label" textAnchor="middle">DIET</text>
                    </g>

                    {/* Aviation Radar */}
                    <g 
                      className={`radar-group ${activeHotspot === 'aviation' ? 'active' : ''}`}
                      onClick={() => setActiveHotspot('aviation')}
                    >
                      <circle cx="340" cy="150" r="16" className="radar-ring" fill="none" />
                      <circle cx="340" cy="150" r="5" className="radar-core" />
                      <text x="340" y="135" className="radar-label" textAnchor="middle">FLIGHTS</text>
                    </g>
                  </svg>
                </div>

                {/* Hotspot details glass panel */}
                {activeHotspot === 'commute' && (
                  <div className="scanner-glass-panel" style={{ borderLeftColor: 'var(--color-transport)' }}>
                    <div className="panel-badge-row">
                      <span className="badge-pill" style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: 'var(--color-transport)' }}>TRANSPORT SYSTEM SCAN</span>
                      <span className="telemetry-txt">SIGNAL: ACTIVE</span>
                    </div>
                    <h4>Commuter Emissions Telemetry</h4>
                    <p className="scanner-desc">
                      Gasoline commutes emit ~<strong>171g CO2e/km</strong>. Switching to rail or light rail subway reduces your passenger impact by <strong>85% per kilometer</strong>.
                    </p>
                  </div>
                )}

                {activeHotspot === 'energy' && (
                  <div className="scanner-glass-panel" style={{ borderLeftColor: 'var(--color-energy)' }}>
                    <div className="panel-badge-row">
                      <span className="badge-pill" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-energy)' }}>UTILITY SYSTEMS SCAN</span>
                      <span className="telemetry-txt">SIGNAL: ACTIVE</span>
                    </div>
                    <h4>Residential Energy Grid Telemetry</h4>
                    <p className="scanner-desc">
                      Standard grids produce <strong>0.4kg CO2e/kWh</strong>. Sourcing power from 100% certified solar or wind contracts offsets up to <strong>92% of electrical footprint</strong>.
                    </p>
                  </div>
                )}

                {activeHotspot === 'diet' && (
                  <div className="scanner-glass-panel" style={{ borderLeftColor: 'var(--color-food)' }}>
                    <div className="panel-badge-row">
                      <span className="badge-pill" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: 'var(--color-food)' }}>AGRICULTURE GRID SCAN</span>
                      <span className="telemetry-txt">SIGNAL: ACTIVE</span>
                    </div>
                    <h4>Dietary Footprint Telemetry</h4>
                    <p className="scanner-desc">
                      Beef production generates <strong>60kg CO2e per kg</strong>. Substituting animal protein with grains, tofu, or vegetables cuts dietary footprints by over <strong>90%</strong>.
                    </p>
                  </div>
                )}

                {activeHotspot === 'aviation' && (
                  <div className="scanner-glass-panel" style={{ borderLeftColor: 'var(--color-consumption)' }}>
                    <div className="panel-badge-row">
                      <span className="badge-pill" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--color-consumption)' }}>AEROSPACE METRICS SCAN</span>
                      <span className="telemetry-txt">SIGNAL: ACTIVE</span>
                    </div>
                    <h4>Long-Haul Aviation Telemetry</h4>
                    <p className="scanner-desc">
                      Aviation releases ~<strong>150g CO2e/passenger-km</strong>. High-altitude contrails trap rising heat, <strong>doubling the net warming influence</strong> of flights.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="welcome-card-wrapper">
            <div className="welcome-card login-portal">
              <div className="portal-badge" aria-hidden="true">SECURE GATEWAY</div>
              <h2>Launch Dashboard</h2>
              <p>
                Enter your identifier to calculate your full baseline carbon footprint, run What-If simulations, and track green commitments.
              </p>
              <form onSubmit={handleWelcomeSubmit} style={{ marginTop: '1.25rem', width: '100%' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label htmlFor="username-input">Enter your name or identifier</label>
                  <input
                    id="username-input"
                    type="text"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="e.g. Alex"
                    disabled={loggingIn}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem' }}
                  disabled={loggingIn}
                >
                  {loggingIn ? 'Connecting to CarbonIQ Engine...' : 'Enter Dashboard →'}
                </button>
              </form>
              <div className="portal-footer">
                ⚡ Powered by Gemini AI • 🔒 Local Session Cache
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Sidebar Navigation */}
          <aside className="sidebar">
            <div className="sidebar-brand">
              <h1>Carbon<span>IQ</span></h1>
            </div>

            <nav className="nav-list" aria-label="Dashboard views navigation">
              <button
                type="button"
                className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                <span className="icon">📊</span> Dashboard & Audit
              </button>
              <button
                type="button"
                className={`nav-btn ${currentView === 'comparator' ? 'active' : ''}`}
                onClick={() => setCurrentView('comparator')}
              >
                <span className="icon">🚗</span> Trip Comparator
              </button>
              <button
                type="button"
                className={`nav-btn ${currentView === 'history' ? 'active' : ''}`}
                onClick={() => setCurrentView('history')}
              >
                <span className="icon">⏳</span> Commitments ({commitments.length})
              </button>
              <button
                type="button"
                className={`nav-btn ${currentView === 'assistant' ? 'active' : ''}`}
                onClick={() => setCurrentView('assistant')}
              >
                <span className="icon">💬</span> Ask Assistant
              </button>
              <button
                type="button"
                className={`nav-btn ${currentView === 'trivia' ? 'active' : ''}`}
                onClick={() => handleStartTriviaView()}
              >
                <span className="icon">🧠</span> Carbon Trivia
              </button>
            </nav>

            <div className="sidebar-footer">
              <div className="user-tag">User: {userId}</div>
              <button type="button" className="btn btn-danger" onClick={handleResetUser} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                Log Out / Reset
              </button>
            </div>
          </aside>

          {/* 2. Main Work Panel */}
          <main className="main-content">
            <header className="main-header">
              <h2>
                {currentView === 'dashboard' && 'Dashboard Overview'}
                {currentView === 'comparator' && 'Trip Comparator'}
                {currentView === 'history' && 'Commitment History'}
                {currentView === 'assistant' && 'AI Assistant Chat'}
                {currentView === 'trivia' && 'Carbon Trivia Challenge'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="user-tag" style={{ display: 'inline-block' }}>
                  🌳 Total Saved: <strong>{calculateTotalSaved().toLocaleString()} kg CO2e</strong>
                </span>
              </div>
            </header>

            {/* View Routers */}
            {currentView === 'dashboard' && (
              <div className="dashboard-grid">
                {!lastBaselineData ? (
                  <div className="stat-card dashboard-full-width" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>📋</span>
                    <h3>Profile Audit Required</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
                      Establish your baseline carbon profile to view metrics, comparisons, and personalized recommendations.
                    </p>
                    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                      <BaselineQuestionnaire onSubmit={handleBaselineSubmit} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Grand Total Card */}
                    <div className="stat-card">
                      <span className="stat-card-title">My Grand Total</span>
                      <div className="savings-highlight" style={{ fontSize: '3rem', color: '#fff' }}>
                        {activeBaselineResult?.grandTotal.toLocaleString()}
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>kg CO2e / yr</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Compare:
                        {activeBaselineResult?.comparison.vsGlobalAveragePercent > 0 
                          ? ` +${activeBaselineResult.comparison.vsGlobalAveragePercent}% vs Global Avg`
                          : ` ${activeBaselineResult?.comparison.vsGlobalAveragePercent}% vs Global Avg`
                        }
                      </p>
                      <button type="button" className="btn btn-secondary" onClick={handleReAudit} style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                        Re-Audit Profile
                      </button>
                    </div>

                    {/* Lifetime Savings Card */}
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(8, 12, 20, 0.4) 100%)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                      <span className="stat-card-title">Eco Achievements 🏆</span>
                      <div className="savings-highlight" style={{ fontSize: '3rem' }}>
                        {calculateTotalSaved().toLocaleString()}
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>kg Saved</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Logged from {commitments.length} committed travel decisions.
                      </p>
                    </div>

                    {/* Breakdown Chart Card */}
                    <div className="stat-card dashboard-full-width">
                      <span className="stat-card-title">Category Emission Breakdown</span>
                      {activeBaselineResult && (
                        <BaselineCard data={{ result: activeBaselineResult }} answers={activeAnswers} />
                      )}
                    </div>

                    {/* Advisor Feedback */}
                    {activeBaselineResult && (
                      <div className="stat-card">
                        <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          CarbonIQ Advisor
                          {adviceSource === 'gemini' && <span className="ai-badge">AI Enhanced</span>}
                        </span>
                        <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                          {activeAdvice || 'Review your baseline calculations to optimize lifestyle decisions. Switch commute habits or transition diets to achieve high-impact savings.'}
                        </p>
                        <RecommendationList recommendations={lastBaselineData?.recommendations} />
                      </div>
                    )}

                    {/* What-If Commuter Simulator */}
                    {activeAnswers && (
                      <div className="stat-card">
                        <span className="stat-card-title">Simulator</span>
                        <WhatIfSlider
                          initialAnswers={activeAnswers}
                          initialGrandTotal={activeBaselineResult?.grandTotal || 0}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {currentView === 'comparator' && (
              <div className="split-layout">
                {/* Left Pane: Form */}
                <div className="stat-card" style={{ height: 'fit-content' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)' }}>Compare Travel Choices</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Enter your trip distance and check the modes of travel to rank them live.
                  </p>
                  <DecisionForm onSubmit={handleDecisionSubmit} />
                </div>

                {/* Right Pane: Results */}
                <div className="stat-card" style={{ height: 'fit-content' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)' }}>Comparison Results</h3>
                  {decisionResult ? (
                    <div>
                      <DecisionCard data={decisionResult} />
                      {decisionResult.comparison?.savingsKgIfBestChosenOverWorst > 0 && (
                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Commit to the lower-impact option (<strong>{decisionResult.comparison.best.label}</strong>)?
                          </p>
                          <button type="button" className="btn btn-primary" onClick={handleCommitDecision} style={{ width: '100%' }}>
                            ✓ Yes, I commit!
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: '2.5rem' }}>📈</span>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Awaiting comparison input. Fill out the distance form on the left.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'history' && (
              <div style={{ padding: '2rem', maxWidth: '680px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Green Commitments Timeline</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Every committed green trip represents a concrete reduction in your overall environmental carbon footprint.
                </p>

                {commitments.length === 0 ? (
                  <div className="stat-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '2rem' }}>⏳</span>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      No commitments logged yet. Try comparing trip choices and clicking "Yes, I commit!".
                    </p>
                  </div>
                ) : (
                  <div className="commitment-timeline">
                    {commitments.map((c) => {
                      const savings = c.payload?.comparison?.savingsKgIfBestChosenOverWorst || 0;
                      const best = c.payload?.comparison?.best?.label || 'Greener choice';
                      const worst = c.payload?.comparison?.worst?.label || 'Heavier choice';
                      const dist = c.payload?.comparison?.distanceKm || 0;
                      
                      return (
                        <div key={c.id} className="commitment-item">
                          <div className="commitment-header">
                            <span>{new Date(c.committedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                            <span>{new Date(c.committedAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}</span>
                          </div>
                          <div className="commitment-box">
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                Committed to: {best}
                              </p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Avoided driving/flying {worst} for a {dist} km trip.
                              </p>
                            </div>
                            <span className="commitment-saved">
                              +{savings} kg CO2e saved
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentView === 'assistant' && (
              <div className="assistant-workspace">
                <ChatThread>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} role={msg.role}>
                      <p>{msg.text}</p>
                    </MessageBubble>
                  ))}
                  {assistantLoading && (
                    <MessageBubble role="assistant">
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Thinking...</p>
                    </MessageBubble>
                  )}
                </ChatThread>

                <form onSubmit={handleSendChat} className="chat-input-area" aria-label="Ask assistant chat form">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about reducing emissions, diet shifts, EV offsets..."
                    disabled={assistantLoading}
                    aria-label="Assistant question"
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={assistantLoading}>
                    Send
                  </button>
                </form>
              </div>
            )}

            {currentView === 'trivia' && (
              <div className="trivia-dashboard-container" style={{ padding: '2rem', maxWidth: '680px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Carbon Trivia Quiz</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Test your carbon and environmental IQ with randomly shuffled questions! Learn key metrics as you play.
                </p>

                <div className="trivia-widget" style={{ marginTop: 0 }}>
                  {dashboardTriviaState === 'intro' && (
                    <div className="trivia-step-container trivia-intro" style={{ textAlign: 'center', alignItems: 'center' }}>
                      <span className="trivia-badge">5-QUESTION CHALLENGE</span>
                      <h2>Boost Your Carbon IQ 🧠</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', margin: '0.75rem auto 1.5rem auto', maxWidth: '400px' }}>
                        Start a new quiz round! You'll get 5 randomized questions from our database to test your climate awareness.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setDashboardTriviaState('question')}
                      >
                        Start Challenge 🚀
                      </button>
                    </div>
                  )}

                  {dashboardTriviaState === 'question' && activeTriviaQuestions.length > 0 && (() => {
                    const currentQ = activeTriviaQuestions[currentTriviaIndex];
                    return (
                      <div className="trivia-step-container">
                        <div className="trivia-progress-bar">
                          <div className="progress-label">Question {currentTriviaIndex + 1} of 5</div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${((currentTriviaIndex + 1) / 5) * 100}%` }}></div>
                          </div>
                        </div>

                        <h3 className="trivia-question-text">{currentQ.q}</h3>

                        <div className="trivia-options-grid">
                          {currentQ.options.map((opt, idx) => {
                            let btnClass = 'trivia-option-btn';
                            if (isQAnswered) {
                              if (opt.correct) {
                                btnClass += ' correct';
                              } else if (idx === selectedAnswerIdx) {
                                btnClass += ' incorrect';
                              } else {
                                btnClass += ' disabled';
                              }
                            } else if (idx === selectedAnswerIdx) {
                              btnClass += ' selected';
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                className={btnClass}
                                disabled={isQAnswered}
                                onClick={() => {
                                  setSelectedAnswerIdx(idx);
                                  setIsQAnswered(true);
                                  if (opt.correct) {
                                    setDashboardTriviaScore(prev => prev + 1);
                                  }
                                }}
                              >
                                <span className="option-text">{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {isQAnswered && (
                          <div className="trivia-explanation-box">
                            <div className="explanation-title" style={{ color: currentQ.options[selectedAnswerIdx]?.correct ? 'var(--primary)' : 'var(--color-high)' }}>
                              {currentQ.options[selectedAnswerIdx]?.correct ? '🎉 Correct Answer!' : '❌ Incorrect Answer'}
                            </div>
                            <p className="explanation-content">
                              {currentQ.options[selectedAnswerIdx]?.explanation || currentQ.options.find(o => o.correct).explanation}
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ alignSelf: 'flex-end', marginTop: '0.75rem' }}
                              onClick={() => {
                                setSelectedAnswerIdx(null);
                                setIsQAnswered(false);
                                if (currentTriviaIndex === 4) {
                                  setDashboardTriviaState('results');
                                } else {
                                  setCurrentTriviaIndex(prev => prev + 1);
                                }
                              }}
                            >
                              {currentTriviaIndex === 4 ? 'Finish Challenge →' : 'Next Question →'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {dashboardTriviaState === 'results' && (
                    <div className="trivia-step-container trivia-results-step" style={{ textAlign: 'center', alignItems: 'center' }}>
                      <span className="trivia-badge">CHALLENGE COMPLETE</span>
                      <h2>Your Final Results</h2>

                      <div className="score-ring-wrapper">
                        <div className="score-ring">
                          <span className="score-value">{dashboardTriviaScore} / 5</span>
                          <span className="score-label">Correct</span>
                        </div>
                      </div>

                      <div className="score-rank-badge">
                        {dashboardTriviaScore === 5 && '🏆 Climate Genius'}
                        {dashboardTriviaScore >= 3 && dashboardTriviaScore <= 4 && '🌳 Eco Champion'}
                        {dashboardTriviaScore <= 2 && '🌱 Climate Explorer'}
                      </div>

                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: '1rem 0', maxWidth: '400px' }}>
                        {dashboardTriviaScore === 5 && 'Incredible! You got a perfect score. You possess elite carbon intelligence.'}
                        {dashboardTriviaScore >= 3 && dashboardTriviaScore <= 4 && 'Great work! You have strong environmental literacy. Keep learning to reach perfection.'}
                        {dashboardTriviaScore <= 2 && 'Good try! Climate science has many subtle nuances. Play again to shuffle a new set of questions and boost your score!'}
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            const shuffled = [...triviaQuestions].sort(() => 0.5 - Math.random());
                            const selected = shuffled.slice(0, 5);
                            setActiveTriviaQuestions(selected);
                            setCurrentTriviaIndex(0);
                            setDashboardTriviaScore(0);
                            setSelectedAnswerIdx(null);
                            setIsQAnswered(false);
                            setDashboardTriviaState('question');
                          }}
                        >
                          🔄 Play Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

function EmissionsOdometer() {
  const [emissions, setEmissions] = useState(0);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msSinceMidnight = now.getTime() - midnight.getTime();
    const initialVal = (msSinceMidnight / 1000) * 1170000;
    setEmissions(initialVal);

    const interval = setInterval(() => {
      setEmissions(prev => prev + 117); // 1,170,000 kg/sec -> 117 kg every 100ms
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="odometer-digits">
      {emissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="odometer-unit-badge">KG CO2e</span>
    </div>
  );
}

export default App;
