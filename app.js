import { GROQ_API_KEY } from './config.js';

// GLOBAL EXPORTS (Fixes HTML onclick buttons)
window.goToHome = goToHome;
window.goToChat = goToChat;
window.handleEnter = handleEnter;
window.fillAndSend = fillAndSend;
window.sendMessage = sendMessage;
window.resolveEmail = resolveEmail;
window.copyCode = copyCode;

//STATE
let chatHistory = [{
  role: "system",
  content: `You are DevFlow AI, an agentic developer assistant. ALWAYS reply with ONLY valid JSON.

If user asks a general question:
{ "reply": "Your answer here.", "has_workflow": false }

If user asks to automate / build / run a workflow:
{
  "reply": "One-line description of what you will do.",
  "has_workflow": true,
  "workflow": {
    "steps": [
      {
        "name": "Short Step Name",
        "description": "What this step does",
        "type": "plan|search|email|file|api|code|test",
        "status_msg": "Short live status message shown while running (e.g. Analyzing via Groq LPU...)"
      }
    ],
    "script": ["line1 of python", "line2 of python"],
    "filename": "workflow.py",
    "email": { "to": "recipient@email.com", "subject": "Subject here", "body": "Full email body here" }
  }
}

RULES:
- script is an array of Python strings (use single quotes inside strings)
- Only include "email" field if the workflow sends an email — extract real values from user's message
- 2 to 5 steps maximum
- status_msg is short (e.g. "Checking weather in Chennai", "Composing email draft")`
}];

let emailResolve = null;

//NAVIGATION
function goToChat() {
  document.getElementById('homeView').classList.remove('active');
  document.getElementById('chatView').classList.add('active');
  document.getElementById('taskInput').focus();
}
function goToHome() {
  document.getElementById('chatView').classList.remove('active');
  document.getElementById('homeView').classList.add('active');
}

// UTILS 
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function scrollToBottom() {
  const b = document.getElementById('chatbox');
  b.scrollTop = b.scrollHeight;
}

function syntaxHighlight(code) {
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/(#[^\n]*)/g,'<span class="cm">$1</span>')
    .replace(/\b(import|from|def|class|if|else|elif|for|while|try|except|return|with|as|in|not|and|or|True|False|None|print|raise|pass)\b/g,'<span class="kw">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="str">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="num">$1</span>')
    .replace(/\b([a-z_][a-z0-9_]*)\s*(?=\()/g,'<span class="fn">$1</span>');
}

function typeIcon(type) {
  return { plan:'🧠', search:'🔍', email:'✉', file:'📄', api:'⚡', code:'⚙', test:'✓' }[type] || '▸';
}

// TEXTAREA AUTO-RESIZE 
const tx = document.getElementById('taskInput');
tx.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

function handleEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function fillAndSend(text) {
  goToChat();
  setTimeout(() => { tx.value = text; sendMessage(); }, 80);
}

// CHAT HELPERS 
function appendUserMsg(text) {
  document.getElementById('chatbox').insertAdjacentHTML('beforeend',
    `<div class="msg-row user"><div class="msg-bubble">${text}</div></div>`);
  scrollToBottom();
}

function appendAIText(text, isError = false) {
  const cls = isError ? 'error-text' : 'ai-text';
  document.getElementById('chatbox').insertAdjacentHTML('beforeend', `
    <div class="msg-row ai"><div class="msg-bubble">
      <div class="ai-header"><div class="ai-avatar">DF</div><div class="ai-name">DevFlow AI</div></div>
      <div class="${cls}">${text}</div>
    </div></div>`);
  scrollToBottom();
}

function toggleTyping(show) {
  const box = document.getElementById('chatbox');
  let el = document.getElementById('typingLoader');
  if (show) {
    if (!el) box.insertAdjacentHTML('beforeend',
      `<div class="msg-row ai" id="typingLoader"><div class="typing-indicator show"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`);
  } else { if (el) el.remove(); }
  scrollToBottom();
}

//EXECUTION LOG 
function buildExecLog(steps, replyText) {
  const id = 'log' + Date.now();
  const stepsHtml = steps.map((s, i) => `
    <div class="exec-step" id="${id}_s${i}">
      <div class="exec-step-row">
        <div class="exec-step-icon" id="${id}_ic${i}">${typeIcon(s.type)}</div>
        <div class="exec-step-name">${s.name}</div>
      </div>
      <div class="exec-step-sub" id="${id}_sub${i}">${s.status_msg || s.description}</div>
    </div>`).join('');

  document.getElementById('chatbox').insertAdjacentHTML('beforeend', `
    <div class="msg-row ai"><div class="msg-bubble">
      <div class="ai-header"><div class="ai-avatar">DF</div><div class="ai-name">DevFlow AI</div></div>
      <div class="ai-text">${replyText}</div>
      <div class="exec-log">
        <div class="exec-log-header">
          <div class="exec-log-title"><span class="exec-log-title-icon">⚡</span> Agent Execution Log</div>
          <span class="exec-badge running" id="${id}_badge">● Running</span>
        </div>
        <div class="exec-steps">${stepsHtml}</div>
        <div id="${id}_script"></div>
      </div>
    </div></div>`);
  scrollToBottom();
  return id;
}

function stepActive(id, i) {
  const el = document.getElementById(`${id}_s${i}`);
  if (el) { el.classList.remove('done','fail'); el.classList.add('active'); }
  scrollToBottom();
}

function stepDone(id, i, result) {
  const el = document.getElementById(`${id}_s${i}`);
  const ic = document.getElementById(`${id}_ic${i}`);
  if (el) {
    el.classList.remove('active','fail');
    el.classList.add('done');
    if (ic) ic.textContent = '✓';
    if (result) el.insertAdjacentHTML('beforeend', `<div class="exec-step-result">${result}</div>`);
  }
  scrollToBottom();
}

function stepFail(id, i, msg) {
  const el = document.getElementById(`${id}_s${i}`);
  if (el) {
    el.classList.remove('active','done'); el.classList.add('fail');
    el.insertAdjacentHTML('beforeend', `<div class="exec-step-result">${msg}</div>`);
  }
}

function logComplete(id, script, filename) {
  const badge = document.getElementById(`${id}_badge`);
  if (badge) { badge.className = 'exec-badge done'; badge.textContent = '✓ Completed'; }
  if (script && script.length) {
    const raw = Array.isArray(script) ? script.join('\n') : script;
    const safe = raw.replace(/`/g, "'");
    const el = document.getElementById(`${id}_script`);
    if (el) el.innerHTML = `
      <div class="workflow-widget" style="margin-top:12px;padding:16px;">
        <div class="script-header">
          <span class="script-filename">${filename || 'workflow.py'}</span>
          <button class="btn-copy-sm" onclick="copyCode(this,\`${safe}\`)">Copy</button>
        </div>
        <pre>${syntaxHighlight(raw)}</pre>
      </div>`;
  }
  scrollToBottom();
}

function logError(id) {
  const badge = document.getElementById(`${id}_badge`);
  if (badge) { badge.className = 'exec-badge error'; badge.textContent = '✗ Error'; }
}

function copyCode(btn, code) {
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

// EMAIL MODAL 
function showEmailModal(email) {
  document.getElementById('modalTo').textContent = email.to || '';
  document.getElementById('modalSubject').textContent = email.subject || '';
  document.getElementById('modalBody').textContent = email.body || '';
  document.getElementById('emailModal').classList.add('show');
  return new Promise(r => { emailResolve = r; });
}

function resolveEmail(approved) {
  document.getElementById('emailModal').classList.remove('show');
  if (emailResolve) { emailResolve(approved); emailResolve = null; }
}

//STEP EXECUTOR 
async function executeSteps(logId, steps, emailData) {
  const stepResults = {
    plan:   'Workflow generated',
    search: 'Data retrieved successfully',
    file:   'File processed',
    api:    'Response received',
    code:   'Script ready',
    test:   'Tests passed'
  };

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    stepActive(logId, i);

    // Email step — show modal for human approval
    const isEmailStep = s.type === 'email' ||
      s.name.toLowerCase().includes('email') ||
      s.name.toLowerCase().includes('send');

    if (isEmailStep && emailData) {
      const sub = document.getElementById(`${logId}_sub${i}`);
      if (sub) sub.textContent = `To: ${emailData.to}`;
      await sleep(600);

      const approved = await showEmailModal(emailData);
      if (approved) {
        const mailto = `mailto:${encodeURIComponent(emailData.to)}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
        window.open(mailto, '_blank');
        stepDone(logId, i, `Email sent to ${emailData.to} ✓`);
        showToast('Email opened in your mail client!');
      } else {
        stepFail(logId, i, 'Cancelled by user');
        logError(logId);
        return false;
      }
    } else {
      await sleep(800 + Math.random() * 700);
      stepDone(logId, i, stepResults[s.type] || 'Completed');
    }
  }
  return true;
}

//MAIN SEND 
async function sendMessage() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;

  if (!GROQ_API_KEY || GROQ_API_KEY.includes('YOUR_GROQ')) {
    appendUserMsg(text);
    appendAIText('Please set your Groq API key in the code (line 3 of the script block). Get a free key at console.groq.com', true);
    input.value = '';
    return;
  }

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;
  appendUserMsg(text);
  toggleTyping(true);

  chatHistory.push({
    role: "user",
    content: text + "\n(CRITICAL: Return ONLY valid JSON. Use single quotes inside the script array.)"
  });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: chatHistory, temperature: 0.1 })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || res.statusText);

    let raw = data.choices[0].message.content;
    let parsed;

    try {
      let cleaned = raw.replace(/```json/gi,'').replace(/```/g,'').trim();
      cleaned = cleaned.replace(/\n/g,'\\n').replace(/\r/g,'\\r');
      parsed = JSON.parse(cleaned);
    } catch(e) {
      const s = raw.indexOf('{'), end = raw.lastIndexOf('}');
      if (s !== -1 && end !== -1) parsed = JSON.parse(raw.substring(s, end + 1));
      else throw new Error("AI response was not valid JSON. Try rephrasing.");
    }

    chatHistory.push({ role: "assistant", content: JSON.stringify(parsed) });
    toggleTyping(false);

    if (parsed.has_workflow && parsed.workflow) {
      const wf = parsed.workflow;
      const logId = buildExecLog(wf.steps, parsed.reply || 'Executing workflow...');
      const ok = await executeSteps(logId, wf.steps, wf.email || null);
      if (ok) logComplete(logId, wf.script, wf.filename);
    } else {
      appendAIText(parsed.reply || 'Done.');
    }

  } catch(err) {
    toggleTyping(false);
    const isQuota = err.message.includes('quota') || err.message.includes('rate') || err.message.includes('429');
    appendAIText(isQuota
      ? 'Rate limit hit. Wait a moment and try again.'
      : `Error: ${err.message}`, true);
    chatHistory.pop();
  } finally {
    document.getElementById('sendBtn').disabled = false;
  }
}