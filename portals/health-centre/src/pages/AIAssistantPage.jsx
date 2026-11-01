import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, Globe, Lightbulb } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AIAssistantPage() {
  const { facilities, referrals } = useCareConnectData();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'ጤና ይስጥልኝ Dr. Alemayehu! I am your CareConnect Bilingual AI Clinical Assistant. I can assist with Ethiopian MoH referral criteria, live bed/ICU capacities at tertiary hospitals, or provide guidance in English and Amharic (አማርኛ).'
    }
  ]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en');

  const samplePrompts = [
    { label: 'Check Tikur Anbessa ICU Beds', query: 'What is the current available bed and ICU capacity at Tikur Anbessa?' },
    { label: 'Pre-Eclampsia Referral Guidelines', query: 'What are the Ethiopian MoH referral criteria for severe pre-eclampsia?' },
    { label: 'STEMI Transfer Protocol', query: 'What is the urgent transfer protocol for acute anterior STEMI?' },
    { label: 'በአማርኛ መመሪያ (Amharic)', query: 'የአስቸኳይ ሪፈራል መመሪያዎችን እና የሆስፒታል አቅምን አሳየኝ' }
  ];

  const handleSendQuery = (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      let reply = '';
      const q = text.toLowerCase();

      if (q.includes('tikur') || q.includes('black lion') || q.includes('አንበሳ')) {
        const hosp = facilities.find(f => f.name.includes('Tikur')) || facilities[0];
        reply = `Tikur Anbessa Specialized Hospital reports ${hosp.availableBeds} available general beds, ${hosp.availableIcuBeds || 3} available ICU beds, and oxygen status: ${hosp.oxygenLevel}. On-call specialty: Cardiology and Trauma Surgery.`;
      } else if (q.includes('pre-eclampsia') || q.includes('ወሊድ')) {
        reply = 'According to Ethiopian National Maternal Health Guidelines: Administer loading dose Magnesium Sulfate (4g IV over 20 mins + 10g IM in divided doses), control BP with Hydralazine/Labetalol (target DBP 90-100 mmHg), and initiate urgent transfer to a tertiary institution (St. Paul\'s or Tikur Anbessa).';
      } else if (q.includes('stemi') || q.includes('chest pain') || q.includes('ደረት')) {
        reply = 'Anterior STEMI triage protocol: Administer Aspirin 300mg chewed + Clopidogrel 300mg, Sublingual Nitroglycerin (unless hypotensive/RV infarction), oxygen if SpO2 <90%. Request ALS ambulance with cardiac monitor. Preferred facility: Tikur Anbessa Cardiac Catheterization Unit.';
      } else if (q.includes('አማርኛ') || text.match(/[\u1200-\u137F]/)) {
        reply = 'ጤና ይስጥልኝ! በጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል በአሁኑ ሰዓት 42 ክፍት አልጋዎች አሉ። ለድንገተኛ የልብ እና የወሊድ ህክምና ሪፈራል ወዲያውኑ መላክ ይችላሉ። የትራንስፖርት አገልግሎት ለማዘዝ የትራንስፖርት ክፍሉን ማነጋገር ይችላሉ።';
      } else {
        reply = `CareConnect Clinical AI has processed your inquiry. There are currently ${referrals.filter(r => r.status === 'Pending').length} pending referrals under review. For emergencies, prioritize St. Paul's or Tikur Anbessa and flag "Emergency Priority" in the Create Referral form.`;
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-amber-300" />
          <div>
            <h3 className="font-bold text-sm">CareConnect Bilingual Clinical AI (AI-08)</h3>
            <p className="text-[11px] text-sky-100">Clinical decision support & hospital capacity intelligence</p>
          </div>
        </div>
        <button
          onClick={() => setLang(l => l === 'en' ? 'am' : 'en')}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'English' : 'አማርኛ'}</span>
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 overflow-x-auto text-[11px]">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(p.query)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer font-medium"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}>
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-sky-600 text-white rounded-tr-none'
                : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-white rounded-tl-none shadow-xs'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(input); }} className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 bg-white dark:bg-slate-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask clinical referral criteria, bed counts, or write in Amharic..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          className="p-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
