import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ModelId } from "../types";

// Ensure API Key is present
const API_KEY = process.env.API_KEY || '';

const createAI = () => {
  if (!API_KEY) throw new Error("API_KEY is missing in environment.");
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const generateGeminiResponse = async (
  modelId: string,
  prompt: string,
  images: string[] = [], // Base64 images
  systemInstruction?: string
): Promise<string> => {
  const ai = createAI();
  
  let responseText = '';
  
  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  // Handle Image Generation (Imagen)
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
      // Return a special markdown tag for the UI to render
      return `![Generated Image](data:image/jpeg;base64,${base64})`;
    }
    return "Failed to generate image.";
  }

  // Handle Image Editing or Multimodal Chat
  // If we have images in input, we use gemini-2.5-flash or gemini-3-pro-preview
  // If strictly editing mode was requested, we might prioritize a specific model, 
  // but general models handle multimodal input well.
  
  let modelToUse = modelId;
  // If user specifically wants "Editing" (Gemini 2.5 Flash Image is good for this)
  if (modelId === ModelId.GEMINI_EDIT) {
      // Fallback to flash-image or flash depending on availability
      modelToUse = 'gemini-2.5-flash-image';
  }

  // Construct contents
  const parts: any[] = [];
  
  // Add images first
  images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', // Assuming jpeg for simplicity, or detect from header
        data: img
      }
    });
  });

  // Add text
  parts.push({ text: prompt });

  if (modelId === ModelId.GEMINI_EDIT) {
     // Specific config for edit model if needed, usually responseModalities=[Modality.IMAGE] 
     // if we wanted it to output an image. 
     // However, the prompt says "generate or edit".
     // To edit and *return* an image, we need responseModalities.
     // Let's guess user intent: if they attached an image and said "make it blue", they want an image back.
     if (images.length > 0) {
         config.responseModalities = [Modality.IMAGE];
     }
  }

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: { parts },
    config
  });

  // Check for image output (Editing result)
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
  
  // Fallback for standard text only response
  return response.text || "No response generated.";
};

// --- Live API Helpers ---
export const createLiveSession = async (
    onMessage: (audioData: string | null, text: string | null, isUser: boolean) => void,
    onError: (err: any) => void,
    systemInstruction: string = "You are a helpful assistant.",
    voiceName: string = "Kore"
) => {
    const ai = createAI();
    
    return ai.live.connect({
        model: ModelId.GEMINI_LIVE,
        callbacks: {
            onopen: () => console.log("Live Session Opened"),
            onmessage: (msg) => {
                // Handle Model Audio
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                
                // Handle Transcription (Optional, for UI)
                const modelTranscript = msg.serverContent?.outputTranscription?.text;
                const userTranscript = msg.serverContent?.inputTranscription?.text;

                if (audioData) {
                    onMessage(audioData, null, false);
                }
                if (modelTranscript) {
                    onMessage(null, modelTranscript, false);
                }
                if (userTranscript) {
                    onMessage(null, userTranscript, true);
                }
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
            // Enable transcriptions for UI feedback
            inputAudioTranscription: { model: "gemini-2.5-flash" }, // Explicitly requesting transcription
            outputAudioTranscription: {} 
        }
    });
};