// renderer.js - Storelistener Retail Audio Capture, AI Transcription & Deal Closure Engine
const BACKEND_URL = 'http://localhost:5000';

// Electron IPC Bridge
let ipcRenderer = null;
try {
  if (typeof window !== 'undefined' && window.require) {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  console.log('Running outside Electron environment or context isolation active');
}

// DOM Elements
const storeSelect = document.getElementById('storeSelect');
const languageSelect = document.getElementById('languageSelect');
const terminalInput = document.getElementById('terminalInput');
const repInput = document.getElementById('repInput');
const backendBadge = document.getElementById('backendBadge');
const backendStatusText = document.getElementById('backendStatusText');

const sessionStatusPill = document.getElementById('sessionStatusPill');
const statusIndicatorDot = document.getElementById('statusIndicatorDot');
const statusLabel = document.getElementById('statusLabel');
const timerDisplay = document.getElementById('timerDisplay');

const btnRecord = document.getElementById('btnRecord');
const btnRecordLabel = document.getElementById('btnRecordLabel');
const btnTestMic = document.getElementById('btnTestMic');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');

const audioCanvas = document.getElementById('audioCanvas');
const vadDot = document.getElementById('vadDot');
const vadLabel = document.getElementById('vadLabel');
const micLevelFill = document.getElementById('micLevelFill');
const micDbText = document.getElementById('micDbText');

const audioPlaybackCard = document.getElementById('audioPlaybackCard');
const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
const playbackDuration = document.getElementById('playbackDuration');
const btnDownloadAudio = document.getElementById('btnDownloadAudio');

const metricProb = document.getElementById('metricProb');
const probFill = document.getElementById('probFill');
const metricDevice = document.getElementById('metricDevice');
const metricSentiment = document.getElementById('metricSentiment');

const transcriptFeed = document.getElementById('transcriptFeed');
const emptyPlaceholder = document.getElementById('emptyPlaceholder');
const sttEngineTag = document.getElementById('sttEngineTag');
const sttStatusText = document.getElementById('sttStatusText');
const btnClearTranscript = document.getElementById('btnClearTranscript');

const autoRadarCheck = document.getElementById('autoRadarCheck');
const dealAlertBox = document.getElementById('dealAlertBox');
const dealAlertText = document.getElementById('dealAlertText');
const countdownTimer = document.getElementById('countdownTimer');
const btnConfirmClose = document.getElementById('btnConfirmClose');
const btnCancelClose = document.getElementById('btnCancelClose');

const copilotTipText = document.getElementById('copilotTipText');
const chkAppleCare = document.getElementById('chkAppleCare');
const chkCase = document.getElementById('chkCase');
const chkCharger = document.getElementById('chkCharger');
const chkTrade = document.getElementById('chkTrade');

const btnQuickWon = document.getElementById('btnQuickWon');
const btnQuickLost = document.getElementById('btnQuickLost');

// State
let socket = null;
let currentSession = null;
let isRecording = false;
let isTestingMic = false;
let isPaused = false;
let timerInterval = null;
let secondsElapsed = 0;

let audioContext = null;
let analyser = null;
let microphoneStream = null;
let mediaRecorder = null;
let recordedAudioChunks = [];
let speechRecognizer = null;
let currentInterimBubble = null;

let autoCloseCountdown = null;
let autoCloseSeconds = 10;
let vadSilenceFrames = 0;
let vadSpeakingFrames = 0;

// Setup Socket.IO
function initSocket() {
  try {
    socket = io(BACKEND_URL);

    socket.on('connect', () => {
      backendStatusText.textContent = 'Live Connected';
      backendBadge.style.color = '#30d158';
      backendBadge.style.background = 'rgba(48, 209, 88, 0.15)';
      console.log('Connected to Storelistener backend');
    });

    socket.on('disconnect', () => {
      backendStatusText.textContent = 'Disconnected';
      backendBadge.style.color = '#ff453a';
      backendBadge.style.background = 'rgba(255, 69, 58, 0.15)';
    });

    socket.on('copilot_suggestion', (data) => {
      if (data && data.tip) {
        copilotTipText.textContent = data.tip;
        copilotTipText.style.borderColor = '#30d158';
      }
    });

    socket.on('deal_closure_detected', (data) => {
      triggerDealClosureAlert(data.signal);
    });

  } catch (err) {
    console.warn('Socket init error (backend might be offline):', err.message);
  }
}

// Audio Spectrum Visualizer & Input Sensitivity
function setupAudioVisualizer(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const canvasCtx = audioCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, audioCanvas.width, audioCanvas.height);

      // Compute average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Update Live Mic Input Meter Bar
      const levelPct = Math.min(100, Math.round((average / 110) * 100));
      if (micLevelFill) micLevelFill.style.width = `${levelPct}%`;
      if (micDbText) micDbText.textContent = `${levelPct}%`;

      // VAD Speech Activity check
      if (average > 14) {
        vadDot.style.color = '#30d158';
        vadLabel.textContent = 'Voice Detected';
        vadSpeakingFrames++;
        vadSilenceFrames = 0;

        // Auto start if radar enabled and not recording
        if (!isRecording && !isTestingMic && autoRadarCheck && autoRadarCheck.checked && vadSpeakingFrames > 8) {
          console.log('Customer speech detected - Auto-triggering recording session!');
          startSession();
        }
      } else {
        vadDot.style.color = (isRecording || isTestingMic) ? '#2997ff' : '#86868b';
        vadLabel.textContent = (isRecording || isTestingMic) ? 'Listening...' : 'Mic Silent';
        vadSilenceFrames++;
        vadSpeakingFrames = 0;
      }

      // Emit live audio level to backend for real-time visualizer
      if (isRecording && socket && Math.random() < 0.25) {
        socket.emit('audio_level', {
          sessionId: currentSession?.sessionId,
          level: Math.round(average),
          storeCode: storeSelect.value
        });
      }

      // Draw spectrum bars
      const barWidth = (audioCanvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * audioCanvas.height * 0.9;
        
        const grad = canvasCtx.createLinearGradient(0, audioCanvas.height, 0, 0);
        grad.addColorStop(0, '#0071e3');
        grad.addColorStop(0.6, '#2997ff');
        grad.addColorStop(1, '#30d158');

        canvasCtx.fillStyle = grad;
        canvasCtx.fillRect(x, audioCanvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    }

    // Adjust canvas resolution
    audioCanvas.width = audioCanvas.parentElement.clientWidth || 300;
    audioCanvas.height = audioCanvas.parentElement.clientHeight || 70;
    draw();
  } catch (err) {
    console.error('Audio visualizer init error:', err);
  }
}

// IPC Native Windows Speech Recognition Bridge Setup
function setupNativeSpeechBridge() {
  if (!ipcRenderer) {
    console.log('No IPC renderer available for native speech bridge');
    return;
  }

  ipcRenderer.on('speech-bridge-interim', (event, text) => {
    if ((isRecording || isTestingMic) && text) {
      updateInterimBubble(text);
      if (socket && currentSession) {
        socket.emit('live_transcript_stream', {
          sessionId: currentSession.sessionId,
          text: text,
          isFinal: false,
          speaker: detectProbableSpeaker(text)
        });
      }
    }
  });

  ipcRenderer.on('speech-bridge-final', (event, text) => {
    if ((isRecording || isTestingMic) && text) {
      handleFinalTranscript(text);
    }
  });

  console.log('Native Windows Speech Recognizer IPC listeners connected.');
}

// Fallback Web Speech Recognition Setup (for Chromium/Browsers)
function setupWebSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('Web Speech API not supported natively in this Electron build (using Windows Native Speech Bridge).');
    return;
  }

  try {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = languageSelect ? languageSelect.value : 'en-US';

    speechRecognizer.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript.trim() && (isRecording || isTestingMic)) {
        updateInterimBubble(interimTranscript.trim());
      }

      if (finalTranscript.trim() && (isRecording || isTestingMic)) {
        handleFinalTranscript(finalTranscript.trim());
      }
    };

    speechRecognizer.onerror = (event) => {
      // In Electron, webkitSpeechRecognition often reports 'not-allowed' or 'network'
      // We log gracefully and rely on the native Windows bridge
      console.log('Web Speech API note:', event.error, '(Native Speech Bridge handles transcription)');
    };

    speechRecognizer.onend = () => {
      if ((isRecording || isTestingMic) && !isPaused) {
        try { speechRecognizer.start(); } catch (e) {}
      }
    };
  } catch (err) {
    console.warn('SpeechRecognition setup error:', err.message);
  }
}

// Multilingual Speaker heuristic (Customer vs Sales Rep in Urdu, Punjabi & English)
function detectProbableSpeaker(text) {
  const lower = text.toLowerCase();
  // Customer cues (Urdu / Punjabi / English)
  if (
    lower.startsWith('can i') || lower.startsWith('how much') || lower.startsWith('do you have') ||
    lower.includes('is it possible') || lower.includes('my old phone') || lower.includes('discount') ||
    lower.includes('price') || lower.includes('cost') || lower.includes('trade in') || lower.includes('iphone 16') ||
    lower.includes('کتنے کا') || lower.includes('کی ریٹ') || lower.includes('رعایت') || lower.includes('کم کرو') ||
    lower.includes('پرانا فون') || lower.includes('وارنٹی') || lower.includes('kitne ka') || lower.includes('le lu') ||
    lower.includes('mai le raha') || lower.includes('ill take it')
  ) {
    return 'customer';
  }
  // Sales Rep cues
  if (
    lower.startsWith('welcome') || lower.startsWith('here is') || lower.startsWith('we have') ||
    lower.startsWith('i can give you') || lower.includes('our trade in') || lower.includes('applecare') ||
    lower.includes('خوش آمدید') || lower.includes('جی سر') || lower.includes('ہمارے پاس') || lower.includes('نئی آفر') ||
    lower.includes('how can i help') || lower.includes('special offer')
  ) {
    return 'sales_rep';
  }
  return 'customer';
}

function updateInterimBubble(text) {
  if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';

  if (!currentInterimBubble) {
    currentInterimBubble = document.createElement('div');
    currentInterimBubble.className = 'transcript-bubble interim customer';
    transcriptFeed.appendChild(currentInterimBubble);
  }

  currentInterimBubble.innerHTML = `<span style="opacity: 0.7; font-style: italic;">🎙️ Speaking:</span> ${text}...`;
  transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
}

async function handleFinalTranscript(text) {
  if (!text || !text.trim()) return;

  if (currentInterimBubble) {
    currentInterimBubble.remove();
    currentInterimBubble = null;
  }

  if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';

  const speaker = detectProbableSpeaker(text);
  const bubble = document.createElement('div');
  bubble.className = `transcript-bubble ${speaker}`;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const senderTag = document.createElement('div');
  senderTag.className = `bubble-sender ${speaker === 'customer' ? 'cust' : ''}`;
  senderTag.innerHTML = `
    <span>${speaker === 'customer' ? '👤 Customer' : '💼 Sales Specialist'}</span>
    <span style="font-size: 10px; opacity: 0.6; font-weight: normal; margin-left: 8px;">${timeStr}</span>
  `;

  const msgContent = document.createElement('div');
  msgContent.textContent = text;
  msgContent.style.marginTop = '4px';

  bubble.appendChild(senderTag);
  bubble.appendChild(msgContent);
  transcriptFeed.appendChild(bubble);
  transcriptFeed.scrollTop = transcriptFeed.scrollHeight;

  // Stream to socket for immediate broadcast to Admin
  if (socket && currentSession) {
    socket.emit('live_transcript_stream', {
      sessionId: currentSession.sessionId,
      text: text,
      isFinal: true,
      speaker: speaker
    });
  }

  // Real-time local heuristic intelligence immediately
  applyLocalUtteranceAnalysis(text);

  // Push to backend REST API if session is active
  if (currentSession && currentSession.sessionId) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${currentSession.sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker })
      });
      const data = await res.json();
      if (data.success && data.realtimeAnalysis) {
        applyRealtimeAnalysis(data.realtimeAnalysis, text);
      }
    } catch (err) {
      console.warn('Backend transcript sync note:', err.message);
    }
  }
}

// Instant Local Utterance Intelligence (works even when backend is offline)
function applyLocalUtteranceAnalysis(text) {
  const lower = text.toLowerCase();

  // Detect iPhone device
  if (lower.includes('16 pro max') || lower.includes('pro max')) metricDevice.textContent = 'iPhone 16 Pro Max';
  else if (lower.includes('16 pro')) metricDevice.textContent = 'iPhone 16 Pro';
  else if (lower.includes('16 plus')) metricDevice.textContent = 'iPhone 16 Plus';
  else if (lower.includes('iphone 16') || lower.includes('16')) metricDevice.textContent = 'iPhone 16';
  else if (lower.includes('15 pro max')) metricDevice.textContent = 'iPhone 15 Pro Max';
  else if (lower.includes('15 pro')) metricDevice.textContent = 'iPhone 15 Pro';
  else if (lower.includes('iphone 15') || lower.includes('15')) metricDevice.textContent = 'iPhone 15';

  // Objections
  if (lower.includes('expensive') || lower.includes('mehnga') || lower.includes('budget') || lower.includes('discount') || lower.includes('high price')) {
    metricSentiment.textContent = 'Price Objection';
    metricSentiment.style.color = '#ff9f0a';
    copilotTipText.textContent = '💡 Price objection detected: Offer 24-month zero-interest installment plan or trade-in credit!';
  } else if (lower.includes('trade in') || lower.includes('trade-in') || lower.includes('purana phone') || lower.includes('old phone')) {
    chkTrade.classList.add('active');
    copilotTipText.textContent = '🔄 Trade-in inquiry: Offer instant valuation up to $450 towards the new iPhone!';
  }

  // Cross-sell items
  if (lower.includes('applecare') || lower.includes('warranty') || lower.includes('damage')) chkAppleCare.classList.add('active');
  if (lower.includes('case') || lower.includes('magsafe') || lower.includes('cover')) chkCase.classList.add('active');
  if (lower.includes('charger') || lower.includes('adapter') || lower.includes('20w')) chkCharger.classList.add('active');

  // Closing phrases
  if (
    lower.includes("i'll take it") || lower.includes('ill take it') || lower.includes('card payment') ||
    lower.includes('pay by card') || lower.includes('credit card') || lower.includes('ready to pay') ||
    lower.includes('bill bana') || lower.includes('pack kar') || lower.includes('done karo') ||
    lower.includes('mai le raha') || lower.includes('receipt')
  ) {
    metricProb.textContent = '95%';
    probFill.style.width = '95%';
    probFill.style.background = '#30d158';
    triggerDealClosureAlert(text);
  }
}

// Real-time Intelligence updater from Backend
function applyRealtimeAnalysis(analysis, utterance) {
  if (!analysis) return;

  if (analysis.probability !== undefined) {
    metricProb.textContent = `${analysis.probability}%`;
    probFill.style.width = `${analysis.probability}%`;
    if (analysis.probability >= 80) probFill.style.background = '#30d158';
    else if (analysis.probability >= 50) probFill.style.background = '#2997ff';
    else probFill.style.background = '#ffd60a';
  }

  if (analysis.detectedProducts && analysis.detectedProducts.length > 0) {
    metricDevice.textContent = analysis.detectedProducts[0];
  }

  if (analysis.detectedObjection) {
    metricSentiment.textContent = analysis.detectedObjection;
    metricSentiment.style.color = '#ff9f0a';
  }

  if (analysis.copilotTip) {
    copilotTipText.textContent = analysis.copilotTip;
  }

  if (analysis.isClosingSignal) {
    triggerDealClosureAlert(analysis.closingMatch || utterance);
  }
}

function triggerDealClosureAlert(phrase) {
  if (dealAlertBox.style.display === 'block') return; // already showing
  dealAlertBox.style.display = 'block';
  dealAlertText.innerHTML = `Customer agreed to purchase (<b>"${phrase || 'Payment triggered'}"</b>). Finalizing deal in <b id="countdownTimer">10s</b>...`;
  
  metricProb.textContent = '95%';
  probFill.style.width = '95%';
  probFill.style.background = '#30d158';

  // Start auto-close countdown
  clearInterval(autoCloseCountdown);
  autoCloseSeconds = 10;
  if (countdownTimer) countdownTimer.textContent = `${autoCloseSeconds}s`;

  autoCloseCountdown = setInterval(() => {
    autoCloseSeconds--;
    if (countdownTimer) countdownTimer.textContent = `${autoCloseSeconds}s`;
    if (autoCloseSeconds <= 0) {
      clearInterval(autoCloseCountdown);
      dealAlertBox.style.display = 'none';
      endSession('won');
    }
  }, 1000);
}

// Session Lifecycle
async function startSession() {
  if (isRecording) return;

  // Hide old audio playback card if visible
  if (audioPlaybackCard) audioPlaybackCard.style.display = 'none';

  const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const storeCode = storeSelect.value;
  const storeName = storeSelect.options[storeSelect.selectedIndex].text;
  const deviceId = terminalInput.value || 'POS-01';
  const salesRep = repInput.value || 'Specialist';

  try {
    const res = await fetch(`${BACKEND_URL}/api/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, storeCode, storeName, deviceId, salesRep })
    });
    const data = await res.json();
    currentSession = data.session || { sessionId, storeCode, storeName, deviceId, salesRep };
  } catch (err) {
    console.warn('Backend offline, running local session buffer:', err.message);
    currentSession = { sessionId, storeCode, storeName, deviceId, salesRep };
  }

  // Update UI
  isRecording = true;
  isPaused = false;
  sessionStatusPill.className = 'live-pill';
  statusIndicatorDot.style.color = '#ff453a';
  statusLabel.textContent = 'RECORDING';
  btnRecord.classList.remove('btn-primary');
  btnRecord.classList.add('btn-secondary');
  btnRecordLabel.textContent = 'Recording Active';
  btnPause.disabled = false;
  btnStop.disabled = false;
  if (btnTestMic) btnTestMic.disabled = true;

  if (sttStatusText) sttStatusText.textContent = 'Recording & Live Transcribing...';
  if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';

  // Start Timer
  secondsElapsed = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
  }, 1000);

  // Start Audio Recording
  startAudioCapture();

  // Start Native Speech Recognizer via Electron IPC
  if (ipcRenderer) {
    ipcRenderer.send('start-speech-bridge', languageSelect ? languageSelect.value : 'en-US');
  }

  // Start Web Speech API if supported
  if (speechRecognizer) {
    try { speechRecognizer.start(); } catch (e) {}
  }

  // Join session room in Socket
  if (socket && currentSession) {
    socket.emit('join_session', currentSession.sessionId);
  }
}

async function startAudioCapture() {
  try {
    if (!microphoneStream) {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setupAudioVisualizer(microphoneStream);
    }

    recordedAudioChunks = [];
    mediaRecorder = new MediaRecorder(microphoneStream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0) {
        recordedAudioChunks.push(e.data);

        // Convert chunk to base64 for real-time live audio streaming to Admin
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          if (socket && currentSession) {
            socket.emit('live_audio_data', {
              sessionId: currentSession.sessionId,
              audioData: base64Audio,
              storeCode: storeSelect.value
            });
          }

          // If session is active, also send chunk to Cloud STT (Gemini / Whisper)
          if ((isRecording || isTestingMic) && currentSession) {
            try {
              const formData = new FormData();
              formData.append('audioChunk', e.data, 'chunk.webm');
              formData.append('language', languageSelect ? languageSelect.value : 'ur-PK');
              formData.append('speaker', 'customer');

              const transcribeRes = await fetch(`${BACKEND_URL}/api/sessions/${currentSession.sessionId}/live-transcribe`, {
                method: 'POST',
                body: formData
              });
              const transcribeData = await transcribeRes.json();
              if (transcribeData.success && transcribeData.text) {
                console.log('Cloud STT speech recognized:', transcribeData.text);
                handleFinalTranscript(transcribeData.text);
              }
            } catch (err) {
              // Cloud STT note
            }
          }
        };
        reader.readAsDataURL(e.data);
      }
    };

    // Capture in 3-second blocks
    mediaRecorder.start(3000);
    console.log('Microphone recording active.');
  } catch (err) {
    console.error('Microphone capture error:', err);
    alert('Microphone error: Please check that your Windows microphone is connected and enabled.');
  }
}

async function endSession(outcomeOverride) {
  if (!isRecording && !currentSession) return;

  clearInterval(timerInterval);
  clearInterval(autoCloseCountdown);
  dealAlertBox.style.display = 'none';

  // Stop Speech Recognition
  if (ipcRenderer) {
    ipcRenderer.send('stop-speech-bridge');
  }
  if (speechRecognizer) {
    try { speechRecognizer.stop(); } catch (e) {}
  }

  // Stop MediaRecorder & finalize audio blob
  let audioBlob = null;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    await new Promise(r => setTimeout(r, 400));
    audioBlob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
  }

  const sId = currentSession?.sessionId;
  const recordedDuration = timerDisplay.textContent;

  // Show recorded audio player in UI so user can immediately hear what was recorded!
  if (audioBlob && audioBlob.size > 0 && audioPlaybackCard) {
    const audioUrl = URL.createObjectURL(audioBlob);
    recordedAudioPlayer.src = audioUrl;
    btnDownloadAudio.href = audioUrl;
    btnDownloadAudio.download = `store-rec-${sId || 'session'}.webm`;
    playbackDuration.textContent = recordedDuration;
    audioPlaybackCard.style.display = 'block';
  }

  // Post end session to backend
  try {
    const endRes = await fetch(`${BACKEND_URL}/api/sessions/${sId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds: secondsElapsed })
    });
    const endData = await endRes.json();
    console.log('Session finalized with AI analysis:', endData);

    // Upload audio blob if present
    if (audioBlob && audioBlob.size > 0) {
      const formData = new FormData();
      formData.append('audio', audioBlob, `rec-${sId}.webm`);
      await fetch(`${BACKEND_URL}/api/sessions/${sId}/audio`, {
        method: 'POST',
        body: formData
      });
      console.log('Audio recording uploaded successfully to backend');
    }
  } catch (err) {
    console.warn('End session save note:', err.message);
  }

  // Reset UI
  isRecording = false;
  isPaused = false;
  sessionStatusPill.className = 'live-pill idle';
  statusIndicatorDot.style.color = '#86868b';
  statusLabel.textContent = 'COMPLETED';
  btnRecord.classList.remove('btn-secondary');
  btnRecord.classList.add('btn-primary');
  btnRecordLabel.textContent = 'Start New Session';
  btnPause.disabled = true;
  btnStop.disabled = true;
  if (btnTestMic) btnTestMic.disabled = false;

  if (sttStatusText) sttStatusText.textContent = 'Session Finished. Ready for Next.';
  copilotTipText.textContent = `✅ Session saved! Deal status: ${outcomeOverride ? outcomeOverride.toUpperCase() : 'COMPLETED'}. Audio recording preserved below.`;
}

// Quick Microphone & Speech Test Mode
async function toggleMicTest() {
  if (isRecording) return;

  if (!isTestingMic) {
    // Start Testing
    isTestingMic = true;
    btnTestMic.innerHTML = '<span>⏹</span> Stop Test';
    btnTestMic.classList.remove('btn-secondary');
    btnTestMic.classList.add('btn-danger');

    sessionStatusPill.className = 'live-pill';
    statusIndicatorDot.style.color = '#ffd60a';
    statusLabel.textContent = 'TESTING MIC';

    if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';

    // Show temporary test message in transcript feed
    const testInfo = document.createElement('div');
    testInfo.style.cssText = 'padding: 8px 12px; background: rgba(41,151,255,0.12); border: 1px solid rgba(41,151,255,0.3); border-radius: 8px; font-size: 11.5px; color: #2997ff; margin-bottom: 8px; text-align: center;';
    testInfo.innerHTML = '⚡ <b>Microphone & Speech Test Active!</b> Speak into your microphone now — words will transcribe live below.';
    transcriptFeed.appendChild(testInfo);
    transcriptFeed.scrollTop = transcriptFeed.scrollHeight;

    // Start Audio
    currentSession = { sessionId: `TEST-${Date.now()}`, storeCode: storeSelect.value };
    await startAudioCapture();

    // Start Native Bridge
    if (ipcRenderer) {
      ipcRenderer.send('start-speech-bridge', languageSelect ? languageSelect.value : 'en-US');
    }
    if (speechRecognizer) {
      try { speechRecognizer.start(); } catch (e) {}
    }
  } else {
    // Stop Testing
    isTestingMic = false;
    btnTestMic.innerHTML = '<span>⚡</span> Test Mic';
    btnTestMic.classList.remove('btn-danger');
    btnTestMic.classList.add('btn-secondary');

    sessionStatusPill.className = 'live-pill idle';
    statusIndicatorDot.style.color = '#86868b';
    statusLabel.textContent = 'IDLE';

    if (ipcRenderer) {
      ipcRenderer.send('stop-speech-bridge');
    }
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      await new Promise(r => setTimeout(r, 300));
      const testBlob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
      if (testBlob.size > 0 && audioPlaybackCard) {
        const audioUrl = URL.createObjectURL(testBlob);
        recordedAudioPlayer.src = audioUrl;
        btnDownloadAudio.href = audioUrl;
        btnDownloadAudio.download = 'mic-test-recording.webm';
        playbackDuration.textContent = 'Test Audio';
        audioPlaybackCard.style.display = 'block';
      }
    }
  }
}

// Button Events
btnRecord.addEventListener('click', () => {
  if (!isRecording) startSession();
});

if (btnTestMic) {
  btnTestMic.addEventListener('click', toggleMicTest);
}

btnPause.addEventListener('click', () => {
  if (!isRecording) return;
  if (!isPaused) {
    isPaused = true;
    btnPause.innerHTML = '<span>▶</span> Resume';
    statusLabel.textContent = 'PAUSED';
    if (ipcRenderer) ipcRenderer.send('stop-speech-bridge');
    if (speechRecognizer) try { speechRecognizer.stop(); } catch (e) {}
  } else {
    isPaused = false;
    btnPause.innerHTML = '<span>⏸</span> Pause';
    statusLabel.textContent = 'RECORDING';
    if (ipcRenderer) ipcRenderer.send('start-speech-bridge', languageSelect ? languageSelect.value : 'en-US');
    if (speechRecognizer) try { speechRecognizer.start(); } catch (e) {}
  }
});

btnStop.addEventListener('click', () => {
  endSession('completed');
});

btnConfirmClose.addEventListener('click', () => {
  clearInterval(autoCloseCountdown);
  dealAlertBox.style.display = 'none';
  endSession('won');
});

btnCancelClose.addEventListener('click', () => {
  clearInterval(autoCloseCountdown);
  dealAlertBox.style.display = 'none';
  copilotTipText.textContent = 'Deal kept open. Continue assisting the customer.';
});

btnQuickWon.addEventListener('click', () => {
  if (isRecording) endSession('won');
  else alert('Start a session first before closing a deal.');
});

btnQuickLost.addEventListener('click', () => {
  if (isRecording) endSession('lost');
  else alert('Start a session first before marking lost.');
});

if (btnClearTranscript) {
  btnClearTranscript.addEventListener('click', () => {
    transcriptFeed.innerHTML = '<div style="text-align: center; color: #86868b; font-size: 12px; margin-top: 40px;" id="emptyPlaceholder">Transcript cleared. Speak to begin transcribing.</div>';
  });
}

// Language selector change
if (languageSelect) {
  languageSelect.addEventListener('change', () => {
    const val = languageSelect.value;
    if (sttEngineTag) {
      if (val === 'ur-PK') sttEngineTag.textContent = '🇵🇰 Urdu AI Engine';
      else if (val === 'pa-IN') sttEngineTag.textContent = '🇵🇰 Punjabi AI Engine';
      else sttEngineTag.textContent = '🎙️ Windows AI Speech';
    }
    if (speechRecognizer) {
      speechRecognizer.lang = val;
    }
    if (isRecording || isTestingMic) {
      if (ipcRenderer) {
        ipcRenderer.send('stop-speech-bridge');
        setTimeout(() => ipcRenderer.send('start-speech-bridge', val), 200);
      }
    }
  });
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  initSocket();
  setupNativeSpeechBridge();
  setupWebSpeechRecognition();
  initDesktopAuth();

  // Initialize microphone and audio visualizer immediately
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    setupAudioVisualizer(microphoneStream);
    console.log('Microphone initialized successfully.');
  } catch (err) {
    console.warn('Microphone permission or hardware note:', err.message);
  }
});

// ==========================================================================
// DESKTOP JWT AUTHENTICATION & STORE ADMIN VERIFICATION MODULE
// ==========================================================================

let desktopToken = localStorage.getItem('storelistener_desktop_token') || null;
let desktopCurrentUser = null;
let currentRegisterRole = 'sales_manager';

// Auth DOM Elements
const authOverlay = document.getElementById('authOverlay');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const authAlert = document.getElementById('authAlert');

const desktopLoginForm = document.getElementById('desktopLoginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLoginSubmit = document.getElementById('btnLoginSubmit');
const demoAdminBtn = document.getElementById('demoAdminBtn');
const demoManagerBtn = document.getElementById('demoManagerBtn');

const desktopRegisterForm = document.getElementById('desktopRegisterForm');
const roleOptStoreAdmin = document.getElementById('roleOptStoreAdmin');
const roleOptSalesManager = document.getElementById('roleOptSalesManager');
const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regStoreCode = document.getElementById('regStoreCode');
const btnRegisterSubmit = document.getElementById('btnRegisterSubmit');

const desktopPendingNotice = document.getElementById('desktopPendingNotice');
const pendingNoticeDetails = document.getElementById('pendingNoticeDetails');
const btnBackToLogin = document.getElementById('btnBackToLogin');

const userAuthBadge = document.getElementById('userAuthBadge');
const userRoleIcon = document.getElementById('userRoleIcon');
const headerUserName = document.getElementById('headerUserName');
const headerUserRole = document.getElementById('headerUserRole');
const btnAdminVerifySales = document.getElementById('btnAdminVerifySales');
const pendingBadgeCount = document.getElementById('pendingBadgeCount');
const btnSignOut = document.getElementById('btnSignOut');

const adminVerifyModal = document.getElementById('adminVerifyModal');
const btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
const desktopPendingList = document.getElementById('desktopPendingList');

function showAuthAlert(type, message) {
  if (!authAlert) return;
  authAlert.className = `auth-alert ${type}`;
  authAlert.textContent = message;
  authAlert.style.display = 'block';
}

function clearAuthAlert() {
  if (!authAlert) return;
  authAlert.textContent = '';
  authAlert.style.display = 'none';
}

function initDesktopAuth() {
  // Tab Switching
  if (tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      desktopLoginForm.style.display = 'flex';
      desktopRegisterForm.style.display = 'none';
      if (desktopPendingNotice) desktopPendingNotice.style.display = 'none';
      clearAuthAlert();
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      desktopRegisterForm.style.display = 'flex';
      desktopLoginForm.style.display = 'none';
      if (desktopPendingNotice) desktopPendingNotice.style.display = 'none';
      clearAuthAlert();
    });
  }

  // Role Selection Cards in Register Form
  if (roleOptStoreAdmin && roleOptSalesManager) {
    roleOptStoreAdmin.addEventListener('click', () => {
      currentRegisterRole = 'store_admin';
      roleOptStoreAdmin.classList.add('selected');
      roleOptSalesManager.classList.remove('selected');
    });

    roleOptSalesManager.addEventListener('click', () => {
      currentRegisterRole = 'sales_manager';
      roleOptSalesManager.classList.add('selected');
      roleOptStoreAdmin.classList.remove('selected');
    });
  }

  // Quick Demo Buttons
  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', () => {
      loginEmail.value = 'admin@store.com';
      loginPassword.value = 'admin123';
      clearAuthAlert();
    });
  }

  if (demoManagerBtn) {
    demoManagerBtn.addEventListener('click', () => {
      loginEmail.value = 'manager@store.com';
      loginPassword.value = 'manager123';
      clearAuthAlert();
    });
  }

  // Login Form Submit
  if (desktopLoginForm) {
    desktopLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthAlert();
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.innerHTML = '<span>⏳</span> Signing In...';

      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.value.trim(),
            password: loginPassword.value
          })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.status === 'pending') {
            showAuthAlert('warning', '⏳ Verification Pending: Your Sales Manager account is awaiting verification by a Store Admin. Please wait for an administrator to approve your account.');
          } else if (data.status === 'rejected') {
            showAuthAlert('error', data.error || '❌ Account Rejected by Store Admin.');
          } else {
            showAuthAlert('error', data.error || 'Invalid email or password.');
          }
          return;
        }

        // Login Success
        applyDesktopUser(data.user, data.token);
      } catch (err) {
        showAuthAlert('error', 'Cannot reach authentication server: ' + err.message);
      } finally {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.innerHTML = '<span>🔐</span> Sign In to Terminal';
      }
    });
  }

  // Register Form Submit
  if (desktopRegisterForm) {
    desktopRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthAlert();
      btnRegisterSubmit.disabled = true;
      btnRegisterSubmit.innerHTML = '<span>⏳</span> Creating...';

      try {
        const storeName = regStoreCode.value === 'STORE-NYC-01'
          ? 'Apple Authorized - 5th Ave'
          : (regStoreCode.value === 'STORE-LA-02' ? 'iStore Premium - Beverly Hills' : 'Apple Hub - Brickell');

        const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName.value.trim(),
            email: regEmail.value.trim(),
            password: regPassword.value,
            role: currentRegisterRole,
            storeCode: regStoreCode.value,
            storeName
          })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          showAuthAlert('error', data.error || 'Registration failed.');
          return;
        }

        // If Store Admin: Auto-verified!
        if (data.role === 'store_admin' && data.token) {
          applyDesktopUser(data.user, data.token);
          return;
        }

        // If Sales Manager: Pending Screen
        desktopRegisterForm.style.display = 'none';
        desktopPendingNotice.style.display = 'block';
        pendingNoticeDetails.textContent = `Your Sales Manager account for ${data.user.name} (${data.user.email}) has been submitted. A Store Admin must verify and approve your account before you can log in.`;
      } catch (err) {
        showAuthAlert('error', 'Registration error: ' + err.message);
      } finally {
        btnRegisterSubmit.disabled = false;
        btnRegisterSubmit.innerHTML = '<span>✨</span> Create Account';
      }
    });
  }

  // Back to Login from Pending Screen
  if (btnBackToLogin) {
    btnBackToLogin.addEventListener('click', () => {
      desktopPendingNotice.style.display = 'none';
      tabLoginBtn.click();
    });
  }

  // Sign Out Button
  if (btnSignOut) {
    btnSignOut.addEventListener('click', logoutDesktop);
  }

  // Admin Verification Modal Controls
  if (btnAdminVerifySales && adminVerifyModal && btnCloseAdminModal) {
    btnAdminVerifySales.addEventListener('click', () => {
      loadPendingSalesManagers();
      adminVerifyModal.style.display = 'flex';
    });

    btnCloseAdminModal.addEventListener('click', () => {
      adminVerifyModal.style.display = 'none';
    });
  }

  // Socket.IO event listeners for live pending count
  if (socket) {
    socket.on('sales_manager_registered', () => {
      if (desktopCurrentUser && desktopCurrentUser.role === 'store_admin') {
        loadPendingSalesManagers();
      }
    });

    socket.on('sales_manager_status_changed', () => {
      if (desktopCurrentUser && desktopCurrentUser.role === 'store_admin') {
        loadPendingSalesManagers();
      }
    });
  }

  // Check token on startup
  checkExistingDesktopAuth();
}

async function checkExistingDesktopAuth() {
  if (!desktopToken) {
    authOverlay.style.display = 'flex';
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${desktopToken}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      applyDesktopUser(data.user, desktopToken);
    } else {
      logoutDesktop();
    }
  } catch (err) {
    // If backend is momentarily unreachable, try saved user
    const saved = localStorage.getItem('storelistener_desktop_user');
    if (saved) {
      applyDesktopUser(JSON.parse(saved), desktopToken);
    } else {
      authOverlay.style.display = 'flex';
    }
  }
}

function applyDesktopUser(user, token) {
  desktopCurrentUser = user;
  desktopToken = token;
  localStorage.setItem('storelistener_desktop_token', token);
  localStorage.setItem('storelistener_desktop_user', JSON.stringify(user));

  // Hide auth overlay
  if (authOverlay) authOverlay.style.display = 'none';

  // Update header info
  if (headerUserName) headerUserName.textContent = user.name;
  if (repInput) repInput.value = user.name;
  if (storeSelect && user.storeCode) storeSelect.value = user.storeCode;

  if (user.role === 'store_admin') {
    if (userRoleIcon) userRoleIcon.textContent = '👑';
    if (headerUserRole) {
      headerUserRole.textContent = 'STORE ADMIN (AUTO-VERIFIED)';
      headerUserRole.style.color = '#ffd60a';
    }
    if (btnAdminVerifySales) {
      btnAdminVerifySales.style.display = 'inline-flex';
      loadPendingSalesManagers();
    }
  } else {
    if (userRoleIcon) userRoleIcon.textContent = '💼';
    if (headerUserRole) {
      headerUserRole.textContent = 'SALES MANAGER (VERIFIED)';
      headerUserRole.style.color = '#30d158';
    }
    if (btnAdminVerifySales) btnAdminVerifySales.style.display = 'none';
  }

  if (userAuthBadge) userAuthBadge.style.display = 'flex';
  if (btnSignOut) btnSignOut.style.display = 'inline-flex';
}

function logoutDesktop() {
  desktopToken = null;
  desktopCurrentUser = null;
  localStorage.removeItem('storelistener_desktop_token');
  localStorage.removeItem('storelistener_desktop_user');

  if (userAuthBadge) userAuthBadge.style.display = 'none';
  if (btnAdminVerifySales) btnAdminVerifySales.style.display = 'none';
  if (btnSignOut) btnSignOut.style.display = 'none';
  if (adminVerifyModal) adminVerifyModal.style.display = 'none';

  if (authOverlay) authOverlay.style.display = 'flex';
  if (tabLoginBtn) tabLoginBtn.click();
}

async function loadPendingSalesManagers() {
  if (!desktopToken || !desktopCurrentUser || desktopCurrentUser.role !== 'store_admin') return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/pending-sales-managers`, {
      headers: { Authorization: `Bearer ${desktopToken}` }
    });
    const data = await res.json();
    if (data.success && data.users) {
      if (pendingBadgeCount) pendingBadgeCount.textContent = data.count || 0;
      renderDesktopPendingList(data.users);
    }
  } catch (err) {
    console.warn('Failed to load pending managers:', err.message);
  }
}

function renderDesktopPendingList(users) {
  if (!desktopPendingList) return;

  if (users.length === 0) {
    desktopPendingList.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
        🎉 All caught up! No pending Sales Managers awaiting verification.
      </div>
    `;
    return;
  }

  desktopPendingList.innerHTML = users.map(u => `
    <div class="pending-item">
      <div class="pending-item-info">
        <div class="pending-item-name">${u.name}</div>
        <div class="pending-item-meta">${u.email} • ${u.storeName}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-success" onclick="window.approveSalesManagerDesktop('${u.id || u._id}', '${u.name}')" style="font-size: 11px; padding: 6px 12px;">
          ✅ Approve
        </button>
        <button class="btn btn-danger" onclick="window.rejectSalesManagerDesktop('${u.id || u._id}', '${u.name}')" style="font-size: 11px; padding: 6px 12px;">
          ✕ Reject
        </button>
      </div>
    </div>
  `).join('');
}

window.approveSalesManagerDesktop = async (id, name) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/users/${id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (data.success) {
      loadPendingSalesManagers();
    } else {
      alert(data.error || 'Failed to approve');
    }
  } catch (err) {
    alert('Approval error: ' + err.message);
  }
};

window.rejectSalesManagerDesktop = async (id, name) => {
  const reason = prompt(`Enter rejection reason for Sales Manager ${name}:`, 'Not authorized');
  if (reason === null) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/users/${id}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.success) {
      loadPendingSalesManagers();
    } else {
      alert(data.error || 'Failed to reject');
    }
  } catch (err) {
    alert('Rejection error: ' + err.message);
  }
};

