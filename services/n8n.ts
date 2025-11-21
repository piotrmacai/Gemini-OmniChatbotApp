import { N8nAgent, Message } from '../types';

export async function sendMessageToN8N(
  message: string,
  agent: N8nAgent,
  chatHistory: Message[]
): Promise<string> {
  if (!agent.webhookUrl) {
    throw new Error(`Webhook URL is not configured for agent: ${agent.name}`);
  }

  const payload = {
    message,
    history: chatHistory.map(m => ({ role: m.role, content: m.text })),
    timestamp: Date.now()
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add Authorization header if token is present
    if (agent.authToken) {
      headers['Authorization'] = `Bearer ${agent.authToken}`;
    }

    const response = await fetch(agent.webhookUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Flexible response handling: look for text, message, or output property
    if (typeof data.output === 'string') return data.output;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data) && data.length && data[0].text) return data[0].text; // Array response

    return JSON.stringify(data);
  } catch (error: any) {
    console.error("n8n Service Error:", error);
    throw new Error(error.message || "Failed to connect to n8n Agent.");
  }
}