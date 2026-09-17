import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
};

const starterMessage: ChatMessage = {
  id: 1,
  role: 'assistant',
  text: 'Hello! I’m the BWYDC guide. Ask me about our mission, programs, membership, or how we work with communities.',
};

const knowledge = [
  {
    keywords: ['what is bwydc', 'about bwydc', 'bwydc'],
    answer:
      'BWYDC is the Bong County Women and Youth Development Cooperation, a community-centered initiative created by B4P CODEFOUND to advance grassroots empowerment in Bong County and Central Liberia.',
  },
  {
    keywords: ['when', 'launch', 'founded', 'established', 'gbarnga'],
    answer:
      'BWYDC was officially launched in June 2023 in Gbarnga, Bong County, Liberia.',
  },
  {
    keywords: ['mission', 'purpose', 'goal', 'why'],
    answer:
      'Our mission is to increase the social, political, and economic agency of women, girls, and youth by connecting local groups with resources, leadership skills, and financial autonomy for socio-economic justice and lasting peace.',
  },
  {
    keywords: ['program', 'pillar', 'economic', 'agribusiness', 'entrepreneur'],
    answer:
      'BWYDC works across four pillars: economic justice; leadership and education; social cohesion; and youth advocacy. Economic justice includes agribusiness, entrepreneurship tools, and business development.',
  },
  {
    keywords: ['leadership', 'education', 'civic', 'governance', 'conflict'],
    answer:
      'The leadership and education pillar builds grassroots capacity for civic leadership, conflict transformation, and community governance.',
  },
  {
    keywords: ['social cohesion', 'peace', 'dialogue', 'intergenerational'],
    answer:
      'BWYDC builds social cohesion through intergenerational dialogue and county-level networks that support community peace.',
  },
  {
    keywords: ['youth', 'drug', 'substance', 'trafficking', 'advocacy'],
    answer:
      'Youth advocacy includes community work to combat substance abuse and drug trafficking among local youth, alongside leadership and education opportunities.',
  },
  {
    keywords: ['district', '14', 'county', 'forum', 'csw', 'justice'],
    answer:
      'BWYDC coordinates physical and virtual forums that bring representatives from all 14 administrative districts of Bong County together to discuss access to justice and equal rights.',
  },
  {
    keywords: ['partner', 'partnership', 'organization', 'civil society'],
    answer:
      'BWYDC works with local and international civil society groups, including the Liberia Women and Children Aid Initiative, to address legal and socio-economic gaps.',
  },
  {
    keywords: ['b4p', 'codefound', 'parent', 'foundation', 'lindora'],
    answer:
      'BWYDC was established by the Business for Peace Community Development Foundation (B4P CODEFOUND), a registered non-profit operating in Liberia and the United States. The foundation was founded by Mrs. Lindora Howard-Diawara.',
  },
  {
    keywords: ['member', 'membership', 'apply', 'application', 'join'],
    answer:
      'You can apply using the membership form on this site. Complete the required questions, review your details, and submit. Your application reference appears after submission.',
  },
  {
    keywords: ['payment', 'fee', 'orange', 'mtn', 'sendwave'],
    answer:
      'The registration fee payment methods shown on the form are Sendwave, MoMo from MTN, and Orange Money. Please use the payment instructions provided by the BWYDC team when completing your registration.',
  },
];

const quickQuestions = ['What is BWYDC?', 'What programs do you run?', 'How do I apply?'];

function findAnswer(question: string): string {
  const normalized = question.toLowerCase().replace(/[^\w\s]/g, ' ');
  const match = knowledge
    .map((entry) => ({
      entry,
      score: entry.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (match && match.score > 0) return match.entry.answer;

  return 'I can help with BWYDC’s mission, programs, community work, partnerships, membership, and payment methods. Try asking “What is BWYDC?”, “What programs do you run?”, or “How do I apply?”';
}

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const nextId = useMemo(() => messages.length + 1, [messages.length]);

  const sendMessage = (value = input) => {
    const question = value.trim();
    if (!question) return;

    setMessages((current) => [
      ...current,
      { id: nextId, role: 'user', text: question },
      { id: nextId + 1, role: 'assistant', text: findAnswer(question) },
    ]);
    setInput('');
  };

  return (
    <>
      {open && (
        <section
          className="fixed inset-x-4 bottom-4 z-[70] flex max-h-[min(680px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[380px]"
          aria-label="BWYDC help chatbot"
        >
          <header className="flex items-center justify-between bg-black px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">BWYDC Guide</p>
                <p className="text-[11px] text-white/60">Friendly answers about the cooperation</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close BWYDC Guide"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm border border-border/70 bg-card text-foreground shadow-sm'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/70 bg-card p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {question}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage();
                }}
                placeholder="Ask BWYDC Guide…"
                aria-label="Ask BWYDC Guide a question"
                className="h-10"
              />
              <Button type="button" size="icon" onClick={() => sendMessage()} aria-label="Send question">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Link href="/faqs" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Sparkles className="h-3 w-3" /> Browse all FAQs
            </Link>
          </div>
        </section>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
          aria-label="Open BWYDC Guide chatbot"
          title="Ask BWYDC Guide"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-primary shadow-sm">?</span>
        </button>
      )}
    </>
  );
}