import { useState, useEffect, useRef, useCallback } from 'react';
import { useBankContext } from '../context/BankContext';
import '../App.css';

function SupportChatWidget() {
  const { currentUser } = useBankContext();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const apiBase = process.env.REACT_APP_API_BASE || '/api';

  // Fetch messages
  const fetchMessages = useCallback(async (convId) => {
    try {
      const res = await fetch(`${apiBase}/chat/messages/${convId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Mark as read
        await fetch(`${apiBase}/chat/messages/${convId}/read`, {
          method: 'PUT',
          credentials: 'include',
        });
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [apiBase]);

  // Initialize conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const res = await fetch(`${apiBase}/chat/conversation`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.conversation._id);
          fetchMessages(data.conversation._id);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      }
    };

    if (currentUser && chatOpen) {
      initializeChat();
    }
  }, [chatOpen, currentUser, apiBase, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    if (!conversationId || !chatOpen) return;

    const interval = setInterval(() => {
      fetchMessages(conversationId);
    }, 2000);

    return () => clearInterval(interval);
  }, [conversationId, chatOpen, apiBase, fetchMessages]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: inputMessage,
        }),
      });

      if (res.ok) {
        setInputMessage('');
        await fetchMessages(conversationId);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!chatOpen ? (
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg transition transform hover:scale-110"
          title="Chat with support"
        >
          💬
        </button>
      ) : (
        <div className="w-96 h-[500px] bg-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Aurora Support</p>
              <p className="text-xs text-cyan-100">We're here to help</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-800">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <p className="text-sm">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      msg.senderRole === 'user'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    {msg.message}
                    <div className="text-xs mt-1 opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-700 p-3 bg-slate-900">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 px-3 py-2 text-white font-semibold transition"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SupportChatWidget;
