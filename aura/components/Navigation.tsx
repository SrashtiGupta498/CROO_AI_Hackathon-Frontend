
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Explore', icon: 'explore', path: '/explore' },
    { label: 'AI Guide', icon: 'auto_awesome', path: '/ai', special: true },
    { label: 'Agents', icon: 'hub', path: '/ai/agents' },
    { label: 'Daily', icon: 'event_available', path: '/daily' },
    { label: 'Journal', icon: 'menu_book', path: '/journal' },
  ];


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-mocha/5 px-6 pt-3 pb-8 flex justify-between items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 transition-all ${
            item.special ? '-mt-10' : ''
          }`}
        >
          {item.special ? (
            <div className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/20 flex items-center justify-center">
              <span className="material-icons-round text-3xl">{item.icon}</span>
            </div>
          ) : (
            <>
              <span className={`material-icons-round ${
                location.pathname === item.path ? 'text-primary' : 'text-mocha/40'
              }`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                location.pathname === item.path ? 'text-primary' : 'text-mocha/40'
              }`}>
                {item.label}
              </span>
            </>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
