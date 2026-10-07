'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'assistant' | 'customer';
  text: string;
}

const QUICK_PROMPTS = [
  'How do I track my order?',
  'How does delivery work?',
  'Can I buy half kg?',
  'How do I create account?',
];

function getAssistantReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes('track') || text.includes('rider') || text.includes('driver')) {
    return 'After payment, open My Orders and select your order. You will see the delivery status, rider assignment, and rider map when dispatch starts.';
  }

  if (text.includes('delivery') || text.includes('location') || text.includes('address')) {
    return 'CrispRun delivers across Lagos. At checkout, enter your delivery address and choose the delivery date that works for you.';
  }

  if (text.includes('kg') || text.includes('half') || text.includes('measure') || text.includes('paint')) {
    return 'Yes. Many items support exact measures like 0.5 kg, 1 kg, paint, basket, cup, bag, bunch, or food parts depending on the product.';
  }

  if (text.includes('account') || text.includes('sign') || text.includes('login')) {
    return 'Create an account to save your email, view your orders, and track delivery faster. Use the account button in the header or the Create account link.';
  }

  if (text.includes('pay') || text.includes('card') || text.includes('payment')) {
    return 'You can place your order and complete payment at checkout. Once payment is confirmed, your order moves to processing and delivery tracking begins.';
  }

  if (text.includes('product') || text.includes('chicken') || text.includes('yam') || text.includes('rice')) {
    return 'Open a product section first, then choose the exact item you want, such as chicken lap, rice paint, yam tuber, plantain bunch, or dry fish.';
  }

  return 'I can help with shopping, delivery, tracking, payment, account, and product measures. Try asking: “How do I track my order?”';
}

export function FloatingCustomerTools() {
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hi, I am your CrispRun helper. Ask me about orders, delivery, tracking, payment, or foodstuff measures.',
    },
  ]);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [visibleHeight, setVisibleHeight] = useState<number>();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !chatOpen) return;
    const update = () => {
      setVisibleHeight(viewport.height);
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      const container = messagesRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [chatOpen, messages]);

  const suggestedPrompts = useMemo(() => QUICK_PROMPTS.slice(0, 4), []);

  const sendMessage = (value = message) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { role: 'customer', text: trimmed },
      { role: 'assistant', text: getAssistantReply(trimmed) },
    ]);
    setMessage('');
  };

  return (
    <div style={{ bottom: chatOpen ? keyboardInset + 16 : 16 }} className="fixed left-4 right-4 z-50 flex flex-col items-end gap-3 sm:left-auto">
      {chatOpen && (
        <div role="dialog" aria-label="CrispRun shopping helper" style={{ maxHeight: visibleHeight ? Math.max(180, visibleHeight - 32) : undefined }} className="flex h-[min(560px,calc(100dvh-32px))] w-full flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl sm:w-[380px]">
          <div className="flex shrink-0 items-center justify-between bg-crisp-950 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">CrispRun AI</p>
                <p className="text-xs text-crisp-100">Foodstuff shopping helper</p>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setChatOpen(false)}
              aria-label="Close CrispRun AI"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div ref={messagesRef} role="log" aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
            {messages.map((chatMessage, index) => (
              <div
                key={`${chatMessage.role}-${index}`}
                className={cn(
                  'max-w-[88%] break-words rounded-lg px-3 py-2 text-sm leading-6',
                  chatMessage.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'ml-auto bg-primary text-primary-foreground'
                )}
              >
                {chatMessage.text}
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="shrink-0 rounded bg-crisp-50 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-crisp-100"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask CrispRun AI..."
                aria-label="Message"
                maxLength={2000}
                className="h-11 min-w-0 text-base"
              />
              <Button type="submit" size="icon" className="h-11 shrink-0" disabled={!message.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              For urgent help, use your order page or contact CrispRun support.
            </p>
          </div>
        </div>
      )}

      {!chatOpen && <div className="flex flex-col items-end gap-2">
        <Button
          type="button"
          className="h-14 rounded-full px-5 shadow-xl"
          onClick={() => setChatOpen((current) => !current)}
          aria-label="Open CrispRun AI"
        >
          {chatOpen ? (
            <X className="mr-2 h-5 w-5" />
          ) : (
            <MessageCircle className="mr-2 h-5 w-5" />
          )}
          <span className="hidden sm:inline">CrispRun AI</span>
          <Sparkles className="ml-2 hidden h-4 w-4 sm:block" />
        </Button>
      </div>}
    </div>
  );
}
