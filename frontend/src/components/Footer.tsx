import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#0B0C10] border-t border-[#1F2833] py-8 mt-auto text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="font-semibold text-slate-400">© 2026 AstroCRM Advisory Inc.</p>
          <p className="mt-1 text-[10px] text-slate-600">Calculated under local coordinate matrices and NASA JPL planetary alignments.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#1F2833] border border-[#C5A059]/10 text-[#C5A059] font-serif uppercase tracking-widest">
            Saturn Return Audit v2.1
          </span>
        </div>
      </div>
    </footer>
  );
}
