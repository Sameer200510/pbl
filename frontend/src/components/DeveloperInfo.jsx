import React, { useState, useEffect } from 'react';
import { Info, X, Code2, ShieldCheck } from 'lucide-react';

const DeveloperInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      {/* Floating Info Button */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-3">
        {/* Tooltip */}
        <div 
          className={`px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg transition-all duration-300 transform ${
            isHovered && !isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        >
          About Developers
        </div>
        
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsOpen(true)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-blue-500 bg-transparent opacity-90 hover:opacity-100 hover:bg-blue-50 transition-all duration-300"
        >
          <Info size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Popup Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
          
          {/* Modal Content */}
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Gradient Background */}
            <div className="h-32 bg-gradient-to-br from-[#131540] via-[#1c1f58] to-[#292d7c] relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Avatar / Icon */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-1 rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-tr from-[#fbc02d] to-amber-300 rounded-xl flex items-center justify-center text-[#131540]">
                  <Code2 size={40} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="pt-16 pb-8 px-8 text-center bg-white relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-green-100">
                <ShieldCheck size={14} /> System Architects
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                Sameer Lohani
                <span className="block text-xl text-gray-400 font-bold my-1">&amp;</span>
                Varun Dobhal
              </h3>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-sm font-bold text-[#131540] uppercase tracking-wide">
                  B.Tech CSE Cyber Security
                </p>
                <p className="text-gray-500 font-medium text-sm mt-1">
                  Batch of 2023 - 2027
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Built with passion & precision.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeveloperInfo;
