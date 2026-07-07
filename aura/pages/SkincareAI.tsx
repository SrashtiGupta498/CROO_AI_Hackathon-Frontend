
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GeminiService } from '../services/geminiService';

const SkincareAI: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hello! I'm your Aura & Earth botanical assistant. How can I help you with your natural skincare journey today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = new GeminiService();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const botResponse = await gemini.getSkincareAdvice(userMsg);
    setMessages(prev => [...prev, { role: 'bot', text: botResponse || "I'm sorry, I couldn't process that. Let's try again with a focus on natural ingredients." }]);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-background-light relative overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button className="p-2 -ml-2 text-primary">
            <span className="material-icons-round">arrow_back_ios_new</span>
          </button>
          <h1 className="text-sm font-bold tracking-widest uppercase text-mocha/60">Skincare AI</h1>
          <button className="p-2 -mr-2 text-primary">
            <span className="material-icons-round">more_horiz</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-20 pb-32 no-scrollbar">
        <div className="mt-8 mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <span className="material-icons-round text-4xl text-primary">auto_awesome</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Pure & Organic</h2>
          <p className="text-mocha/60 leading-relaxed max-w-xs mx-auto font-newsreader italic text-lg">
            Your AI-powered guide to natural solutions for glowing, healthy skin.
          </p>
        </div>

        {/* Skin analysis entry card */}
        <Link
          to="/ai/analysis"
          className="flex items-center gap-4 bg-cream border border-primary/10 rounded-2xl p-4 mb-8 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-icons-round text-2xl text-primary">face_retouching_natural</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-mocha text-sm">Analyze my skin</p>
            <p className="text-xs text-mocha/50">Selfie → skin type, tone & personalized routine</p>
          </div>
          <span className="material-icons-round text-primary/60">chevron_right</span>
        </Link>

        <div className="space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-cream border border-primary/5 rounded-bl-none text-mocha'
              } shadow-sm`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-cream p-4 rounded-2xl rounded-bl-none animate-pulse flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-24 left-0 right-0 px-5 max-w-md mx-auto">
        <div className="relative flex items-center bg-white border border-primary/10 rounded-2xl p-1.5 shadow-xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-grow bg-transparent border-none focus:ring-0 text-mocha placeholder-mocha/40 py-3 font-medium text-sm px-3"
            placeholder="Ask your concern..."
          />
          <button 
            onClick={handleSend}
            className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-icons-round">send</span>
          </button>
        </div>
        <p className="text-[10px] text-center mt-4 opacity-40 uppercase tracking-widest px-8">
          Results focus on natural ingredients. Consult a professional for medical conditions.
        </p>
      </div>
    </div>
  );
};

export default SkincareAI;
