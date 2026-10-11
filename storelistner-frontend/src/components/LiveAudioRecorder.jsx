import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, Volume2, Globe, Radio, Sparkles, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export default function LiveAudioRecorder({ socket, storeCode = 'STORE-NYC-01', storeName = 'Apple Store 5th Ave', salesRep = 'Specialist', onSessionSaved }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState('ur-PK'); // 'ur-PK' | 'pa-IN' | 'en-US'
  const [sessionId, setSessionId] = useState(null);
  const [seconds, setSeconds] = useState(0);

  const [transcripts, setTranscripts] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [probability, setProbability] = useState(50);
  const [detectedProduct, setDetectedProduct] = useState('Listening...');
  const [detectedObjection, setDetectedObjection] = useState('None');
  const [closureAlert, setClosureAlert] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  // Audio Context & MediaRecorder refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognizerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const transcriptFeedRef = useRef(null);

  // Initialize Speech Recognition
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return null;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = language;

    recognizer.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim.trim()) {
        setInterimText(interim.trim());
        if (socket && sessionId) {
          socket.emit('live_transcript_stream', {
            sessionId,
            text: interim.trim(),
            speaker: 'customer',
            isFinal: false
          });
        }
      }

      if (final.trim()) {
        handleFinalUtterance(final.trim());
      }
    };

    recognizer.onerror = (e) => {
      console.warn('Speech recognizer error:', e.error);
    };

    recognizer.onend = () => {
      if (isRecording && !isPaused && speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.lang = language;
          speechRecognizerRef.current.start();
        } catch (err) {}
      }
    };

    return recognizer;
  };

  // Change language dynamically
  useEffect(() => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.lang = language;
      if (isRecording) {
        try {
          speechRecognizerRef.current.stop();
          setTimeout(() => {
            if (isRecording) speechRecognizerRef.current.start();
          }, 200);
        } catch (e) {}
      }
    }
  }, [language]);

  // Handle final speech utterance
  const handleFinalUtterance = async (text, speakerOverride = null) => {
    setInterimText('');
    const speaker = speakerOverride || detectProbableSpeaker(text);

    const newItem = {
      timestamp: new Date(),
      speaker,
      text
    };

    setTranscripts(prev => [...prev, newItem]);

    // Stream to Socket for real-time Admin monitor
    if (socket && sessionId) {
      socket.emit('live_transcript_stream', {
        sessionId,
        text,
        speaker,
        isFinal: true
      });
    }

    // Push to backend REST API
    if (sessionId) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, speaker })
        });
        const data = await res.json();
        if (data.success && data.realtimeAnalysis) {
          const ai = data.realtimeAnalysis;
          if (ai.probability) setProbability(ai.probability);
          if (ai.detectedProducts && ai.detectedProducts.length > 0) {
            setDetectedProduct(ai.detectedProducts[0]);
          }
          if (ai.detectedObjection) {
            setDetectedObjection(ai.detectedObjection);
          }
          if (ai.isClosingSignal) {
            setClosureAlert(ai.closingMatch || text);
            setProbability(95);
          }
        }
      } catch (err) {
        console.warn('Transcript save error:', err.message);
      }
    }

    // Scroll to bottom
    if (transcriptFeedRef.current) {
      transcriptFeedRef.current.scrollTop = transcriptFeedRef.current.scrollHeight;
    }
  };

  const detectProbableSpeaker = (text) => {
    const lower = text.toLowerCase();
    if (
      lower.includes('کتنے کا') || lower.includes('کی ریٹ') || lower.includes('رعایت') ||
      lower.includes('کم کرو') || lower.includes('وارنٹی') || lower.includes('پرانا فون') ||
      lower.includes('how much') || lower.includes('can i') || lower.includes('discount') ||
      lower.includes('مہنگا') || lower.includes('mehnga') || lower.includes('le lu')
    ) {
      return 'customer';
    }
    if (
      lower.includes('خوش آمدید') || lower.includes('جی سر') || lower.includes('ہم آپ کو') ||
      lower.includes('welcome') || lower.includes('we have') || lower.includes('offer')
    ) {
      return 'sales_rep';
    }
    return 'customer';
  };

  // Start Real Audio Recording
  const startRecording = async () => {
    try {
      setSaveStatus('');
      setClosureAlert(null);
      setTranscripts([]);
      setInterimText('');
      setProbability(50);
      setDetectedProduct('Listening...');
      setDetectedObjection('None');

      const sId = `SES-LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setSessionId(sId);

      // 1. Notify Backend of new session
      await fetch(`${BACKEND_URL}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sId,
          storeCode,
          storeName,
          deviceId: 'Web-Dashboard-Mic',
          salesRep
        })
      });

      if (socket) {
        socket.emit('join_session', sId);
      }

      // 2. Request user microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Audio Visualizer setup
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      drawSpectrum();

      // 4. MediaRecorder setup for saving audio file
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);

          // Stream real-time audio chunk to socket so Admin can listen live
          const reader = new FileReader();
          reader.onloadend = () => {
            if (socket && sId) {
              socket.emit('live_audio_data', {
                sessionId: sId,
                audioData: reader.result,
                storeCode
              });
            }
          };
          reader.readAsDataURL(e.data);

          // Send to backend cloud STT
          const formData = new FormData();
          formData.append('audioChunk', e.data, 'chunk.webm');
          formData.append('language', language);
          fetch(`${BACKEND_URL}/api/sessions/${sId}/live-transcribe`, {
            method: 'POST',
            body: formData
          })
          .then(r => r.json())
          .then(d => {
            if (d && d.success && d.text) {
              setTranscripts(prev => {
                if (prev.some(p => p.text === d.text)) return prev;
                return [...prev, { timestamp: new Date(), speaker: 'customer', text: d.text }];
              });
            }
          })
          .catch(() => {});
        }
      };
      recorder.start(2000);

      // 5. Start Speech Recognition
      const recognizer = initSpeechRecognition();
      if (recognizer) {
        speechRecognizerRef.current = recognizer;
        try { recognizer.start(); } catch (e) {}
      }

      // 6. Start Timer
      setSeconds(0);
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      alert('Microphone access failed: ' + err.message + '\nPlease allow microphone access in your browser to record live audio.');
    }
  };

  // Draw Audio Visualizer Spectrum
  const drawSpectrum = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;

      // Stream level to socket
      if (socket && sessionId && Math.random() < 0.2) {
        socket.emit('audio_level', {
          sessionId,
          level: Math.round(avg),
          storeCode
        });
      }

      const barWidth = (canvas.width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(0.6, '#10b981');
        grad.addColorStop(1, '#f59e0b');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // Pause / Resume
  const togglePause = () => {
    if (!isRecording) return;
    if (!isPaused) {
      setIsPaused(true);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.stop(); } catch (e) {}
      }
    } else {
      setIsPaused(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.start(); } catch (e) {}
      }
    }
  };

  // End Session & Save Audio + AI Analysis
  const endRecording = async () => {
    if (!isRecording) return;

    clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop(); } catch (e) {}
      speechRecognizerRef.current = null;
    }

    setSaveStatus('Saving audio recording and running AI deal analysis...');

    // Stop MediaRecorder and collect Blob
    let audioBlob = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      await new Promise(r => setTimeout(r, 600));
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      }
    }

    // Stop mic stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    try {
      // 1. Finalize session in backend
      const endRes = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcripts,
          durationSeconds: Math.max(5, seconds)
        })
      });
      const endData = await endRes.json();

      // 2. Upload audio recording if available
      if (audioBlob && audioBlob.size > 0) {
        const formData = new FormData();
        formData.append('audio', audioBlob, `rec-${sessionId}.webm`);
        await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/audio`, {
          method: 'POST',
          body: formData
        });
      }

      setSaveStatus('✅ Recording & Urdu/Punjabi transcript successfully saved to audit database!');
      setIsRecording(false);
      setIsPaused(false);

      if (onSessionSaved) onSessionSaved(endData.session);
    } catch (err) {
      setSaveStatus('⚠️ Error saving session: ' + err.message);
      setIsRecording(false);
    }
  };

  // Simulate rich Urdu / Punjabi conversation with real voice closure detection
  const simulateMultilingualChat = async (langChoice = 'ur') => {
    if (isRecording) return;

    const sId = `SES-SIM-${langChoice.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setSessionId(sId);
    setIsRecording(true);
    setTranscripts([]);
    setClosureAlert(null);
    setSeconds(0);
    setSaveStatus('Running live Urdu/Punjabi conversation simulation...');

    // Start session
    await fetch(`${BACKEND_URL}/api/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sId,
        storeCode,
        storeName,
        deviceId: 'Multilingual-Simulator',
        salesRep
      })
    });

    const scriptUrdu = [
      { speaker: 'customer', text: 'السلام علیکم! میں نے آئی فون 16 پرو میکس دیکھنا ہے، کیا اسٹاک میں دستیاب ہے؟' },
      { speaker: 'sales_rep', text: 'وعلیکم السلام! جی بالکل، ہمارے پاس 16 پرو میکس ڈیزرٹ ٹائٹینیم 256GB موجود ہے۔' },
      { speaker: 'customer', text: 'پرائس تھوڑی زیادہ ہے، کیا پرانے آئی فون کا ایکسچینج یا کوئی ڈسکاؤنٹ مل سکتا ہے؟' },
      { speaker: 'sales_rep', text: 'جی ہاں، ٹریڈ ان پر آپ کو 450 ڈالر تک ویلیو ملے گی اور ساتھ میں زیرو پرسنٹ اقساط کا پلان بھی ہے۔' },
      { speaker: 'customer', text: 'زبردست! وارنٹی اور ایپل کیئر کا کیا طریقہ کار ہے؟' },
      { speaker: 'sales_rep', text: 'ایپل کیئر پلس میں اسکرین کا فل کور اور انسٹنٹ ریپلیسمنٹ شامل ہے۔' },
      { speaker: 'customer', text: 'بہت بہترین ڈیل ہے۔ میں لے رہا ہوں، پیک کر دیں اور کارڈ سے پیمنٹ کر رہا ہوں!' },
      { speaker: 'sales_rep', text: 'مبارک ہو! کارڈ سوائپ کریں، آپ کا نیا آئی فون 16 پرو میکس تیار ہے، ڈیل فائنل ہو گئی!' }
    ];

    const scriptPunjabi = [
      { speaker: 'customer', text: 'سلام جی! آئی فون 16 پرو کی ریٹ کی اے؟' },
      { speaker: 'sales_rep', text: 'جی ویر جی، 16 پرو بلیک ٹائٹینیم بالکل فریش اسٹاک وچ پیا اے۔' },
      { speaker: 'customer', text: 'تھوڑا بجٹ توں باہر اے، کوئی رعایت یا پرانے فون دا تبادلہ ہو سکدا اے؟' },
      { speaker: 'sales_rep', text: 'پرانے فون تے وڈا ڈسکاؤنٹ مل جائے گا تے قسطاں وی ہو جان گیاں۔' },
      { speaker: 'customer', text: 'اے تاں بڑی ودھیا گل اے۔ فائنل کرو جی، کارڈ نال پیسے دے دتے نے!' },
      { speaker: 'sales_rep', text: 'لکھ واری مبارک ہووے! فون پیک کر دتا اے، ڈیل ڈن ہو گئی!' }
    ];

    const chosenScript = langChoice === 'ur' ? scriptUrdu : scriptPunjabi;

    for (let i = 0; i < chosenScript.length; i++) {
      const step = chosenScript[i];
      await new Promise(r => setTimeout(r, 1400));
      setSeconds(prev => prev + 4);
      await handleFinalUtterance(step.text, step.speaker);
    }

    await new Promise(r => setTimeout(r, 1200));
    // Finalize
    await fetch(`${BACKEND_URL}/api/sessions/${sId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds: 48 })
    });

    setSaveStatus('✅ Urdu/Punjabi conversation finalized & deal closure verified!');
    setIsRecording(false);
    if (onSessionSaved) onSessionSaved();
  };

  const formatTimer = (sec) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${mins}:${s}`;
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: isRecording ? '#fee2e2' : '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRecording ? '#ef4444' : '#059669'
            }}>
              <Mic size={22} className={isRecording ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Live In-Store Voice Recording & Multilingual Transcription Terminal
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Real-time microphone capture with instant Urdu & Punjabi transcription and audio recording archive
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Language & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            padding: '7px 12px',
            borderRadius: '9px',
            border: '1px solid #cbd5e1'
          }}>
            <Globe size={15} color="#059669" />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>LANGUAGE:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '12.5px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ur-PK">🇵🇰 اردو (Urdu)</option>
              <option value="pa-IN">🇵🇰/🇮🇳 پنجابی (Punjabi)</option>
              <option value="en-US">🇺🇸 English</option>
            </select>
          </div>

          {/* Record / End Buttons */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Mic size={16} />
              <span>Start Live Mic Recording</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={togglePause}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={endRecording}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)'
                }}
              >
                <Square size={15} />
                <span>End & Save Recording</span>
              </button>
            </div>
          )}

          {/* Simulate Urdu / Punjabi One-Click Buttons */}
          {!isRecording && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => simulateMultilingualChat('ur')}
                style={{
                  padding: '9px 13px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#3b82f6',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Test Urdu deal dialogue stream"
              >
                <Sparkles size={14} />
                <span>Test Urdu Stream</span>
              </button>

              <button
                onClick={() => simulateMultilingualChat('pa')}
                style={{
                  padding: '9px 13px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Test Punjabi deal dialogue stream"
              >
                <Sparkles size={14} />
                <span>Test Punjabi Stream</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Deal Closure Detected Banner */}
      {closureAlert && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.18)',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'emerald-pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🎉</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                IN-STORE DEAL CLOSURE DETECTED IN REAL-TIME!
              </div>
              <div style={{ fontSize: '12.5px', color: '#e2e8f0', marginTop: '2px' }}>
                Customer Purchase Phrase: <b>"{closureAlert}"</b> • Deal Probability: <b>95%</b>
              </div>
            </div>
          </div>
          <span style={{
            background: '#10b981',
            color: '#090d16',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            CLOSING SIGNAL
          </span>
        </div>
      )}

      {/* Save Status Notice */}
      {saveStatus && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: saveStatus.includes('✅') ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 130, 246, 0.14)',
          border: `1px solid ${saveStatus.includes('✅') ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
          color: saveStatus.includes('✅') ? '#10b981' : '#3b82f6',
          fontSize: '12.5px',
          fontWeight: '600',
          marginBottom: '14px'
        }}>
          {saveStatus}
        </div>
      )}

      {/* Main Recording Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '18px' }}>
        
        {/* Left Column: Visualizer & Live Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Status & Timer Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                Recording Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: isRecording ? (isPaused ? '#f59e0b' : '#ef4444') : '#10b981',
                  boxShadow: isRecording ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none'
                }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {isRecording ? (isPaused ? 'PAUSED' : 'LIVE RECORDING') : 'STANDBY (READY)'}
                </span>
              </div>
            </div>

            <div style={{
              fontSize: '22px',
              fontFamily: 'monospace',
              fontWeight: '800',
              color: isRecording ? '#ef4444' : '#059669'
            }}>
              {formatTimer(seconds)}
            </div>
          </div>

          {/* Audio Visualizer Canvas */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                <Volume2 size={15} color="#059669" />
                <span>Microphone Waveform Spectrum</span>
              </div>
              <span style={{ fontSize: '11px', color: isRecording ? '#059669' : '#64748b', fontWeight: '700' }}>
                {isRecording ? 'Capturing Audio...' : 'Mic Idle'}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={350}
              height={70}
              style={{
                width: '100%',
                height: '70px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            />
          </div>

          {/* Real-time AI Metrics */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Probability */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Live Closure Probability:</span>
                <span style={{ color: probability >= 80 ? '#059669' : (probability >= 50 ? '#0284c7' : '#d97706'), fontWeight: '800' }}>
                  {probability}%
                </span>
              </div>
              <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${probability}%`,
                  background: probability >= 80 ? '#059669' : (probability >= 50 ? '#10b981' : '#f59e0b'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Product & Objection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '4px' }}>
              <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Detected Device</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {detectedProduct}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Customer Objection</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: detectedObjection !== 'None' ? '#d97706' : '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {detectedObjection}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Transcript Stream Feed */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '340px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬</span> Live Multilingual Speech Recognition Stream ({transcripts.length})
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Lang: <b>{language === 'ur-PK' ? 'اردو' : (language === 'pa-IN' ? 'پنجابی' : 'English')}</b>
            </span>
          </div>

          <div
            ref={transcriptFeedRef}
            style={{
              flex: 1,
              maxHeight: '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '6px'
            }}
          >
            {transcripts.length === 0 && !interimText && (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px',
                margin: 'auto 0',
                padding: '40px 20px',
                lineHeight: 1.6
              }}>
                🎙️ Mic stream is ready. Press <b>"Start Live Mic Recording"</b> above and speak in <b>Urdu, Punjabi, or English</b>.<br />
                Your voice will be transcribed live and recorded for admin playback.
              </div>
            )}

            {transcripts.map((t, idx) => (
              <div
                key={idx}
                className={`transcript-bubble ${t.speaker}`}
                style={{
                  background: t.speaker === 'customer' ? '#f8fafc' : '#ecfdf5',
                  border: t.speaker === 'customer' ? '1px solid #e2e8f0' : '1px solid #a7f3d0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '3px' }}>
                  <span style={{ color: t.speaker === 'customer' ? '#b45309' : '#047857', textTransform: 'uppercase' }}>
                    {t.speaker === 'customer' ? '👤 Customer' : '💼 Sales Specialist'}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div style={{ color: '#0f172a', fontSize: '13.5px', direction: language.startsWith('ur') || language.startsWith('pa') ? 'auto' : 'ltr' }}>
                  {t.text}
                </div>
              </div>
            ))}

            {/* Interim live typing bubble */}
            {interimText && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px dashed #059669',
                color: '#047857',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                <span style={{ fontSize: '10px', color: '#059669', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                  Live Recognized Speech:
                </span>
                "{interimText}..."
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
