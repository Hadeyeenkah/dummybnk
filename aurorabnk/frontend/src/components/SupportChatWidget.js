import { useState, useEffect, useRef, useCallback } from 'react';
import { useBankContext } from '../context/BankContext';
import { API_BASE } from '../config';
import '../App.css';

function SupportChatWidget({ isOpen = false, onOpen, onClose }) {
  const { currentUser } = useBankContext();
  const [chatOpen, setChatOpen] = useState(isOpen);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);
  const apiBase = API_BASE;

  useEffect(() => {
    setChatOpen(isOpen);
  }, [isOpen]);

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

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;

    setInitializing(true);
    setSendError('');
    try {
      const res = await fetch(`${apiBase}/chat/conversation`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const convId = data.conversation?._id;
        if (convId) {
          setConversationId(convId);
          await fetchMessages(convId);
          return convId;
        }
      }
      setSendError('Unable to start chat. Please try again.');
      return null;
    } catch (err) {
      console.error('Error initializing chat:', err);
      setSendError('Unable to start chat. Please try again.');
      return null;
    } finally {
      setInitializing(false);
    }
  }, [apiBase, conversationId, fetchMessages]);

  // Initialize conversation
  useEffect(() => {
    if (currentUser && chatOpen) {
      ensureConversation();
    }
  }, [chatOpen, currentUser, ensureConversation]);

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
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const convId = await ensureConversation();
    if (!convId) return;

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        _optimisticId: optimisticId,
        senderRole: 'user',
        message: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInputMessage('');

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          message: trimmed,
        }),
      });

      if (res.ok) {
        await fetchMessages(convId);
      } else {
        setSendError('Message failed to send. Please try again.');
        setMessages((prev) => prev.filter((msg) => msg._optimisticId !== optimisticId));
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError('Message failed to send. Please try again.');
      setMessages((prev) => prev.filter((msg) => msg._optimisticId !== optimisticId));
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = messages.filter((msg) => msg.senderRole === 'admin' && !msg.read).length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!chatOpen ? (
        <button
          onClick={() => {
            setChatOpen(true);
            onOpen?.();
          }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg transition transform hover:scale-110"
          title="Chat with support"
        >
          💬
          {messages.length > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border border-white">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto w-auto sm:w-96 h-[90vh] sm:h-[500px] max-h-[90vh] bg-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Aurora Support</p>
              <p className="text-xs text-cyan-100">We're here to help</p>
            </div>
            <button
              onClick={() => {
                setChatOpen(false);
                onClose?.();
              }}
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
            {(initializing || sendError) && (
              <div className={`mb-2 text-xs ${sendError ? 'text-rose-300' : 'text-cyan-200'}`}>
                {sendError || 'Connecting to support...'}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={initializing ? 'Connecting...' : 'Type a message...'}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                disabled={initializing}
              />
              <button
                type="submit"
                disabled={loading || initializing || !inputMessage.trim()}
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
