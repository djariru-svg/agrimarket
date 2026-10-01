<template>
  <div class="chat-widget">
    <button v-if="!open" class="chat-toggle" @click="open = true">💬 AI</button>

    <div v-else class="chat-panel">
      <div class="chat-header">
        <strong>AgriMarket AI</strong>
        <button class="btn btn-small" @click="open = false">✕</button>
      </div>

      <div class="chat-body">
        <div v-for="(msg, index) in messages" :key="index" class="chat-message" :class="msg.role">
          {{ msg.text }}
        </div>
      </div>

      <div class="chat-input-row">
        <input v-model="message" @keyup.enter="sendMessage" placeholder="Ask about farming, pricing..." />
        <button class="btn btn-primary btn-small" @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const open = ref(false);
const message = ref('');
const messages = ref([
  { role: 'assistant', text: 'Hello! I can help with product questions, pricing, and agriculture advice.' }
]);

const sendMessage = async () => {
  if (!message.value.trim()) return;

  const userMessage = message.value.trim();
  messages.value.push({ role: 'user', text: userMessage });
  message.value = '';

  try {
    const response = await axios.post('/api/ai/chat', {
      message: userMessage,
      sessionId: 'default-session'
    }, { withCredentials: true });

    messages.value.push({ role: 'assistant', text: response.data.message });
  } catch (error) {
    messages.value.push({ role: 'assistant', text: 'AI is temporarily unavailable.' });
  }
};
</script>

<style scoped>
.chat-widget {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
}

.chat-toggle {
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 999px;
  padding: 0.85rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.chat-panel {
  width: min(340px, calc(100vw - 2rem));
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--primary);
  color: white;
  padding: 0.8rem 1rem;
}

.chat-body {
  max-height: 260px;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-message {
  max-width: 85%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.9rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.chat-message.user {
  align-self: flex-end;
  background: rgba(47, 143, 70, 0.12);
}

.chat-message.assistant {
  align-self: flex-start;
  background: rgba(0, 0, 0, 0.04);
}

.chat-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.8rem;
  border-top: 1px solid var(--border);
}

.chat-input-row input {
  flex: 1;
}
</style>
