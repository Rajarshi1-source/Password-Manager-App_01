import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, ShieldCheck, Check, Info } from 'lucide-react';

interface PasswordGeneratorProps {
  onSelect?: (password: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onSelect, onClose, compact = false }) => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  const generate = () => {
    let charset = '';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz' + (excludeAmbiguous ? '' : 'lo');
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' + (excludeAmbiguous ? '' : 'IO');
    const numbers = '23456789' + (excludeAmbiguous ? '' : '01');
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    if (useLowercase) charset += lowercase;
    if (useUppercase) charset += uppercase;
    if (useNumbers) charset += numbers;
    if (useSymbols) charset += symbols;

    // Fallback if nothing selected
    if (charset === '') charset = lowercase;

    let retVal = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(array[i] % charset.length);
    }
    setPassword(retVal);
  };

  useEffect(() => {
    generate();
  }, [length, useLowercase, useUppercase, useNumbers, useSymbols, excludeAmbiguous]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    // Simple visual feedback could be added here if needed, 
    // but the parent usually handles the main action
  };

  const calculateEntropy = () => {
    let poolSize = 0;
    if (useLowercase) poolSize += 26;
    if (useUppercase) poolSize += 26;
    if (useNumbers) poolSize += 10;
    if (useSymbols) poolSize += 30; // approx
    if (excludeAmbiguous) poolSize -= 4; // roughly

    if (poolSize === 0) return 0;
    
    // Entropy = length * log2(poolSize)
    const entropy = length * Math.log2(poolSize);
    return Math.floor(entropy);
  };

  const entropy = calculateEntropy();
  
  const getStrengthInfo = (e: number) => {
      if (e < 40) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', width: '25%' };
      if (e < 70) return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400', width: '50%' };
      if (e < 100) return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-400', width: '75%' };
      return { label: 'Excellent', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: '100%' };
  };

  const { label, color, textColor, width } = getStrengthInfo(entropy);

  return (
    <div className={`space-y-6 w-full ${compact ? 'p-0' : 'p-6 max-w-md mx-auto'}`}>
      {!compact && (
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" /> Generator
        </h2>
      )}

      {/* Password Display */}
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-inner">
        <div className="flex items-center justify-between mb-4">
           <span className="text-xl font-mono text-emerald-400 break-all mr-2 tracking-wide min-h-[1.75rem]">{password}</span>
           <div className="flex gap-2 shrink-0">
            <button onClick={generate} type="button" className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Regenerate">
                <RefreshCw size={20} />
            </button>
            <button onClick={copyToClipboard} type="button" className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Copy">
                <Copy size={20} />
            </button>
           </div>
        </div>
        
        {/* Strength Meter */}
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">STRENGTH: {entropy} bits</span>
                <span className={`font-bold ${textColor} uppercase tracking-wider`}>{label}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                <div className={`h-full ${color} transition-all duration-500 ease-out`} style={{ width }}></div>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 space-y-6">
        
        {/* Length Slider */}
        <div>
          <div className="flex justify-between mb-3">
            <span className="text-slate-300 font-medium text-sm">Length</span>
            <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded text-sm">{length}</span>
          </div>
          <input 
            type="range" 
            min="6" 
            max="64" 
            value={length} 
            onChange={(e) => setLength(parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
              <span>6</span>
              <span>64</span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lowercase (a-z)', state: useLowercase, set: setUseLowercase },
            { label: 'Uppercase (A-Z)', state: useUppercase, set: setUseUppercase },
            { label: 'Numbers (0-9)', state: useNumbers, set: setUseNumbers },
            { label: 'Symbols (!@#)', state: useSymbols, set: setUseSymbols },
            { label: 'No Ambiguous', state: excludeAmbiguous, set: setExcludeAmbiguous, tooltip: 'Excludes characters like I, l, 1, O, 0' },
          ].map((opt, idx) => (
            <button
                key={idx}
                type="button"
                onClick={() => opt.set(!opt.state)}
                className={`
                    relative flex flex-col items-start p-3 rounded-xl border transition-all text-left
                    ${opt.state 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100' 
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                    }
                `}
            >
                <div className="flex justify-between w-full mb-1">
                    <span className="text-xs font-semibold">{opt.label.split(' (')[0]}</span>
                    {opt.state && <Check size={14} className="text-emerald-400" />}
                </div>
                <span className="text-[10px] opacity-70 truncate w-full">{opt.label.split(' (')[1]?.replace(')', '') || (opt.tooltip ? 'Avoids confusion' : 'Standard')}</span>
            </button>
          ))}
        </div>
      </div>

      {onSelect && (
        <div className="flex gap-3 pt-2">
          {onClose && (
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors font-medium border border-transparent hover:border-slate-600">
              Cancel
            </button>
          )}
          <button 
            type="button"
            onClick={() => onSelect(password)} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Check size={20} /> Use Password
          </button>
        </div>
      )}
    </div>
  );
};

export default PasswordGenerator;