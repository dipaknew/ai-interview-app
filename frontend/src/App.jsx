import { useEffect, useState, useCallback, useRef } from 'react'
import './styles.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

const INTERVIEW_MINUTES = 30

const ROLE_ICONS = {
  // Development & Engineering
  'Full-Stack Developer':             '🌐',
  'Software Engineer':                '⚙️',
  'Mobile App Developer':             '📱',
  'QA/Automation Engineer':           '🧪',
  'Blockchain Developer':             '⛓️',
  // AI & Data
  'AI/ML Engineer':                   '🤖',
  'Data Scientist':                   '🔬',
  'Data Analyst':                     '📊',
  'Prompt Engineer':                  '💬',
  'NLP Specialist':                   '🗣️',
  // Cloud & Infrastructure
  'Cloud Architect':                  '☁️',
  'DevOps Engineer':                  '🔄',
  'Site Reliability Engineer (SRE)':  '🛡️',
  'Network Engineer':                 '🪶',
  'Systems Administrator':            '🖥️',
  // Cybersecurity
  'Cybersecurity Analyst':            '🔒',
  'Ethical Hacker / Penetration Tester': '🕵️',
  'Security Architect':               '🏛️',
  'Incident Responder':               '🚨',
  'Compliance/GRC Specialist':        '📋',
  // Management & Strategy
  'IT Project Manager':               '📅',
  'Product Manager':                  '🎯',
  'Business Systems Analyst':         '📈',
  'IT Director / CIO':                '👔',
  'Scrum Master':                     '🏃',
  // Design & Support
  'UX/UI Designer':                   '🎨',
  'IT Support Specialist':            '🛠️',
  'Technical Writer':                 '✍️',
  'Database Administrator (DBA)':     '🗄️',
  // Original
  'Python Developer':                 '🐍',
  'Java Developer':                   '☕',
}

const DEPT_ICONS = {
  'Development & Engineering': '🖥️',
  'AI & Data':                 '🤖',
  'Cloud & Infrastructure':    '☁️',
  'Cybersecurity':             '🔒',
  'Management & Strategy':     '💼',
  'Design & Support':          '🎨',
}


const REC_COLOR = {
  'Strong Hire': '#10b981',
  'Hire':        '#06b6d4',
  'Maybe':       '#f59e0b',
  'No Hire':     '#ef4444',
}
const REC_TEXT_COLOR = {
  'Strong Hire': 'var(--accent-emerald)',
  'Hire':        'var(--accent-cyan)',
  'Maybe':       'var(--accent-amber)',
  'No Hire':     'var(--accent-pink)',
}

function pad(n) { return String(n).padStart(2, '0') }

function ScoreBadge({ score, mini }) {
  if (score == null) return null
  const cls = score >= 7 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low'
  return <span className={`score-badge ${cls} ${mini ? 'score-badge-mini' : ''}`}>⭐ {score}/10</span>
}

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✅' : '❌'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

/* ── API helper ─────────────────────────────────────────────────────────────── */
async function api(path, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(BACKEND + path, { ...opts, headers })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || r.statusText)
  }
  return r.json()
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [auth,   setAuth]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('interviewai_auth')) || null }
    catch { return null }
  })
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const logout = () => {
    localStorage.removeItem('interviewai_auth')
    setAuth(null)
  }

  if (!auth) return <LoginPage onLogin={setAuth} addToast={addToast} toasts={toasts} />
  if (auth.role === 'admin') return <AdminDashboard auth={auth} onLogout={logout} addToast={addToast} toasts={toasts} />
  return <StudentApp auth={auth} onLogout={logout} addToast={addToast} toasts={toasts} />
}

/* ══════════════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, addToast, toasts }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      addToast('Please enter username and password', 'error'); return
    }
    setLoading(true)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      })
      localStorage.setItem('interviewai_auth', JSON.stringify(data))
      addToast(`Welcome, ${data.full_name || data.username}! 👋`)
      onLogin(data)
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toast toasts={toasts} />
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">🎤</div>
          <h1 className="login-title">InterviewAI</h1>
          <p className="login-sub">AI-powered interview practice for students</p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username" type="text"
                placeholder="e.g. student01 or admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-wrapper">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="show-pass-btn" onClick={() => setShowPass(p => !p)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button id="btn-login" type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in…</> : <><span>🚀</span> Sign In</>}
            </button>
          </form>

          <div className="login-hint">
            Contact your teacher for your username & password
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ auth, onLogout, addToast, toasts }) {
  const [overview,  setOverview]  = useState(null)
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [toggling,  setToggling]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, studs] = await Promise.all([
        api('/admin/overview', {}, auth.access_token),
        api('/admin/students', {}, auth.access_token),
      ])
      setOverview(ov)
      setStudents(studs)
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [auth.access_token]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const toggleStudent = async (student) => {
    setToggling(student.id)
    try {
      const r = await api(`/admin/students/${student.id}/toggle`, { method: 'PATCH' }, auth.access_token)
      addToast(`${r.username} is now ${r.is_active ? 'enabled ✅' : 'disabled 🚫'}`)
      load()
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setToggling(null)
    }
  }

  const isActiveNow = (last_login) => {
    if (!last_login) return false
    return (Date.now() - new Date(last_login + 'Z').getTime()) < 30 * 60 * 1000
  }

  return (
    <>
      <Toast toasts={toasts} />
      <div className="app admin-page">
        {/* ── Header ── */}
        <header className="admin-header">
          <div>
            <div className="admin-title">🎓 Teacher Dashboard</div>
            <div className="admin-subtitle">Monitor your 22 students in real time</div>
          </div>
          <button className="btn btn-ghost" onClick={onLogout}>Sign Out</button>
        </header>

        {loading ? (
          <div className="admin-loading">
            <div className="submitting-spinner" style={{ margin: '4rem auto' }} />
          </div>
        ) : (
          <>
            {/* ── Overview cards ── */}
            {overview && (
              <div className="admin-overview-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">👥</div>
                  <div className="admin-stat-value">{overview.total_students}</div>
                  <div className="admin-stat-label">Total Students</div>
                </div>
                <div className="admin-stat-card active-card">
                  <div className="admin-stat-icon">🟢</div>
                  <div className="admin-stat-value">{overview.active_now}</div>
                  <div className="admin-stat-label">Active Now (30 min)</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">📝</div>
                  <div className="admin-stat-value">{overview.total_sessions}</div>
                  <div className="admin-stat-label">Sessions Done</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">⭐</div>
                  <div className="admin-stat-value">{overview.platform_avg_score ?? '—'}</div>
                  <div className="admin-stat-label">Platform Avg Score</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">❓</div>
                  <div className="admin-stat-value">{overview.total_questions}</div>
                  <div className="admin-stat-label">Questions in DB</div>
                </div>
              </div>
            )}

            {/* ── Credentials box ── */}
            <div className="credentials-box">
              <div className="credentials-title">📋 Student Login Credentials</div>
              <div className="credentials-grid">
                <div><span className="cred-label">Usernames:</span> student01 → student22</div>
                <div><span className="cred-label">Password:</span> student@2024</div>
                <div><span className="cred-label">Admin:</span> admin / admin@2024</div>
              </div>
            </div>

            {/* ── Students table ── */}
            <div className="admin-table-card">
              <div className="admin-table-header">
                <div className="admin-table-title">Student Activity</div>
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={load}>
                  🔄 Refresh
                </button>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Sessions</th>
                      <th>Avg Score</th>
                      <th>Best</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id} className={!s.is_active ? 'row-disabled' : ''}>
                        <td className="td-num">{i + 1}</td>
                        <td className="td-name">{s.full_name || '—'}</td>
                        <td className="td-user">{s.username}</td>
                        <td>
                          {isActiveNow(s.last_login)
                            ? <span className="status-badge online">🟢 Online</span>
                            : s.last_login
                              ? <span className="status-badge visited">🔵 Visited</span>
                              : <span className="status-badge never">⚪ Never</span>
                          }
                        </td>
                        <td className="td-date">
                          {s.last_login
                            ? new Date(s.last_login + 'Z').toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </td>
                        <td className="td-center">{s.total_sessions || 0}</td>
                        <td className="td-center">
                          {s.avg_score != null ? <ScoreBadge score={s.avg_score} mini /> : '—'}
                        </td>
                        <td className="td-center">
                          {s.best_score != null ? <ScoreBadge score={s.best_score} mini /> : '—'}
                        </td>
                        <td>
                          <button
                            className={`btn ${s.is_active ? 'btn-ghost' : 'btn-success'}`}
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}
                            onClick={() => toggleStudent(s)}
                            disabled={toggling === s.id}
                          >
                            {toggling === s.id ? '…' : s.is_active ? '🚫 Disable' : '✅ Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   STUDENT APP (setup → interview → results)
══════════════════════════════════════════════════════════════════════════════ */
function StudentApp({ auth, onLogout, addToast, toasts }) {
  const [departments, setDepartments] = useState({})          // { dept: [roles] }
  const [expLevels,   setExpLevels]   = useState([])
  const [selDept,     setSelDept]     = useState('')
  const [selRole,     setSelRole]     = useState('')
  const [selExp,      setSelExp]      = useState('')
  const [sessionId,   setSessionId]   = useState(null)
  const [questions,   setQuestions]   = useState([])
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [answers,     setAnswers]     = useState([])
  const [draft,       setDraft]       = useState('')
  const [audioFile,   setAudioFile]   = useState(null)
  const [recording,   setRecording]   = useState(false)
  const [mediaRec,    setMediaRec]    = useState(null)
  const [audioUrl,    setAudioUrl]    = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [secondsLeft,  setSecondsLeft]  = useState(INTERVIEW_MINUTES * 60)
  const timerRef = useRef(null)
  const [results,    setResults]    = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [page,       setPage]       = useState('setup')

  useEffect(() => {
    api('/roles').then(d => {
      setDepartments(d.departments)
      setExpLevels(d.experience_levels)
      setSelExp(d.experience_levels[0])
      // default first dept + first role
      const firstDept  = Object.keys(d.departments)[0]
      const firstRole  = d.departments[firstDept][0]
      setSelDept(firstDept)
      setSelRole(firstRole)
    }).catch(() => addToast('Cannot reach backend', 'error'))
  }, []) // eslint-disable-line

  // When dept changes → reset role to first of that dept
  const handleDeptChange = (dept) => {
    setSelDept(dept)
    setSelRole(departments[dept]?.[0] || '')
  }

  useEffect(() => {
    if (page !== 'interview') return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          addToast('⏰ Time is up! Auto-submitting…', 'error')
          doSubmit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [page]) // eslint-disable-line

  const startSession = async () => {
    try {
      const d = await api('/session/start', {
        method: 'POST',
        body: JSON.stringify({ role: selRole, experience: selExp, num_questions: 10 }),
      }, auth.access_token)
      setSessionId(d.session_id); setQuestions(d.questions)
      setCurrentIdx(0); setAnswers([]); setDraft('')
      setSecondsLeft(INTERVIEW_MINUTES * 60); setPage('interview')
    } catch (e) { addToast(e.message, 'error') }
  }

  const saveAndNext = () => {
    const all = [...answers.filter(a => a.question_index !== currentIdx),
      { question_index: currentIdx, question: questions[currentIdx], answer: draft.trim() }]
    setAnswers(all); setDraft(''); clearAudio()
    if (currentIdx < questions.length - 1) setCurrentIdx(i => i + 1)
  }

  const goBack = () => {
    if (draft.trim())
      setAnswers(prev => [...prev.filter(a => a.question_index !== currentIdx),
        { question_index: currentIdx, question: questions[currentIdx], answer: draft.trim() }])
    setCurrentIdx(i => i - 1)
    const prev = answers.find(a => a.question_index === currentIdx - 1)
    setDraft(prev ? prev.answer : '')
  }

  const doSubmit = async () => {
    clearInterval(timerRef.current); setSubmitting(true)
    const cur = { question_index: currentIdx, question: questions[currentIdx], answer: draft.trim() }
    const all = [...answers.filter(a => a.question_index !== currentIdx), cur]
    const filled = questions.map((q, i) => all.find(a => a.question_index === i) || { question_index: i, question: q, answer: '' })
    try {
      const data = await api(`/session/${sessionId}/submit`, {
        method: 'POST', body: JSON.stringify({ answers: filled }),
      }, auth.access_token)
      setResults(data); setPage('results')
    } catch (e) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream); const chunks = []
      rec.ondataavailable = e => chunks.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioFile(new File([blob], 'voice.webm', { type: 'audio/webm' }))
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start(); setMediaRec(rec); setRecording(true)
    } catch { addToast('Microphone access denied', 'error') }
  }
  const stopRec  = () => { if (mediaRec) { mediaRec.stop(); setRecording(false) } }
  const clearAudio = () => { setAudioFile(null); setAudioUrl('') }
  const transcribe = async () => {
    if (!audioFile) return
    setTranscribing(true)
    try {
      const fd = new FormData(); fd.append('file', audioFile)
      const d = await fetch(BACKEND + '/transcribe', { method: 'POST', body: fd }).then(r => r.json())
      setDraft(d.text); addToast('Voice transcribed ✓')
    } catch { addToast('Transcription failed', 'error') }
    finally { setTranscribing(false) }
  }

  const resetAll = () => {
    setPage('setup'); setResults(null); setSessionId(null)
    setQuestions([]); setAnswers([]); setCurrentIdx(0)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const danger = secondsLeft < 300
  const progress = (currentIdx / questions.length) * 100

  /* ── SETUP ── */
  if (page === 'setup') return (
    <>
      <Toast toasts={toasts} />
      <div className="app setup-page">
        <header className="app-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '1rem' }}>
            <div className="user-pill">👤 {auth.full_name || auth.username}</div>
            <button className="btn btn-ghost" style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }} onClick={onLogout}>Sign Out</button>
          </div>
          <div className="header-badge"><span className="header-badge-dot" />AI-Powered Interview Coach</div>
          <h1>Ace Your Next Interview</h1>
          <p>10 role-specific questions · 30-minute timer · Real AI evaluation</p>
        </header>

        <div className="setup-card">
          <div className="setup-card-title">Configure Your Interview</div>

          {/* Step 1 — Department */}
          <div className="setup-step-label">
            <span className="setup-step-num">1</span> Choose a Department
          </div>
          <div className="dept-grid">
            {Object.keys(departments).map(dept => (
              <button
                key={dept}
                className={`dept-card ${selDept === dept ? 'dept-card-active' : ''}`}
                onClick={() => handleDeptChange(dept)}
              >
                <span className="dept-card-icon">{DEPT_ICONS[dept] || '💼'}</span>
                <span className="dept-card-label">{dept}</span>
                <span className="dept-card-count">{departments[dept]?.length} roles</span>
              </button>
            ))}
          </div>

          {/* Step 2 — Role + Experience */}
          {selDept && (
            <>
              <div className="setup-step-label" style={{ marginTop: '1.5rem' }}>
                <span className="setup-step-num">2</span> Select Role & Experience
              </div>
              <div className="role-selectors">
                <div className="role-field">
                  <label htmlFor="role-select">Your Role</label>
                  <div className="select-wrapper">
                    <select id="role-select" value={selRole} onChange={e => setSelRole(e.target.value)}>
                      {(departments[selDept] || []).map(r => (
                        <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="role-field">
                  <label htmlFor="exp-select">Experience Level</label>
                  <div className="select-wrapper">
                    <select id="exp-select" value={selExp} onChange={e => setSelExp(e.target.value)}>
                      {expLevels.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {selRole && (
                <div className="role-active-badge">
                  <span>{DEPT_ICONS[selDept]}</span><span>{selDept}</span>
                  <span className="role-active-sep">›</span>
                  <span>{ROLE_ICONS[selRole]}</span><span>{selRole}</span>
                  <span className="role-active-sep">·</span><span>{selExp}</span>
                </div>
              )}
            </>
          )}

          <div className="setup-info-grid" style={{ marginTop: '1.5rem' }}>
            {[['📝','10 Questions','Role-specific, random'],['⏱️','30 Minutes','Timed like real interview'],
              ['🤖','AI Scoring','GPT-4o-mini evaluates all'],['🎙️','Voice Support','Speak or type answers']
            ].map(([icon, label, desc]) => (
              <div key={label} className="setup-info-item">
                <div className="setup-info-icon">{icon}</div>
                <div className="setup-info-label">{label}</div>
                <div className="setup-info-desc">{desc}</div>
              </div>
            ))}
          </div>
          <button id="btn-start" className="btn btn-primary btn-lg btn-block" onClick={startSession}
            disabled={!selRole || !selExp || !selDept}>
            <span>🚀</span> Start Interview
          </button>
        </div>
      </div>
    </>
  )

  /* ── INTERVIEW ── */
  if (page === 'interview') return (
    <>
      <Toast toasts={toasts} />
      <div className="app interview-page">
        {/* Top bar */}
        <div className="interview-topbar">
          <div className="interview-role-pill">{ROLE_ICONS[selRole]} {selRole} · {selExp}</div>
          <div className="interview-progress-wrap">
            <div className="interview-progress-label">Q{currentIdx + 1} of {questions.length}</div>
            <div className="interview-progress-bar">
              <div className="interview-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className={`interview-timer ${danger ? 'timer-danger' : ''}`}>
            <span className="timer-icon">{danger ? '🔴' : '⏱️'}</span>
            {pad(mins)}:{pad(secs)}
          </div>
        </div>

        {/* Question */}
        <div className="question-card">
          <div className="question-card-num">Q{currentIdx + 1}</div>
          <div className="question-card-text">{questions[currentIdx]}</div>
        </div>

        {/* Answer */}
        <div className="answer-card">
          <div className="answer-block-header">
            <label htmlFor="draft-answer">Your Answer</label>
            <div className="answer-mode-hint">Type or use the mic 🎙️</div>
          </div>
          <div className="answer-input-row">
            <div className="answer-textarea-wrap">
              <textarea id="draft-answer" rows={7} value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Type your answer… Use the STAR method for behavioural questions." />
              <div className="textarea-footer"><span className="char-count">{draft.length} chars</span></div>
            </div>
            <div className="mic-column">
              <div className="record-btn-wrapper">
                <div className={`record-btn-ring ${recording ? 'active' : ''}`} />
                <button id="btn-record" className={`record-btn ${recording ? 'recording' : 'idle'}`}
                  onClick={recording ? stopRec : startRec}>
                  {recording ? '⏹' : '🎙️'}
                </button>
              </div>
              <div className={`mic-label ${recording ? 'recording' : 'idle'}`}>
                {recording ? <span className="rec-indicator"><span className="rec-dot" />REC</span> : 'Voice'}
              </div>
            </div>
          </div>
          {audioUrl && (
            <div className="audio-row">
              <div className="audio-preview audio-preview-compact">
                <span>🎵</span><audio controls src={audioUrl} />
              </div>
              <div className="recorder-actions">
                <button className="btn btn-success" onClick={transcribe} disabled={transcribing}>
                  {transcribing ? <><span className="spinner" /> Transcribing…</> : <><span>📝</span> Use as Answer</>}
                </button>
                <button className="btn btn-ghost" onClick={clearAudio}>🗑 Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="interview-nav">
          <button className="btn btn-ghost" onClick={goBack} disabled={currentIdx === 0}>← Back</button>
          <div className="interview-nav-dots">
            {questions.map((_, i) => {
              const done = i < currentIdx || answers.some(a => a.question_index === i)
              return <div key={i} className={`nav-dot ${i === currentIdx ? 'active' : done ? 'done' : ''}`} />
            })}
          </div>
          {currentIdx < questions.length - 1
            ? <button id="btn-next" className="btn btn-primary" onClick={saveAndNext}>Next →</button>
            : <button id="btn-submit" className="btn btn-submit" onClick={doSubmit} disabled={submitting}>
                {submitting ? <><span className="spinner" /> Evaluating…</> : <><span>🚀</span> Submit Interview</>}
              </button>
          }
        </div>

        {submitting && (
          <div className="submitting-overlay">
            <div className="submitting-card">
              <div className="submitting-spinner" />
              <div className="submitting-title">AI is evaluating your interview…</div>
              <div className="submitting-sub">GPT-4o-mini is scoring all {questions.length} answers</div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  /* ── RESULTS ── */
  if (page === 'results' && results) {
    const recColor = REC_COLOR[results.recommendation] || '#7c3aed'
    return (
      <>
        <Toast toasts={toasts} />
        <div className="app results-page">
          <div className="results-hero">
            <div className="results-hero-badge"><span className="header-badge-dot" />Interview Complete</div>
            <div className="results-score-ring" style={{ '--ring-color': recColor }}>
              <div className="results-score-value">{results.overall_score?.toFixed(1)}</div>
              <div className="results-score-label">out of 10</div>
            </div>
            <div className="results-recommendation" style={{ color: recColor }}>{results.recommendation}</div>
            <div className="results-role-tag">{ROLE_ICONS[results.role]} {results.role} · {results.experience}</div>
          </div>

          <div className="results-feedback-card">
            <div className="results-section-title">🤖 AI Coach Summary</div>
            <div className="results-overall-feedback">{results.overall_feedback}</div>
          </div>

          <div className="results-section-title" style={{ marginTop: '2rem' }}>📋 Question-by-Question Breakdown</div>
          <div className="results-qa-list">
            {results.answers.map((ans, i) => (
              <div key={i} className="results-qa-item">
                <div className="results-qa-header">
                  <div className="results-qa-num">Q{i + 1}</div>
                  <div className="results-qa-question">{ans.question}</div>
                  <ScoreBadge score={ans.score} mini />
                </div>
                <div className="results-qa-answer">
                  <strong>Your answer:</strong>{' '}
                  {ans.answer || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}
                </div>
                {ans.feedback && <div className="results-qa-feedback">💡 {ans.feedback}</div>}
              </div>
            ))}
          </div>

          <div className="results-actions">
            <button className="btn btn-primary btn-lg" onClick={resetAll}>🔁 Start New Interview</button>
          </div>
        </div>
      </>
    )
  }

  return null
}
