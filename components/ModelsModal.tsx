import React, { useState } from 'react';
import { N8nAgent } from '../types';
import { X, Plus, Trash2, Bot, Edit2, Save, Power, PowerOff } from 'lucide-react';

interface ModelsModalProps {
  agents: N8nAgent[];
  onUpdateAgents: (agents: N8nAgent[]) => void;
  onClose: () => void;
}

export const ModelsModal: React.FC<ModelsModalProps> = ({ agents, onUpdateAgents, onClose }) => {
  const [editingAgent, setEditingAgent] = useState<N8nAgent | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    webhookUrl: '',
    authToken: 'macai',
    isActive: true
  });

  const handleSave = () => {
    if (!form.name || !form.webhookUrl) return;

    if (editingAgent) {
      const updated = agents.map(a => a.id === editingAgent.id ? { ...form, id: a.id } : a);
      onUpdateAgents(updated);
    } else {
      const newAgent: N8nAgent = {
        ...form,
        id: `n8n-${Date.now()}`,
      };
      onUpdateAgents([...agents, newAgent]);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', webhookUrl: '', authToken: 'macai', isActive: true });
    setEditingAgent(null);
    setIsAdding(false);
  };

  const startEdit = (agent: N8nAgent) => {
    setEditingAgent(agent);
    setForm({ 
      name: agent.name, 
      webhookUrl: agent.webhookUrl, 
      authToken: agent.authToken, 
      isActive: agent.isActive 
    });
    setIsAdding(true);
  };

  const toggleAgentStatus = (id: string) => {
    const updated = agents.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a);
    onUpdateAgents(updated);
  };

  const deleteAgent = (id: string) => {
    onUpdateAgents(agents.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="text-orange-500" /> Custom AI Models
            </h2>
            <p className="text-xs text-gray-500 mt-1">Manage and connect external n8n workflows as chat agents.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isAdding ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                  {editingAgent ? 'Edit Agent' : 'Configure New Agent'}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">AGENT NAME</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      placeholder="e.g. Research Assistant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">WEBHOOK URL</label>
                    <input
                      type="text"
                      value={form.webhookUrl}
                      onChange={e => setForm({ ...form, webhookUrl: e.target.value })}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      placeholder="https://n8n.your-instance.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">AUTH TOKEN (OPTIONAL)</label>
                    <input
                      type="text"
                      value={form.authToken}
                      onChange={e => setForm({ ...form, authToken: e.target.value })}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      placeholder="Auth token..."
                    />
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <button 
                       onClick={() => setForm({ ...form, isActive: !form.isActive })}
                       className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                         form.isActive 
                         ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                         : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                       }`}
                    >
                       {form.isActive ? <Power size={14} /> : <PowerOff size={14} />}
                       {form.isActive ? 'VISIBLE IN SELECTOR' : 'HIDDEN IN SELECTOR'}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all">
                    <Save size={18} /> {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Configured Agents</h3>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <Plus size={18} /> Add New
                </button>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-950 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <Bot size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No custom models configured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {agents.map(agent => (
                    <div key={agent.id} className={`group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border rounded-2xl transition-all shadow-sm hover:shadow-md ${agent.isActive ? 'border-orange-100 dark:border-orange-900/30' : 'border-gray-200 dark:border-gray-700 grayscale opacity-60'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-3 rounded-xl ${agent.isActive ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                          <Bot size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white truncate">{agent.name}</span>
                            {!agent.isActive && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Disabled</span>}
                          </div>
                          <span className="text-xs text-gray-500 block truncate">{agent.webhookUrl}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => toggleAgentStatus(agent.id)}
                          className={`p-2 rounded-lg transition-all ${agent.isActive ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                          title={agent.isActive ? "Deactivate" : "Activate"}
                        >
                          {agent.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                        </button>
                        <button 
                          onClick={() => startEdit(agent)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteAgent(agent.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {!isAdding && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
             <button onClick={onClose} className="px-8 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity">Done</button>
          </div>
        )}
      </div>
    </div>
  );
};
