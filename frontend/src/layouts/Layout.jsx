import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ToastContainer } from '../components/UIComponents';
import { ChatbotModal } from '../components/ChatbotModal';
import { useAuth } from '../context/AuthContext';
import { Bot, Sparkles } from 'lucide-react';

export const Layout = () => {
  const { isAuthenticated, toasts, removeToast, role } = useAuth();
  const location = useLocation();
  const [showChatbot, setShowChatbot] = useState(false);

  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      <Navbar />

      <div className="flex-1 flex">
        {isAuthenticated && !isPublicPage && <Sidebar />}

        <main className="flex-1 w-full overflow-x-hidden">
          <div key={location.pathname} className="page-transition min-h-full flex flex-col flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Floating AI Chatbot Button */}
      {isAuthenticated && role === 'STUDENT' && !isPublicPage && (
        <>
          <button
            onClick={() => setShowChatbot(!showChatbot)}
            className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[var(--primary)] text-white shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-bold text-xs ring-4 ring-[var(--primary-ring)]"
          >
            <Bot className="w-5 h-5" />
            <span className="hidden sm:inline">InternHub AI</span>
            <Sparkles className="w-3.5 h-3.5 fill-white text-yellow-300" />
          </button>
          <ChatbotModal isOpen={showChatbot} onClose={() => setShowChatbot(false)} />
        </>
      )}

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
