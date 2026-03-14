import React, { useState, useRef, useEffect } from "react";
import { Send, User as UserIcon, MessageCircle, X, Search } from "lucide-react";

import { supabase } from "../lib/supabaseClient";

// Types
export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  participant: {
    id: string;
    name: string;
    role: "Teacher" | "Student";
    avatarColor: string;
  };
  messages: Message[];
};

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const activeChat = conversations.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? chatHistories[activeChatId] || [] : [];

  // Fetch current user and contacts list
  useEffect(() => {
    let unmounted = false;
    let userId: string | null = null;

    const setupChat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        userId = session.user.id;
        const myRole = session.user.user_metadata?.role || "student";
        if (!unmounted) {
          setCurrentUserId(userId);
          currentUserIdRef.current = userId;
        }

        const usersResponse = await fetch('http://127.0.0.1:5000/api/users');
        const usersData = await usersResponse.json();
        const allUsers = usersData.success ? usersData.users : [];

        const targetRole = myRole === "instructor" ? "student" : "instructor";
        const contacts = allUsers.filter((u: any) => u.role === targetRole);

        // Optimization: Fetch only the LATEST message for each contact for the sidebar
        const { data: latestMsgs } = await supabase.rpc('get_latest_messages', { user_uuid: userId });
        
        const conversationList: Conversation[] = contacts.map((contact: any) => {
          const lastMsgData = latestMsgs?.find((m: any) => m.contact_id === contact.id);
          const lastMsg = lastMsgData ? [{
            id: lastMsgData.id,
            senderId: lastMsgData.sender_id,
            text: lastMsgData.text,
            timestamp: new Date(lastMsgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }] : [];

          return {
            id: contact.id,
            participant: {
              id: contact.id,
              name: contact.name,
              role: contact.role === "instructor" ? "Teacher" : "Student",
              avatarColor: contact.avatarColor || (contact.role === "instructor" ? "bg-emerald-500" : "bg-blue-500"),
            },
            messages: lastMsg
          };
        });

        if (!unmounted) setConversations(conversationList);
      } catch (err) {
        console.error("Chat setup error:", err);
      }
    };

    setupChat();

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const newMsg = payload.new;
        const actualUserId = currentUserIdRef.current;
        
        if (!actualUserId) return;

        const mappedMsg: Message = {
          id: newMsg.id,
          senderId: newMsg.sender_id,
          text: newMsg.text,
          timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const partnerId = newMsg.sender_id === actualUserId ? newMsg.receiver_id : newMsg.sender_id;

        // 1. Update Sidebar
        setConversations(prev => prev.map(conv => {
          if (conv.id === partnerId) {
            return { ...conv, messages: [mappedMsg] };
          }
          return conv;
        }));

        // 2. Update Histories with De-duplication and Optimistic Replacement
        setChatHistories(prev => {
          const history = prev[partnerId] || [];
          
          // 1. If we already have this exact message by ID, skip
          if (history.some(m => m.id === mappedMsg.id)) return prev;

          // 2. If it's from current user, try to replace the optimistic version
          if (newMsg.sender_id === actualUserId) {
            const optimisticIdx = history.findIndex(m => 
              m.senderId === actualUserId && 
              m.text === mappedMsg.text && 
              m.id.includes('.') === false && m.id.length < 20 // Temporary IDs are shorter than UUIDs
            );

            if (optimisticIdx !== -1) {
              const newHistory = [...history];
              newHistory[optimisticIdx] = mappedMsg; // Replace with server version
              return { ...prev, [partnerId]: newHistory };
            }
          }
          
          // 3. Otherwise add as new message
          return { ...prev, [partnerId]: [...history, mappedMsg] };
        });

        // 3. Handle Notification Badge
        if (newMsg.receiver_id === actualUserId) {
          setIsOpen(isOpenNow => {
            setActiveChatId(activeIdNow => {
              if (!isOpenNow || activeIdNow !== newMsg.sender_id) {
                setUnreadCount(count => count + 1);
              }
              return activeIdNow;
            });
            return isOpenNow;
          });
        }
      })
      .subscribe();

    return () => {
      unmounted = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Lazy Load History when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !currentUserId || chatHistories[activeChatId]) return;

    const loadHistory = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatId}),and(sender_id.eq.${activeChatId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(51); // Fetch one extra to check if there's more

      if (data) {
        const hasMoreData = data.length > 50;
        const historyData = hasMoreData ? data.slice(0, 50) : data;
        
        const history = historyData.reverse().map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.text,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        setChatHistories(prev => ({ ...prev, [activeChatId]: history }));
        setHasMore(prev => ({ ...prev, [activeChatId]: hasMoreData }));
      }
    };

    loadHistory();
  }, [activeChatId, currentUserId]);

  const loadMoreMessages = async () => {
    if (!activeChatId || !currentUserId) return;
    const history = chatHistories[activeChatId] || [];
    if (history.length === 0) return;

    // Use the earliest message timestamp to fetch older ones
    // We need to fetch the full row from DB to get the actual created_at
    const { data: firstMsgData } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', history[0].id)
      .single();

    if (!firstMsgData) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatId}),and(sender_id.eq.${activeChatId},receiver_id.eq.${currentUserId})`)
      .lt('created_at', firstMsgData.created_at)
      .order('created_at', { ascending: false })
      .limit(51);

    if (data) {
      const hasMoreData = data.length > 50;
      const historyData = hasMoreData ? data.slice(0, 50) : data;
      
      const olderHistory = historyData.reverse().map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        text: m.text,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setChatHistories(prev => ({ 
        ...prev, 
        [activeChatId]: [...olderHistory, ...history] 
      }));
      setHasMore(prev => ({ ...prev, [activeChatId]: hasMoreData }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMsg = newMessage.trim();
    if (!trimmedMsg || !activeChat || !currentUserId || isSending) return;

    const newMsgObj: Message = {
      id: Date.now().toString(), // Will be replaced by DB generated ID
      senderId: currentUserId,
      text: trimmedMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically update History
    const partnerId = activeChatId!;
    setChatHistories(prev => ({
      ...prev,
      [partnerId]: [...(prev[partnerId] || []), newMsgObj]
    }));

    // Update Sidebar
    setConversations(prev => prev.map(conv => {
      if (conv.id === partnerId) {
        return { ...conv, messages: [newMsgObj] };
      }
      return conv;
    }));

    setNewMessage("");
    setIsSending(true);

    try {
      // Persist to Supabase
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: activeChat.participant.id,
        text: trimmedMsg
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      // Optional: Rollback optimistic update or show error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="relative w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95"
        >
          <MessageCircle size={28} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-slate-900 animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[850px] h-[600px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-96px)] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden text-slate-200 animate-in slide-in-from-bottom-5 fade-in duration-200">

          {/* LEFT SIDEBAR */}
          <div className="w-[300px] border-r border-white/10 flex flex-col bg-slate-900/50">
            <div className="h-[60px] px-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Messages</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 border-b border-white/5">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-slate-800/80 border border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {conversations.map(conv => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const isActive = conv.id === activeChatId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveChatId(conv.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2 ${isActive ? 'bg-white/5 border-emerald-500' : 'border-transparent hover:bg-white/5'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${conv.participant.avatarColor}`}>
                      <UserIcon size={20} className="text-white/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className={`text-[14px] font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {conv.participant.name}
                        </h3>
                      </div>
                      <p className="text-[12px] truncate text-slate-400">
                        {lastMsg ? (lastMsg.senderId === currentUserId ? 'You: ' + lastMsg.text : lastMsg.text) : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col bg-[#0f172a] relative">
            {activeChat ? (
              <>
                {/* Header */}
                <div className="h-[60px] px-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur z-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeChat.participant.avatarColor}`}>
                      <UserIcon size={18} className="text-white/90" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px] text-white leading-tight">{activeChat.participant.name}</h3>
                      <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">
                        {activeChat.participant.role}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar flex flex-col">
                  {!chatHistories[activeChatId!] ? (
                    <div className="flex-1 flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {hasMore[activeChatId!] && (
                        <button 
                          onClick={loadMoreMessages}
                          className="self-center py-2 px-4 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                        >
                          Load Older Messages
                        </button>
                      )}
                    </>
                  )}
                  {activeMessages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId;
                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const isConsecutive = prevMsg?.senderId === msg.senderId;

                    return (
                      <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
                        <div className={`flex max-w-[75%] gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>

                          {!isMine && !isConsecutive && (
                            <div className="w-6 shrink-0 flex flex-col justify-end pb-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeChat.participant.avatarColor}`}>
                                <UserIcon size={12} className="text-white/90" />
                              </div>
                            </div>
                          )}
                          {!isMine && isConsecutive && <div className="w-6 shrink-0" />}

                          <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3.5 py-2 shadow-sm max-w-full break-words ${isMine
                              ? 'bg-emerald-600 text-white rounded-[18px] rounded-br-sm'
                              : 'bg-slate-800 text-slate-100 rounded-[18px] rounded-bl-sm'
                              }`}>
                              <p className="text-[14px] leading-relaxed">{msg.text}</p>
                            </div>
                            {!isConsecutive && (
                              <span className="text-[10px] text-slate-500 mt-1 mx-1">
                                {msg.timestamp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-1 shrink-0" />
                </div>

                {/* Input */}
                <div className="p-4 bg-slate-900 border-t border-white/5 shrink-0 z-10 w-full relative">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message..."
                      maxLength={2000}
                      disabled={isSending}
                      className="flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-2.5 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isSending}
                      className={`p-2.5 rounded-full flex items-center justify-center transition-colors ${newMessage.trim() && !isSending
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                      <Send size={18} className={newMessage.trim() && !isSending ? "translate-x-0.5" : ""} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500">
                <p className="text-[13px]">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
