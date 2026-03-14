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
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find(c => c.id === activeChatId);

  // Fetch current user and conversations from Supabase
  useEffect(() => {
    let unmounted = false;

    const setupChat = async () => {
      try {
        // 1. Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const myId = session.user.id;
        const myRole = session.user.user_metadata?.role || "student";
        if (!unmounted) setCurrentUserId(myId);

        // 2. Fetch all users from backend API
        const usersResponse = await fetch('http://127.0.0.1:5000/api/users');
        const usersData = await usersResponse.json();
        const allUsers = usersData.success ? usersData.users : [];

        // 3. Filter users based on role (students see instructors, instructors see students)
        const targetRole = myRole === "instructor" ? "student" : "instructor";
        const contacts = allUsers.filter((u: any) => u.role === targetRole);

        // 4. Fetch messages from Supabase
        const { data: msgsData } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
          .order('created_at', { ascending: true });

        const messages = msgsData || [];

        // 5. Build conversation array
        const conversationList: Conversation[] = contacts.map((contact: any) => {
          const convoMsgs = messages
            .filter((m: any) => 
              (m.sender_id === myId && m.receiver_id === contact.id) ||
              (m.sender_id === contact.id && m.receiver_id === myId)
            )
            .map((m: any) => ({
              id: m.id,
              senderId: m.sender_id,
              text: m.text,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

          return {
            id: contact.id, // User ID acts as conversation ID in direct messages
            participant: {
              id: contact.id,
              name: contact.name,
              role: contact.role === "instructor" ? "Teacher" : "Student",
              avatarColor: contact.avatarColor || (contact.role === "instructor" ? "bg-emerald-500" : "bg-blue-500"),
            },
            messages: convoMsgs
          };
        });

        if (!unmounted) setConversations(conversationList);
      } catch (err) {
        console.error("Chat setup error:", err);
      }
    };

    setupChat();

    // 3. Optional: Set up real-time listener for incoming messages
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // Simple re-fetch on new message
        setupChat();
      })
      .subscribe();

    return () => {
      unmounted = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat?.messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUserId) return;

    const newMsgObj: Message = {
      id: Date.now().toString(), // Will be replaced by DB generated ID
      senderId: currentUserId,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically update UI
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeChatId) {
        return { ...conv, messages: [...conv.messages, newMsgObj] };
      }
      return conv;
    }));

    setNewMessage("");

    // Persist to Supabase
    await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: activeChat.participant.id,
      text: newMessage.trim()
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95"
        >
          <MessageCircle size={28} />
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
                  {activeChat.messages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId;
                    const prevMsg = idx > 0 ? activeChat.messages[idx - 1] : null;
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
                      className="flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-2.5 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className={`p-2.5 rounded-full flex items-center justify-center transition-colors ${newMessage.trim()
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                      <Send size={18} className={newMessage.trim() ? "translate-x-0.5" : ""} />
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
