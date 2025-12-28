import { N8nAgent, Message } from '../types';

export async function sendMessageToN8N(
  message: string,
  agent: N8nAgent,
  chatHistory: Message[]
): Promise<string> {
  if (!agent.webhookUrl) {
    throw new Error(`Webhook URL is not configured for agent: ${agent.name}`);
  }

  // Ensure message is not null or undefined
  const safeMessage = message || "";

  const payload = {
    message: safeMessage,
    // Provide a cleaner history format for n8n nodes to parse easily
    chat_history: chatHistory.map(m => ({ 
      role: m.role, 
      text: m.text 
    })),
    sessionId: agent.id, // Helpful for n8n to track sessions if needed
    timestamp: new Date().toISOString()
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

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
      throw new Error(`n8n Error (${response.status}): ${errorText || 'Internal Server Error'}`);
    }

    const data = await response.json();
    
    // Comprehensive extraction logic for common n8n response patterns
    if (data.output && typeof data.output === 'string') return data.output;
    if (data.text && typeof data.text === 'string') return data.text;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.response && typeof data.response === 'string') return data.response;
    
    // If it's an array of objects (common in n8n)
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (typeof first === 'string') return first;
      if (first.output) return first.output;
      if (first.text) return first.text;
      if (first.message) return first.message;
    }

    // Fallback if structure is unknown but not empty
    if (Object.keys(data).length > 0) return JSON.stringify(data);

    return "Agent returned an empty response.";
  } catch (error: any) {
    console.error("n8n Service Error:", error);
    throw new Error(error.message || "Failed to connect to n8n Agent.");
  }
}