import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatInterface from './ChatInterface';

const ChatBot = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-sougui-gold text-sougui-bg p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 animate-bounce"
        >
          <MessageCircle size={32} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[450px] animate-in slide-in-from-bottom-10 duration-500 relative">
          <button 
             onClick={() => setIsOpen(false)} 
             className="absolute -top-4 -right-4 z-[10000] bg-sougui-gold text-sougui-bg p-2 rounded-full shadow-xl hover:rotate-90 transition-transform"
          >
            <X size={20} />
          </button>
          <div className="h-[650px]">
             <ChatInterface user={user} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
