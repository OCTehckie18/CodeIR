import React, { useState, useRef, useEffect } from "react";
import { Send, User as UserIcon, Search, Info, Image as ImageIcon, Smile, MoreVertical } from "lucide-react";

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

// Mock Data
const CURRENT_USER_ID = "curr_user";

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    participant: {
      id: "teacher_1",
      name: "Dr. Alan Turing",
      role: "Teacher",
      avatarColor: "bg-blue-500",
    },
    messages: [
      { id: "m1", senderId: "curr_user", text: "Hi Dr. Turing, I had a question about the latest IR generation assignment.", timestamp: "10:00 AM" },
      { id: "m2", senderId: "teacher_1", text: "Hello! Sure, what seems to be the issue?", timestamp: "10:05 AM" },
      { id: "m3", senderId: "curr_user", text: "My loop optimization pass is getting stuck in an infinite loop when the AST has nested while statements.", timestamp: "10:08 AM" },
      { id: "m4", senderId: "teacher_1", text: "Hm, make sure you are properly updating the visited nodes set. Do you want me to look at your code?", timestamp: "10:15 AM" },
    ]
  },
  {
    id: "conv_2",
    participant: {
      id: "student_2",
      name: "Ada Lovelace",
      role: "Student",
      avatarColor: "bg-purple-500",
    },
    messages: [
      { id: "m1", senderId: "student_2", text: "Hey! Did you finish module 4?", timestamp: "Yesterday" },
      { id: "m2", senderId: "curr_user", text: "Just submitted it. The last problem was tricky.", timestamp: "Yesterday" },
    ]
  },
];

export default function DirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find(c => c.id === activeChatId);

  // Auto-scroll to bottom of messages whenever a new message is added or chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const newMsgObj: Message = {
      id: Date.now().toString(),
      senderId: CURRENT_USER_ID,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeChatId) {
        return { ...conv, messages: [...conv.messages, newMsgObj] };
      }
      return conv;
    }));
    
    setNewMessage("");
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-h-[850px] w-full max-w-6xl mx-auto bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-slate-200" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
      
      {/* ─── LEFT SIDEBAR - CHAT LIST ─── */}
      <div className="w-full md:w-[350px] flex-shrink-0 border-r border-white/10 flex flex-col bg-slate-900/50">
        
        {/* Header */}
        <div className="h-[76px] px-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-white">Messages</h2>
          <button className="text-slate-400 hover:text-white transition-colors" title="Settings">
            <MoreVertical size={20} />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-slate-800/80 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.map(conv => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isActive = conv.id === activeChatId;

            return (
              <button
                key={conv.id}
                onClick={() => setActiveChatId(conv.id)}
                className={`w-full text-left px-5 py-3.5 flex items-center gap-4 transition-all duration-200 border-l-[3px] ${
                  isActive 
                    ? 'bg-white/[0.06] border-emerald-500' 
                    : 'border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${conv.participant.avatarColor} shadow-inner ring-2 ring-slate-900`}>
                  <UserIcon size={24} className="text-white/90" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-[15px] font-semibold truncate tracking-wide ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {conv.participant.name}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500 flex-shrink-0 ml-2">
                      {lastMsg?.timestamp}
                    </span>
                  </div>
                  <p className={`text-[13px] truncate ${isActive ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {lastMsg?.senderId === CURRENT_USER_ID ? 'You: ' : ''}{lastMsg?.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT PANEL - ACTIVE CHAT ─── */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[76px] px-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${activeChat.participant.avatarColor} shadow-md`}>
                  <UserIcon size={22} className="text-white/90" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-[16px] text-white leading-tight tracking-wide">{activeChat.participant.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wider uppercase">
                      {activeChat.participant.role}
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                <Info size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col bg-slate-950/20">
              {activeChat.messages.map((msg, idx) => {
                const isMine = msg.senderId === CURRENT_USER_ID;
                const prevMsg = idx > 0 ? activeChat.messages[idx - 1] : null;
                const nextMsg = idx < activeChat.messages.length - 1 ? activeChat.messages[idx + 1] : null;
                
                const showAvatar = !isMine && (!nextMsg || nextMsg.senderId !== msg.senderId);
                const isConsecutive = prevMsg?.senderId === msg.senderId;

                return (
                  <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-6'}`}>
                    <div className={`flex max-w-[75%] gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Receiver Avatar Stack */}
                      {!isMine && (
                        <div className="w-7 shrink-0 flex flex-col justify-end pb-1">
                          {showAvatar && (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeChat.participant.avatarColor} shadow-sm border border-slate-700`}>
                              <UserIcon size={14} className="text-white/90" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Bubble + Meta */}
                      <div className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`px-4 py-2.5 shadow-sm max-w-full break-words relative transition-all ${
                            isMine 
                              ? 'bg-emerald-600 text-white border border-emerald-500/40 rounded-[20px] rounded-br-[4px]' 
                              : 'bg-slate-800 text-slate-100 border border-white/5 rounded-[20px] rounded-bl-[4px]'
                          }`}
                        >
                          <p className="text-[14.5px] font-medium leading-[1.5]">{msg.text}</p>
                        </div>
                        
                        {/* Timestamp (Shows on last message in sequence) */}
                        {showAvatar || (isMine && (!nextMsg || nextMsg.senderId !== msg.senderId)) ? (
                          <span className="text-[10px] font-semibold text-slate-500 mt-1 mx-2">
                            {msg.timestamp}
                          </span>
                        ) : null}
                      </div>

                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2 shrink-0" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-white/5 shrink-0 z-10 w-full relative">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative border border-white/10 rounded-3xl bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500/50 transition-all flex items-end px-3 py-1 shadow-inner">
                  
                  <button type="button" className="text-slate-400 hover:text-emerald-400 transition-colors p-2.5 rounded-full hover:bg-white/5 mb-0.5" title="Attach image">
                    <ImageIcon size={18} />
                  </button>
                  
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                    placeholder={`Message ${activeChat.participant.name.split(' ')[0]}...`}
                    className="flex-1 bg-transparent py-3 px-2 text-[14.5px] text-white placeholder-slate-500 focus:outline-none min-h-[44px] max-h-[120px] resize-none overflow-y-auto custom-scrollbar leading-relaxed font-medium"
                    rows={1}
                  />
                  
                  <button type="button" className="text-slate-400 hover:text-amber-400 transition-colors p-2.5 rounded-full hover:bg-white/5 mb-0.5" title="Emojis">
                    <Smile size={18} />
                  </button>

                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`p-3.5 mb-1 rounded-full flex items-center justify-center transition-all duration-300 ${
                    newMessage.trim() 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_4px_15px_rgba(16,185,129,0.3)] transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <Send size={18} className={newMessage.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                </button>
              </form>
              <div className="text-center mt-2 hidden md:block">
                <p className="text-[10px] text-slate-600 font-medium">Press <kbd className="font-sans px-1 rounded bg-slate-800 border border-slate-700">Enter</kbd> to send, <kbd className="font-sans px-1 rounded bg-slate-800 border border-slate-700">Shift</kbd> + <kbd className="font-sans px-1 rounded bg-slate-800 border border-slate-700">Enter</kbd> for new line</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
            <div className="w-24 h-24 border border-dashed border-slate-700 rounded-full flex items-center justify-center mb-5 bg-slate-800/30 shadow-inner relative">
              <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-ping opacity-20"></div>
              <Send size={36} className="text-slate-600 -ml-1 mt-1 opacity-70" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">Your Direct Messages</h2>
            <p className="text-[13px] font-medium max-w-xs text-center leading-relaxed">Select a conversation from the left to start clarifying doubts seamlessly.</p>
          </div>
        )}
      </div>

    </div>
  );
}
