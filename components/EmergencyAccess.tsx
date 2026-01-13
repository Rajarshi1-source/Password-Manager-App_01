import React, { useState } from 'react';
import { Users, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { EmergencyContact } from '../types';

const EmergencyAccess: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', status: 'Pending' },
    { id: '2', name: 'Bob Jones', email: 'bob@example.com', status: 'Granted', accessDate: Date.now() - 10000000 }
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const addContact = () => {
    if (!newEmail) return;
    setContacts([...contacts, {
      id: Date.now().toString(),
      name: 'Trusted Contact',
      email: newEmail,
      status: 'Pending'
    }]);
    setNewEmail('');
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto w-full">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-red-500" /> Emergency Access
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Grant trusted people access to your vault in case of emergency. They will have to wait for a specified period before gaining access.
        </p>
      </header>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-white">Trusted Contacts</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-emerald-400 hover:text-emerald-300">
            <Plus size={20} />
          </button>
        </div>

        {showAdd && (
          <div className="p-4 bg-slate-900/50 border-b border-slate-700 animate-fade-in">
            <input 
              type="email" 
              placeholder="Enter contact email"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white mb-2"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <button onClick={addContact} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm">Send Invite</button>
          </div>
        )}

        <div className="divide-y divide-slate-700">
          {contacts.map(contact => (
            <div key={contact.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{contact.email}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  {contact.status === 'Granted' ? <Clock size={12} /> : null}
                  Status: {contact.status}
                </div>
              </div>
              <div>
                {contact.status === 'Granted' ? (
                  <CheckCircle className="text-emerald-500" size={20} />
                ) : (
                  <Clock className="text-yellow-500" size={20} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Security Note</h4>
        <p className="text-xs text-slate-500">
          You can revoke access at any time. We will notify you immediately via email if an emergency access request is initiated.
        </p>
      </div>
    </div>
  );
};

export default EmergencyAccess;