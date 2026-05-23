import { useState, useRef, useEffect } from 'react';
import { useStore } from '../stores/store.js';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import {
  Send, StopCircle, Plus, Bot, User, Zap,
  Clock, Coins, AlertCircle, RotateCcw, Sparkles
} from 'lucide-react';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono',
        isUser
          ? 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
          : 'bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan'
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={clsx('max-w-[75%] group', isUser ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed font-sans',
          isUser
            ? 'bg-neon-purple/15 border border-neon-purple/20 text-white rounded-tr-sm'
            : 'bg-obsidian-800 border border-obsidian-700 text-gray-100 rounded-tl-sm'
        )}>
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
        <span className="text-xs text-gray-600 font-mono px-1">
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function StreamingBubble({ text }) {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan animate-glow">
        <Sparkles size={14} />
      </div>
      <div className="max-w-[75%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-obsidian-800 border border-neon-cyan/20 text-gray-100 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{text || ' '}</pre>
          <span className="inline-block w-1.5 h-4 bg-neon-cyan ml-0.5 animate-pulse rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function ChatPage() {
  const {
    activeConv, messages, streaming, streamingText,
    sendMessage, createConversation, cancelConversation, resumeConversation,
    sidebarOpen
  } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCancelled = activeConv?.status === 'cancelled';

  if (!activeConv) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center">
            <Bot size={36} className="text-neon-cyan" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-neon-green rounded-full flex items-center justify-center">
            <Sparkles size={12} className="text-black" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="font-display font-600 text-2xl text-white mb-2">LLM Observatory</h2>
          <p className="text-gray-400 font-sans text-sm max-w-xs">
            Intelligent multi-turn conversations with full inference monitoring
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
          {[
            'Explain quantum computing in simple terms',
            'Write a Python function to parse JSON',
            'What are the tradeoffs of microservices?',
            'Help me debug this TypeScript error',
          ].map(prompt => (
            <button
              key={prompt}
              onClick={async () => {
                const conv = await createConversation();
                setTimeout(() => sendMessage(prompt), 100);
              }}
              className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 hover:border-neon-cyan/30 hover:bg-obsidian-700 transition-all text-left text-xs text-gray-300 font-sans leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-obsidian-700 bg-obsidian-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            isCancelled ? 'bg-neon-red' : 'bg-neon-green animate-pulse'
          )} />
          <h1 className="font-display font-500 text-white text-sm truncate max-w-xs">{activeConv.title}</h1>
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full font-mono',
            isCancelled
              ? 'bg-neon-red/10 text-neon-red border border-neon-red/20'
              : 'bg-neon-green/10 text-neon-green border border-neon-green/20'
          )}>
            {activeConv.status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500">
            <span className="flex items-center gap-1.5">
              <Coins size={11} className="text-neon-amber" />
              {(activeConv.total_input_tokens || 0) + (activeConv.total_output_tokens || 0)} tokens
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="text-neon-cyan" />
              {activeConv.total_latency_ms || 0}ms
            </span>
          </div>
          {isCancelled ? (
            <button
              onClick={() => resumeConversation(activeConv.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-all font-sans"
            >
              <RotateCcw size={12} />
              Resume
            </button>
          ) : (
            <button
              onClick={() => cancelConversation(activeConv.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neon-red/10 text-neon-red border border-neon-red/20 hover:bg-neon-red/20 transition-all font-sans"
            >
              <StopCircle size={12} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm font-sans">Start the conversation…</p>
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {streaming && <StreamingBubble text={streamingText} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isCancelled ? (
        <div className="px-6 py-4 border-t border-obsidian-700 flex items-center gap-3">
          <AlertCircle size={16} className="text-neon-red flex-shrink-0" />
          <span className="text-sm text-gray-400 font-sans">This conversation is cancelled.</span>
          <button
            onClick={() => resumeConversation(activeConv.id)}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-all"
          >
            Resume to continue
          </button>
        </div>
      ) : (
        <div className="px-6 py-4 border-t border-obsidian-700 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message the AI… (Enter to send, Shift+Enter for newline)"
                disabled={streaming}
                rows={1}
                className="w-full bg-obsidian-800 border border-obsidian-700 focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none outline-none transition-all font-sans min-h-[48px] max-h-[160px]"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className={clsx(
                'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
                input.trim() && !streaming
                  ? 'bg-neon-cyan text-black hover:bg-neon-cyan/90 shadow-lg shadow-neon-cyan/20'
                  : 'bg-obsidian-800 border border-obsidian-700 text-gray-600 cursor-not-allowed'
              )}
            >
              {streaming
                ? <div className="w-4 h-4 border-2 border-gray-600 border-t-neon-cyan rounded-full animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-xs text-gray-600 font-mono">{activeConv.model}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-600 font-mono">{activeConv.message_count} messages</span>
            {streaming && (
              <>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-xs text-neon-cyan font-mono">
                  <Zap size={10} />
                  Streaming…
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
