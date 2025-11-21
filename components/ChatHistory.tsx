import React from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Trash2, Plus, Settings } from 'lucide-react';

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  isOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-6 px-2">
             <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-lg">G</span>
             </div>
             <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Gemini<span className="text-blue-500">Chat</span></h1>
        </div>

        <button
          onClick={onNewSession}
          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            History
        </div>
        {sessions.length === 0 && (
          <div className="text-gray-400 dark:text-gray-600 text-center text-sm mt-8 italic">
            No history yet.
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all relative ${
              session.id === currentSessionId
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={18} className={`shrink-0 ${session.id === currentSessionId ? 'text-blue-500' : 'opacity-70'}`} />
              <span className="truncate text-sm font-medium">{session.title || "New Conversation"}</span>
            </div>
            
            {/* Gradient fade for long titles */}
            <div className={`absolute right-10 top-0 bottom-0 w-8 bg-gradient-to-l ${session.id === currentSessionId ? 'from-blue-50 dark:from-gray-900/0' : 'from-white dark:from-gray-900'} to-transparent pointer-events-none`}></div>

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

      {/* Footer with Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
        >
          <Settings size={20} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};