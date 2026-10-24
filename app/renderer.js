const logList = document.getElementById('commandLog');
const transcriptBox = document.getElementById('transcriptText');
const chatList = document.getElementById('chatList');
const statusPill = document.getElementById('statusPill');
const orbLabel = document.getElementById('orbLabel');
const listenBtn = document.getElementById('listenBtn');
const speakBtn = document.getElementById('speakBtn');

const stateMap = {
  'SYSTEM ACTIVE': { text: 'SYSTEM ACTIVE', color: '#7ef5b3' },
  'THINKING': { text: 'THINKING', color: '#ffd166' },
  'READY': { text: 'READY', color: '#7ee7ff' },
  'TERMINATE': { text: 'TERMINATE', color: '#ff5d73' }
};

function appendMessage(sender, text) {
  const item = document.createElement('div');
  item.className = `msg ${sender}`;
  item.innerHTML = `
    <span class="label">${sender === 'bot' ? 'JARVIS' : 'USER'}</span>
    <p>${text}</p>
  `;
  chatList.appendChild(item);
  chatList.scrollTop = chatList.scrollHeight;
}

function setOrbState(state) {
  const config = stateMap[state] || stateMap['READY'];
  statusPill.textContent = config.text;
  statusPill.style.color = config.color;
  statusPill.style.borderColor = config.color + '66';
  statusPill.style.background = config.color + '1a';
  orbLabel.textContent = config.text;
  orbLabel.style.color = config.color;
}

function addLogEntry(entry) {
  const item = document.createElement('li');
  item.textContent = entry;
  logList.appendChild(item);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    transcriptBox.textContent = 'Speech synthesis not supported in this browser.';
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 1;
  utterance.pitch = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function handleVoiceResult(text) {
  transcriptBox.textContent = text;
  appendMessage('user', text);
  addLogEntry(`User voice input: ${text}`);

  const response = generateAssistantReply(text);
  appendMessage('bot', response);
  addLogEntry(`AI response: ${response}`);
  speakText(response);
}

function generateAssistantReply(text) {
  const normalized = text.toLowerCase();

  if (normalized.includes('hello') || normalized.includes('नमस्ते') || normalized.includes('hi')) {
    return 'नमस्ते! मैं आपके लिए तैयार हूँ। आप क्या करना चाहते हैं?';
  }

  if (normalized.includes('open') || normalized.includes('खोल')) {
    return 'ठीक है, मैं सिस्टम को सक्रिय करता हूँ और आवश्यक कार्य शुरू करता हूँ।';
  }

  if (normalized.includes('time') || normalized.includes('समय')) {
    return `अभी का समय ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} है।`;
  }

  if (normalized.includes('weather') || normalized.includes('मौसम')) {
    return 'मौसम जानकारी अभी उपलब्ध नहीं है, लेकिन मैं आपके लिए मौसम ट्रैकिंग सर्विस को सक्रिय कर सकता हूँ।';
  }

  return 'मैं समझ गया। मैं आपकी आवाज़ के अनुसार कार्य करने के लिए तैयार हूँ।';
}

async function askAssistant(text) {
  try {
    const response = await fetch('http://127.0.0.1:8765/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, language: 'hi' })
    });

    if (!response.ok) {
      throw new Error('Backend not available');
    }

    const data = await response.json();
    return data.reply || generateAssistantReply(text);
  } catch (err) {
    return generateAssistantReply(text);
  }
}

listenBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    transcriptBox.textContent = 'Web Speech API is not supported on this machine. Please use the test speech button.';
    return;
  }

  setOrbState('THINKING');
  addLogEntry('Voice recognition started');

  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    transcriptBox.textContent = 'Listening...';
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    setOrbState('SYSTEM ACTIVE');
    transcriptBox.textContent = transcript;
    const botReply = await askAssistant(transcript);
    appendMessage('user', transcript);
    appendMessage('bot', botReply);
    addLogEntry(`AI response: ${botReply}`);
    speakText(botReply);
  };

  recognition.onerror = (event) => {
    transcriptBox.textContent = `Voice recognition error: ${event.error}`;
    setOrbState('READY');
  };

  recognition.onend = () => {
    setOrbState('READY');
    addLogEntry('Voice recognition ended');
  };

  recognition.start();
});

speakBtn.addEventListener('click', () => {
  setOrbState('SYSTEM ACTIVE');
  const message = 'नमस्ते, मैं जार्विस हूँ। मैं हिंदी और हिंग्लिश में बोल सकता हूँ।';
  speakText(message);
  transcriptBox.textContent = message;
  appendMessage('bot', message);
  addLogEntry('Speech test executed');
});

document.querySelectorAll('.control-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const state = button.dataset.state;
    setOrbState(state);
    addLogEntry(`Orb state changed to ${state}`);
  });
});

document.querySelectorAll('.tab-btn').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((panel) => panel.classList.remove('active'));
    tabBtn.classList.add('active');
    const target = document.getElementById(`tab-${tabBtn.dataset.tab}`);
    if (target) target.classList.add('active');
  });
});

setOrbState('READY');
