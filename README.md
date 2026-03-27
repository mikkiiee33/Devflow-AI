# ⚡ DevFlow AI
**The Browser-Native Agentic Workflow Automator**

Built for the **Agentic AI Hackathon 2026**.

[Demo Video]
[Try it Live]
---

## 🧠 The Problem
Current AI developer tools act primarily as "Code Generators." When a developer asks an AI to automate a task, the AI outputs a block of text/code. The developer must then manually parse it, open a terminal, install dependencies, and execute it. **It is an assistant, not an autonomous agent.**

## 🚀 The Solution: DevFlow AI
**DevFlow AI** is a high-fidelity prototype of a browser-native autonomous agent. It bridges the gap between static code generation and automated execution, completely eliminating the need for a backend terminal.

When a user types a complex task in plain English (e.g., *"Check the weather in Chennai and email me a summary"*), DevFlow AI uses Llama 3.3 to **plan, visualize, generate the code, and simulate the live execution** of the workflow natively in the browser.

---

## ✨ Key Features

* 🗺️ **Natural Language to Visual Workflow:** Instantly breaks a user's prompt down into a highly readable, interactive node-based flowchart.
* 💻 **Multi-Step Script Generation:** The agent automatically writes the complete, production-ready Python scripts required to perform the task.
* ⚡ **Live Execution Simulation:** Users watch the workflow execute in real-time. The UI features an "Agent Execution Log" where nodes physically light up (Running ↻ ➔ Completed ✓) to visualize the agent's progress step-by-step.
* 🔒 **Human-in-the-Loop Security:** True agents require guardrails. For sensitive actions (like sending emails), the agent halts execution and presents an elegant confirmation modal. The user must explicitly approve the payload before the agent securely hands the data off to the local OS mail client via `mailto:`.

---

## 🛠️ Tech Stack

This prototype was built to be radically lightweight, relying on modern browser capabilities and hyper-fast API routing.

* **Frontend Architecture:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
* **Agentic Brain:** **Llama 3.3 (70B-versatile)** via the **Groq API** for lightning-fast, structured JSON routing and code generation.
* **Security:** Bring-Your-Own-Key (BYOK) architecture via local `config.js` to prevent API key exposure.

---
