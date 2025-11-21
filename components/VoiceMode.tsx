import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { createLiveSession } from '../services/gemini';
import { arrayBufferToBase64, decodeAudio, decodeAudioData, float32ToInt16 } from '../utils/audio';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstruction: string;
}

const VOICES = [
  { id: 'Kore', label: 'Kore', desc: 'Calm' },
  { id: 'Puck', label: 'Puck', desc: 'Playful' },
  { id: 'Charon', label: 'Charon', desc: 'Deep' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Energetic' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Soft' },
];

export const VoiceMode: React.FC<VoiceModeProps> = ({ isOpen, onClose, systemInstruction }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setTranscription(''); 
    
    const startSession = async () => {
      setStatus('connecting');
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioCtx({ sampleRate: 16000 });
        const outputCtx = new AudioCtx({ sampleRate: 24000 });
        
        audioContextRef.current = outputCtx;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        sessionRef.current = createLiveSession(
          (audioData, text, isUser) => {
              if (!active) return;
              if (text) {
                  setTranscription(text);
              }
              if (audioData) {
                 const bytes = decodeAudio(audioData);
                 decodeAudioData(bytes, outputCtx, 24000, 1).then(buffer => {
                     const source = outputCtx.createBufferSource();
                     source.buffer = buffer;
                     source.connect(outputCtx.destination);
                     
                     const currentTime = outputCtx.currentTime;
                     const startTime = Math.max(nextStartTimeRef.current, currentTime);
                     source.start(startTime);
                     nextStartTimeRef.current = startTime + buffer.duration;
                 });
              }
          },
          (err) => {
              console.error("Live API Error", err);
              if (active) setStatus('error');
          },
          systemInstruction,
          selectedVoice
        );

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
            if (isMuted || !active) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = float32ToInt16(inputData);
            const base64 = arrayBufferToBase64(int16.buffer);

            sessionRef.current?.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64
                    }
                });
            });
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
        
        sourceNodeRef.current = source;
        processorRef.current = processor;

        setStatus('active');
      } catch (e) {
          console.error(e);
          if (active) setStatus('error');
      }
    };

    startSession();

    return () => {
        active = false;
        sourceNodeRef.current?.disconnect();
        processorRef.current?.disconnect();
        audioContextRef.current?.close();
        sessionRef.current?.then(session => {
            try { session.close(); } catch (e) { console.warn(e); }
        });
    };
  }, [isOpen, systemInstruction, selectedVoice]); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 animate-fade-in">
        {/* Immersive Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black opacity-95"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent blur-3xl"></div>

        <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all z-10">
            <X size={28} />
        </button>

        <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full px-6">
            
            {/* Visualizer / Status */}
            <div className="relative group">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${
                    status === 'active' 
                    ? 'bg-gradient-to-tr from-blue-600 to-purple-600 shadow-[0_0_100px_rgba(59,130,246,0.5)] scale-110' 
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                     {/* Ripple Effect */}
                     {status === 'active' && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                            <div className="absolute inset-0 rounded-full border border-purple-400/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] delay-75"></div>
                        </>
                     )}

                    {status === 'connecting' && <Loader2 className="animate-spin text-white/80" size={64} />}
                    {status === 'active' && <Mic size={72} className="text-white drop-shadow-lg" />}
                    {status === 'error' && <span className="text-red-500 font-bold text-5xl">!</span>}
                </div>
            </div>
            
            {/* Captions */}
            <div className="text-center space-y-4 min-h-[140px] max-w-lg">
                <h2 className="text-3xl font-light text-white tracking-tight">
                    {status === 'connecting' ? 'Connecting...' : 
                     status === 'error' ? 'Connection Failed' : 'Listening'}
                </h2>
                <p className="text-blue-200/90 font-medium text-xl leading-relaxed transition-all">
                    {transcription ? `"${transcription}"` : <span className="opacity-30 italic text-lg">Go ahead, I'm listening...</span>}
                </p>
            </div>

            {/* Controls */}
            {status === 'active' && (
                <div className="flex flex-col items-center gap-8 w-full animate-slide-up">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-6 rounded-full transition-all transform hover:scale-110 shadow-2xl ${isMuted ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/50' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/5'}`}
                    >
                        {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                    </button>

                    {/* Voice Selector */}
                    <div className="bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md flex gap-2 overflow-x-auto max-w-full scrollbar-hide">
                        {VOICES.map((voice) => (
                            <button
                                key={voice.id}
                                onClick={() => setSelectedVoice(voice.id)}
                                className={`px-5 py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 min-w-[90px] ${
                                    selectedVoice === voice.id 
                                    ? 'bg-white text-black shadow-lg scale-105' 
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <span>{voice.label}</span>
                                <span className={`text-[10px] font-normal ${selectedVoice === voice.id ? 'text-gray-600' : 'text-gray-500'}`}>{voice.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};