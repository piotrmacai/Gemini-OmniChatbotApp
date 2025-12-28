import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Send, Image as ImageIcon, Mic, 
  Bot, Sparkles, MoreHorizontal, Paperclip, X,
  Sun, Moon
} from 'lucide-react';

import { Message, ChatSession, ModelId, AppSettings, MessageRole, N8nAgent } from './types';
import { generateGeminiResponse } from './services/gemini';
import { sendMessageToN8N } from './services/n8n';
import { ChatHistory } from './components/ChatHistory';
import { SettingsModal } from './components/SettingsModal';
import { ModelsModal } from './components/ModelsModal';
import { VoiceMode } from './components/VoiceMode';

// Simple ID gen
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- Persistent Settings State (with Lazy Loading from Storage) ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    const defaultSettings: AppSettings = {
      systemInstruction: 'You are a helpful, expert AI assistant.',
      n8nAgents: [],
      geminiApiKey: ''
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration and cleanup
        if (parsed.n8nAgents) {
          parsed.n8nAgents = parsed.n8nAgents.map((a: any) => ({
            ...a,
            isActive: a.isActive !== undefined ? a.isActive : true
          }));
        }
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error("Failed to parse saved settings", e);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // --- App State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(ModelId.GEMINI_FLASH);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Sync Effects ---
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      localStorage.setItem('app_theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
      else createNewSession();
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSessionId, sessions, isLoading]);

  // --- Handlers ---
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) setCurrentSessionId(newSessions[0].id);
      else createNewSession();
    }
  };

  const handleUpdateAgents = (newAgents: N8nAgent[]) => {
      setSettings(prev => ({ ...prev, n8nAgents: newAgents }));
      
      const currentAgent = newAgents.find(a => a.id === selectedModel);
      if (selectedModel.startsWith('n8n-') && (!currentAgent || !currentAgent.isActive)) {
          setSelectedModel(ModelId.GEMINI_FLASH);
      }
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        let title = session.title;
        if (session.messages.length === 0 && newMessages.length > 0) {
          title = newMessages[0].text.slice(0, 30) + (newMessages[0].text.length > 30 ? '...' : '');
        }
        return { ...session, title, messages: newMessages };
      }
      return session;
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setAttachedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: MessageRole.USER,
      text: input,
      images: attachedImages,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentMessages, userMessage];
    updateSessionMessages(currentSessionId, updatedMessages);
    
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    try {
      let responseText = '';
      const rawImages = userMessage.images?.map(img => img.split(',')[1]) || [];
      const customAgent = settings.n8nAgents?.find(a => a.id === selectedModel);

      if (customAgent) {
        responseText = await sendMessageToN8N(userMessage.text, customAgent, updatedMessages);
      } else {
        responseText = await generateGeminiResponse(
          selectedModel, 
          userMessage.text, 
          rawImages, 
          settings.systemInstruction,
          settings.geminiApiKey // BYOK Override
        );
      }

      const botMessage: Message = {
        id: generateId(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };

      updateSessionMessages(currentSessionId, [...updatedMessages, botMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: generateId(),
        role: MessageRole.MODEL,
        text: `Error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      updateSessionMessages(currentSessionId, [...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg: Message) => {
    const userImages = msg.images?.map((img, idx) => (
        <img key={idx} src={img} alt="uploaded" className="max-w-xs rounded-xl border border-gray-200 dark:border-gray-700 mb-3 shadow-md" />
    ));

    const imgRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(msg.text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{msg.text.substring(lastIndex, match.index)}</span>);
        }
        parts.push(
            <div key={match.index} className="my-3">
                <img src={match[1]} alt="Generated" className="max-w-md rounded-xl shadow-lg border border-gray-200 dark:border-gray-700" />
            </div>
        );
        lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < msg.text.length) {
        parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{msg.text.substring(lastIndex)}</span>);
    }

    return (
        <div>
            {userImages && <div className="flex gap-2 flex-wrap mb-2">{userImages}</div>}
            <div className={`leading-relaxed ${msg.role === MessageRole.USER ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                {parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{msg.text}</span>}
            </div>
        </div>
    );
  };

  const getModelDisplayName = () => {
      const agent = settings.n8nAgents?.find(a => a.id === selectedModel);
      if (agent) return agent.name;

      switch (selectedModel) {
          case ModelId.GEMINI_FLASH: return 'Gemini 3 Flash';
          case ModelId.GEMINI_PRO: return 'Gemini 3 Pro';
          case ModelId.IMAGEN: return 'Imagen 4.0';
          case ModelId.GEMINI_EDIT: return 'Edit Image';
          default: return 'Select Model';
      }
  };

  const activeAgents = settings.n8nAgents.filter(a => a.isActive);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      <VoiceMode 
        isOpen={isVoiceModeOpen} 
        onClose={() => setIsVoiceModeOpen(false)} 
        systemInstruction={settings.systemInstruction}
        userKey={settings.geminiApiKey}
      />

      {isSettingsOpen && (
        <SettingsModal 
          settings={settings} 
          onSave={setSettings} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      {isModelsOpen && (
        <ModelsModal
          agents={settings.n8nAgents}
          onUpdateAgents={handleUpdateAgents}
          onClose={() => setIsModelsOpen(false)}
        />
      )}

      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-0'} overflow-hidden flex-shrink-0 relative border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl z-20`}>
        <ChatHistory
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenModels={() => setIsModelsOpen(true)}
          isOpen={isSidebarOpen}
          n8nAgents={settings.n8nAgents}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          hasUserApiKey={!!settings.geminiApiKey}
        />
      </div>

      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-gray-50 dark:bg-gray-950">
        <header className="h-16 flex items-center justify-between px-6 z-10 glass-panel sticky top-0 border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <Menu size={20} />
            </button>
            
            <div className="relative group">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full text-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm">
                <Bot size={16} className={`${selectedModel.startsWith('n8n-') ? 'text-orange-500' : 'text-blue-500'}`} />
                <span className="font-medium max-w-[150px] truncate text-gray-700 dark:text-gray-200">
                   {getModelDisplayName()}
                </span>
                <MoreHorizontal size={14} className="text-gray-400" />
              </div>
              
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 max-h-[80vh] overflow-y-auto">
                    <div className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Base Models</div>
                    <button onClick={() => setSelectedModel(ModelId.GEMINI_FLASH)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex items-center gap-3 text-gray-700 dark:text-gray-300"><Sparkles size={16} className="text-purple-500"/> Gemini 3 Flash</button>
                    <button onClick={() => setSelectedModel(ModelId.GEMINI_PRO)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex items-center gap-3 text-gray-700 dark:text-gray-300"><Bot size={16} className="text-blue-500"/> Gemini 3 Pro</button>
                    
                    <div className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider mt-2">Capabilities</div>
                    <button onClick={() => setSelectedModel(ModelId.IMAGEN)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex items-center gap-3 text-gray-700 dark:text-gray-300"><ImageIcon size={16} className="text-green-500"/> Imagen 4.0</button>
                    <button onClick={() => setSelectedModel(ModelId.GEMINI_EDIT)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex items-center gap-3 text-gray-700 dark:text-gray-300"><Sparkles size={16} className="text-pink-500"/> Edit Image</button>

                    {activeAgents.length > 0 && (
                        <>
                            <div className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider mt-2">Custom Models</div>
                            {activeAgents.map(agent => (
                                <button 
                                    key={agent.id} 
                                    onClick={() => setSelectedModel(agent.id)} 
                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex items-center gap-3 text-gray-700 dark:text-gray-300 group"
                                >
                                    <Bot size={16} className="text-orange-500 group-hover:rotate-12 transition-transform" /> 
                                    <span className="truncate">{agent.name}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
                title="Toggle Theme"
             >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth">
          {currentMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 animate-fade-in">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Bot size={48} className="text-blue-500 opacity-80" />
              </div>
              <p className="text-xl font-medium text-gray-700 dark:text-gray-300">How can I help you today?</p>
            </div>
          )}
          
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-3xl px-6 py-4 shadow-sm relative group ${
                msg.role === MessageRole.USER 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-blue-900/20' 
                  : msg.isError 
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
              }`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70 ${msg.role === MessageRole.USER ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.role === MessageRole.MODEL ? (msg.text.includes('Error') ? 'System Error' : getModelDisplayName()) : 'You'}
                </div>
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white dark:bg-gray-800 rounded-3xl rounded-bl-none px-6 py-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-2">
                 <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 glass-panel sticky bottom-0 z-20">
          <div className="max-w-4xl mx-auto relative">
            {attachedImages.length > 0 && (
              <div className="absolute bottom-full left-0 mb-4 flex gap-3 p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-x-auto animate-slide-up">
                {attachedImages.map((img, idx) => (
                  <div key={idx} className="relative group shrink-0">
                    <img src={img} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
                    <button 
                      onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 text-gray-500 hover:text-red-500 shadow-md transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3 bg-white dark:bg-gray-900/80 backdrop-blur-md p-2.5 rounded-[2rem] border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all shadow-xl shadow-gray-200/50 dark:shadow-black/20">
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  multiple={false} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                title="Attach Image"
              >
                <Paperclip size={22} />
              </button>

              <button 
                onClick={() => setIsVoiceModeOpen(true)}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="Start Voice Mode"
              >
                <Mic size={22} />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 resize-none py-3 max-h-32 text-base"
                rows={1}
                style={{ minHeight: '48px' }}
              />

              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                className={`p-3 rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                  (input.trim() || attachedImages.length > 0) && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={20} className={isLoading ? 'animate-pulse' : ''} />
              </button>
            </div>
            <div className="text-center mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide">
              {selectedModel.startsWith('n8n-') 
                  ? `Connected to ${getModelDisplayName()}` 
                  : 'Gemini may display inaccurate info, including about people, so double-check its responses.'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;