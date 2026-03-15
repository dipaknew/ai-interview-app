import { useEffect, useState } from 'react'

const BACKEND_BASE = 'http://localhost:8000'

function App() {
  const [questions, setQuestions] = useState([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [history, setHistory] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    fetch(BACKEND_BASE + '/questions')
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data)
        if (data.length > 0) setQuestion(data[0].text)
      })
    fetch(BACKEND_BASE + '/history').then((r) => r.json()).then(setHistory)
  }, [])

  const doInterview = async () => {
    const payload = { question, answer }
    const r = await fetch(BACKEND_BASE + '/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const out = await r.json()
    setFeedback(out.ai_feedback)
    setHistory((prev) => [out, ...prev])
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      setAudioFile(new File([blob], 'voice.webm', { type: 'audio/webm' }))
      setAudioPreviewUrl(URL.createObjectURL(blob))
    }
    recorder.start()
    setMediaRecorder(recorder)
    setRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setRecording(false)
    }
  }

  const transcribe = async () => {
    if (!audioFile) return
    const data = new FormData()
    data.append('file', audioFile)
    const r = await fetch(BACKEND_BASE + '/transcribe', {
      method: 'POST',
      body: data,
    })
    const out = await r.json()
    setTranscript(out.text)
  }

  return (
    <div className="app">
      <h1>AI Interview Preparation</h1>
      <section className="panel">
        <h2>Step 1: Choose question</h2>
        <select value={question} onChange={(e) => setQuestion(e.target.value)}>
          {questions.map((q) => (
            <option key={q.id} value={q.text}>{q.text}</option>
          ))}
        </select>

        <h2>Step 2: Your answer</h2>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} />
        <button onClick={doInterview}>Submit for AI feedback</button>

        <h3>AI Feedback:</h3>
        <pre>{feedback}</pre>
      </section>

      <section className="panel">
        <h2>Step 3: Voice record + transcription (Whisper)</h2>
        <div>
          {recording ? (
            <button onClick={stopRecording}>Stop recording</button>
          ) : (
            <button onClick={startRecording}>Start recording</button>
          )}
        </div>
        {audioPreviewUrl && (
          <div>
            <p>Recorded audio preview:</p>
            <audio controls src={audioPreviewUrl}></audio>
          </div>
        )}
        <button onClick={transcribe} disabled={!audioFile}>
          Send voice to backend for transcription
        </button>
        <p>{transcript}</p>
      </section>

      <section className="panel">
        <h2>Recent practice history</h2>
        {history.map((item) => (
          <div key={item.id} className="history-item">
            <strong>Q:</strong> {item.question}
            <br />
            <strong>A:</strong> {item.answer}
            <br />
            <strong>Feedback:</strong> {item.ai_feedback}
          </div>
        ))}
      </section>
    </div>
  )
}

export default App
