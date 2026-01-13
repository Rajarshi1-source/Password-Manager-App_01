import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Check } from 'lucide-react';

const TwoFactorSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');

  // Mock QR Code (In real app, generate based on secret)
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault";

  const verify = () => {
    if (code.length === 6) {
      setStep(3);
      setTimeout(onComplete, 1500);
    } else {
      alert("Invalid code. Try 123456 (simulated)");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto w-full text-center">
      <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
        <ShieldCheck className="text-emerald-500" size={32} />
      </div>
      
      <h2 className="text-2xl font-bold text-white">Two-Factor Auth</h2>
      
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <p className="text-slate-400">
            Scan this QR code with Google Authenticator or Authy to protect your vault.
          </p>
          <div className="bg-white p-4 rounded-xl inline-block">
            <img src={qrUrl} alt="2FA QR Code" className="w-32 h-32" />
          </div>
          <p className="text-xs text-slate-500 font-mono">Secret: JBSWY3DPEHPK3PXP</p>
          <button 
            onClick={() => setStep(2)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg"
          >
            I've Scanned It
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <p className="text-slate-400">
            Enter the 6-digit code from your authenticator app to verify setup.
          </p>
          <input 
            type="text" 
            maxLength={6}
            placeholder="000 000"
            className="w-full text-center text-2xl tracking-widest bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button 
            onClick={verify}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg"
          >
            Verify & Enable
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-emerald-500 flex flex-col items-center gap-2">
            <Check size={48} />
            <span className="font-bold text-lg">2FA Enabled Successfully</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;