import React, { useState } from 'react';
import { AppSettings, N8nAgent } from '../types';
import { X, Save, Server, FileText, Plus, Trash2, Bot } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'n8n'>('general');
  
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentUrl, setNewAgentUrl] = useState('');
  const [newAgentToken, setNewAgentToken] = useState('macai');

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleAddAgent = () => {
    if (!newAgentName || !newAgentUrl) return;
    
    const newAgent: N8nAgent = {
        id: `n8n-${Date.now()}`,
        name: newAgentName,
        webhookUrl: newAgentUrl,
        authToken: newAgentToken
    };

    setLocalSettings({
        ...localSettings,
        n8nAgents: [...(localSettings.n8nAgents || []), newAgent]
    });

    setNewAgentName('');
    setNewAgentUrl('');
    setNewAgentToken('macai');
  };

  const handleRemoveAgent = (id: string) => {
      setLocalSettings({
          ...localSettings,
          n8nAgents: localSettings.n8nAgents.filter(a => a.id !== id)
      });
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] transform transition-all scale-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-800 px-5">
            <button 
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'general' 
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'text-gray-500 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('general')}
            >
                <FileText size={18} /> General
            </button>
            <button 
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'n8n' 
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'text-gray-500 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('n8n')}
            >
                <Server size={18} /> n8n Agents
            </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'general' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">System Instruction</label>
                    <p className="text-xs text-gray-500 mb-3">Defines the core persona and behavioral constraints of the AI models.</p>
                    <textarea
                    value={localSettings.systemInstruction}
                    onChange={(e) => setLocalSettings({ ...localSettings, systemInstruction: e.target.value })}
                    className="w-full h-48 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none shadow-inner"
                    placeholder="You are a helpful AI assistant..."
                    />
                </div>
              </div>
          )}

          {activeTab === 'n8n' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-200">
                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-3">
                    <Bot className="text-blue-500 shrink-0" size={20} />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Integrate custom n8n workflows as chat agents. They will appear in the model switcher.
                    </p>
                 </div>

                 {/* List Existing Agents */}
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Your Agents</h3>
                    {(!localSettings.n8nAgents || localSettings.n8nAgents.length === 0) && (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <p className="text-sm text-gray-500">No agents configured.</p>
                        </div>
                    )}
                    {localSettings.n8nAgents?.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Bot size={18} className="text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{agent.name}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{agent.webhookUrl}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveAgent(agent.id)}
                                className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Remove Agent"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                 </div>

                 <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Add New Agent</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Agent Name (e.g. Marketing Bot)"
                        />
                        <input
                            type="text"
                            value={newAgentUrl}
                            onChange={(e) => setNewAgentUrl(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Webhook URL (https://...)"
                        />
                        <input
                            type="text"
                            value={newAgentToken}
                            onChange={(e) => setNewAgentToken(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Auth Token (default: macai)"
                        />
                        <button 
                            onClick={handleAddAgent}
                            disabled={!newAgentName || !newAgentUrl}
                            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg ${
                                !newAgentName || !newAgentUrl 
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 hover:scale-[1.02]'
                            }`}
                        >
                            <Plus size={18} /> Add Agent
                        </button>
                    </div>
                 </div>
              </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};