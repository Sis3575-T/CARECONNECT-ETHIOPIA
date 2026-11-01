import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Globe } from 'lucide-react';

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const [language, setLanguage] = useState('en'); // 'en' or 'am'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello Dr. Alemayehu! I am CareConnect AI Assistant. I can help you with referral guidelines, facility capacities, OCR extraction questions, or translating clinical terms between English and Amharic (አማርኛ).'
    }
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Generate intelligent response
    setTimeout(() => {
      let reply = '';
      const lower = inputText.toLowerCase();
      if (lower.includes('tikur anbessa') || lower.includes('black lion') || lower.includes('cardio')) {
        reply = language === 'am'
          ? 'ጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል በአሁኑ ሰዓት 42 ክፍት አልጋዎች አሉት። የልብ ህክምና (Cardiology) እና የካቴተራይዜሽን ላብራቶሪ ዝግጁ ነው። ሪፈራል መላክ ይችላሉ።'
          : 'Tikur Anbessa Specialized Hospital currently has 42 available beds with 24/7 Cardiology catheterization duty. The estimated ambulance transit time from Yeka HC is 22 minutes.';
      } else if (lower.includes('ocr') || lower.includes('document')) {
        reply = language === 'am'
          ? 'የወረቀት ሪፈራል ፎርም ሲያነሱ ግልጽ የሆነ ፎቶ ያንሱ። ሲስተማችን የቴሴራክት (Tesseract OCR) ቴክኖሎጂን በመጠቀም ጽሑፉን አውጥቶ በራስ-ሰር ያደራጃል።'
          : 'CareConnect integrates Tesseract OCR and OpenCV image processing. Make sure the referral slip is well-lit for optimal entity extraction.';
      } else {
        reply = language === 'am'
          ? 'ጥያቄዎ ተቀብያለሁ። ለሪፈራል ቅድሚያ የሚሰጠው የክሊኒካዊ አጣዳፊነት እና የሆስፒታሉ የቅርብ ርቀት ነው። ተጨማሪ ድጋፍ ይፈልጋሉ?'
          : 'Referral priority is determined using clinical urgency rules, distance, and recent facility capacity updates. Would you like me to check capacity for a specific hospital or specialty?';
      }
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    }, 600);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 bg-sky-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <div>
            <h3 className="font-bold text-sm">CareConnect AI Assistant</h3>
            <p className="text-[11px] text-sky-100">Bilingual Healthcare Guidance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(l => l === 'en' ? 'am' : 'en')}
            className="flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-colors"
            title="Toggle English / Amharic"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'EN' : 'አማርኛ'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
              m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-sky-600 text-white rounded-tr-none'
                : 'bg-white text-slate-800 border border-slate-200/80 shadow-sm rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Quick suggestions */}
      <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => setInputText('Check Tikur Anbessa bed capacity')}
          className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 rounded-full text-slate-600 transition-colors"
        >
          Check Tikur Anbessa capacity
        </button>
        <button
          onClick={() => setInputText('Explain OCR referral accuracy')}
          className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 rounded-full text-slate-600 transition-colors"
        >
          OCR guide
        </button>
      </div>

      {/* Input box */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={language === 'am' ? 'ጥያቄዎን እዚህ ይጻፉ...' : 'Ask CareConnect AI Assistant...'}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          onClick={handleSend}
          className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
