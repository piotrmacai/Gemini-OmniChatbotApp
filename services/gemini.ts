import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ModelId } from "../types";

/**
 * Helper to create a new GoogleGenAI instance.
 * Prioritizes a user-provided key, falls back to process.env.API_KEY.
 */
const getAI = (userKey?: string) => {
  const apiKey = userKey || (process.env.API_KEY as string);
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateGeminiResponse = async (
  modelId: string,
  prompt: string,
  images: string[] = [], // Base64 images
  systemInstruction?: string,
  userKey?: string
): Promise<string> => {
  const ai = getAI(userKey);
  
  let responseText = '';
  
  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  // Handle Image Generation (Imagen 4.0)
  if (modelId === ModelId.IMAGEN) {
    const response = await ai.models.generateImages({
      model: ModelId.IMAGEN,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1'
      }
    });
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      return `![Generated Image](data:image/jpeg;base64,${base64})`;
    }
    return "Failed to generate image.";
  }

  // Handle Image Editing or Multimodal Chat
  let modelToUse = modelId;
  if (modelId === ModelId.GEMINI_EDIT) {
      modelToUse = 'gemini-2.5-flash-image';
  }

  const parts: any[] = [];
  
  images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img
      }
    });
  });

  parts.push({ text: prompt });

  if (modelId === ModelId.GEMINI_EDIT && images.length > 0) {
      config.imageConfig = { aspectRatio: "1:1" };
  }

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: { parts },
    config
  });

  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              const base64 = part.inlineData.data;
              return `![Edited Image](data:image/png;base64,${base64})`;
          }
          if (part.text) {
              responseText += part.text;
          }
      }
  }
  
  if (responseText) return responseText;
  return response.text || "No response generated.";
};

/**
 * Creates a low-latency live session for voice interactions.
 */
export const createLiveSession = async (
    onMessage: (audioData: string | null, text: string | null, isUser: boolean) => void,
    onError: (err: any) => void,
    systemInstruction: string = "You are a helpful assistant.",
    voiceName: string = "Kore",
    userKey?: string
) => {
    const ai = getAI(userKey);
    
    return ai.live.connect({
        model: ModelId.GEMINI_LIVE,
        callbacks: {
            onopen: () => console.log("Live Session Opened"),
            onmessage: async (msg) => {
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                const modelTranscript = msg.serverContent?.outputTranscription?.text;
                const userTranscript = msg.serverContent?.inputTranscription?.text;

                if (audioData) onMessage(audioData, null, false);
                if (modelTranscript) onMessage(null, modelTranscript, false);
                if (userTranscript) onMessage(null, userTranscript, true);
            },
            onerror: (err) => onError(err),
            onclose: () => console.log("Live Session Closed")
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            },
            systemInstruction,
            inputAudioTranscription: {}, 
            outputAudioTranscription: {} 
        }
    });
};