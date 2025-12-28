import React from 'react';
import { ChatSession, N8nAgent } from '../types';
import { MessageSquare, Trash2, Plus, Bot, Layers, UserCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onOpenModels: () => void;
  isOpen: boolean;
  n8nAgents: N8nAgent[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  hasUserApiKey: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  onOpenModels,
  isOpen,
  n8nAgents,
  selectedModel,
  onSelectModel,
  hasUserApiKey
}) => {
  if (!isOpen) return null;

  const activeAgents = n8nAgents.filter(a => a.isActive);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="p-5 shrink-0">
        <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-white font-bold text-lg">G</span>
                </div>
                <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Gemini<span className="text-blue-500">Chat</span></h1>
            </div>
            <div className="flex items-center" title={hasUserApiKey ? "Using Custom API Key" : "Using Default API Key"}>
                {hasUserApiKey ? <ShieldCheck size={16} className="text-green-500" /> : <ShieldAlert size={16} className="text-yellow-500 opacity-50" />}
            </div>
        </div>

        <button
          onClick={onNewSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-md shadow-blue-500/20 border border-transparent"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 pb-4">
        {/* History Section */}
        <div>
          <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              History
          </div>
          <div className="space-y-1 mt-1">
            {sessions.length === 0 && (
              <div className="text-gray-400 dark:text-gray-600 text-center text-xs py-4 italic">
                No history yet.
              </div>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all relative ${
                  session.id === currentSessionId
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-100'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={`shrink-0 ${session.id === currentSessionId ? 'text-blue-500' : 'opacity-70'}`} />
                  <span className="truncate text-sm font-medium">{session.title || "New Conversation"}</span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Agents Section (Active only) */}
        {activeAgents.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex justify-between items-center">
                Custom Agents
            </div>
            <div className="space-y-1 mt-1">
              {activeAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all relative ${
                    selectedModel === agent.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-100 ring-1 ring-orange-200 dark:ring-orange-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => onSelectModel(agent.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Bot size={16} className={`shrink-0 ${selectedModel === agent.id ? 'text-orange-500' : 'opacity-70'}`} />
                    <span className="truncate text-sm font-medium">{agent.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-2">
        <button
          onClick={onOpenModels}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-2xl transition-all group"
          title="Manage Custom Models"
        >
          <Layers size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Custom Models</span>
        </button>
        
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
             <UserCircle size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
             <span className="text-sm font-bold text-gray-700 dark:text-gray-200">User Profile</span>
          </div>
          {hasUserApiKey && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>}
        </button>
      </div>
    </div>
  );
};