import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ChevronRight, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Question = {
  question: string;
  answer: string;
};

type Topic = {
  label: string;
  questions: Question[];
};

type Category = {
  label: string;
  topics: Topic[];
};

const categories: Category[] = [
  {
    label: 'About BWYDC',
    topics: [
      {
        label: 'Who we are',
        questions: [
          {
            question: 'What is BWYDC?',
            answer:
              'The Bong County Women and Youth Development Cooperation (BWYDC) is a community-centered initiative that advances grassroots empowerment for women, girls, and youth in Bong County and Central Liberia.',
          },
          {
            question: 'When and where was BWYDC launched?',
            answer: 'BWYDC was officially launched in June 2023 in Gbarnga, Bong County, Liberia.',
          },
          {
            question: 'Who does BWYDC serve?',
            answer:
              'BWYDC focuses on women, girls, youth, and local community groups. Its work is designed to strengthen their resources, leadership skills, participation, and financial autonomy.',
          },
        ],
      },
      {
        label: 'Mission & purpose',
        questions: [
          {
            question: 'What is BWYDC’s mission?',
            answer:
              'BWYDC works to increase the social, political, and economic agency of women, girls, and youth by connecting local groups with resources, leadership skills, and financial autonomy for socio-economic justice and lasting peace.',
          },
          {
            question: 'What is the relationship with B4P CODEFOUND?',
            answer:
              'BWYDC was established by the Business for Peace Community Development Foundation (B4P CODEFOUND). It is the foundation’s flagship regional model for decentralizing development activities in Africa.',
          },
        ],
      },
    ],
  },
  {
    label: 'Programs & impact',
    topics: [
      {
        label: 'Economic justice',
        questions: [
          {
            question: 'How does BWYDC support economic opportunity?',
            answer:
              'The cooperation expands access to agribusiness, entrepreneurship tools, and direct business development so local groups can build stronger and more independent livelihoods.',
          },
          {
            question: 'What are the four main program areas?',
            answer:
              'The four areas are economic justice; leadership and education; social cohesion; and youth advocacy. Together they cover entrepreneurship, civic leadership, conflict transformation, community peace, and youth protection.',
          },
        ],
      },
      {
        label: 'Community & youth',
        questions: [
          {
            question: 'How does BWYDC build social cohesion?',
            answer:
              'BWYDC creates intergenerational dialogue and county-level networks that support community peace and stronger local relationships.',
          },
          {
            question: 'How does BWYDC support youth advocacy?',
            answer:
              'Youth advocacy includes community work to combat substance abuse and drug trafficking among local youth, alongside leadership and education opportunities.',
          },
          {
            question: 'How does BWYDC work across Bong County?',
            answer:
              'BWYDC coordinates local and hybrid forums and builds county-level networks. Its dialogue work brings representatives from all 14 administrative districts together to discuss access to justice and equal rights.',
          },
        ],
      },
    ],
  },
  {
    label: 'Membership & partners',
    topics: [
      {
        label: 'Membership',
        questions: [
          {
            question: 'How can I apply for BWYDC membership?',
            answer:
              'Use the membership application on this website. Complete the required questions, review your information, and submit the application. You will receive an application reference after submission.',
          },
          {
            question: 'What payment methods are available?',
            answer:
              'The registration fee payment methods shown on the form are Sendwave, MoMo from MTN, and Orange Money. Please use the payment instructions provided by the BWYDC team when completing your registration.',
          },
        ],
      },
      {
        label: 'Partnerships',
        questions: [
          {
            question: 'Can organizations partner with BWYDC?',
            answer:
              'BWYDC works with local and international civil society groups on initiatives that address legal, social, and economic gaps. Organizations interested in partnership can use the official BWYDC communication channels to begin a conversation.',
          },
          {
            question: 'Who is B4P CODEFOUND?',
            answer:
              'The Business for Peace Community Development Foundation is a registered non-profit operating in Liberia and the United States. It was founded by Mrs. Lindora Howard-Diawara and uses BWYDC as its flagship regional model.',
          },
        ],
      },
    ],
  },
];

export default function FAQs() {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [topicIndex, setTopicIndex] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const category = categories[categoryIndex];
  const topic = category.topics[topicIndex];

  const selectCategory = (index: number) => {
    setCategoryIndex(index);
    setTopicIndex(0);
    setSelectedQuestion(null);
  };

  const selectTopic = (index: number) => {
    setTopicIndex(index);
    setSelectedQuestion(null);
  };

  return (
    <div className="bg-background">
      <section className="bg-black text-white">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <Link href="/help" className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to BWYDC information
          </Link>
          <div className="mt-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <CircleHelp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Need to know</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl">Help &amp; FAQs</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
                Choose a topic to find quick answers about BWYDC&apos;s purpose, programs, membership, and community work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">BWYDC support centre</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Choose a topic</h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">Select a question to read the answer.</p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <section className="border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-300 bg-zinc-50 px-5 py-4 text-sm font-bold uppercase tracking-wide text-zinc-700">
              Topics
            </div>
            <div className="divide-y divide-zinc-200">
              {categories.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => selectCategory(index)}
                  className={`flex min-h-14 w-full items-center justify-between px-5 py-4 text-left text-base font-semibold transition-colors ${
                    index === categoryIndex ? 'bg-black text-white' : 'text-zinc-900 hover:bg-orange-50'
                  }`}
                  aria-pressed={index === categoryIndex}
                >
                  {item.label}
                  <ChevronRight className={`h-5 w-5 shrink-0 ${index === categoryIndex ? 'text-primary' : 'text-zinc-500'}`} />
                </button>
              ))}
            </div>
          </section>

          <section className="border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-300 bg-zinc-50 px-5 py-4 text-sm font-bold uppercase tracking-wide text-zinc-700">
              {category.label}
            </div>
            <div className="divide-y divide-zinc-200">
              {category.topics.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => selectTopic(index)}
                  className={`flex min-h-14 w-full items-center justify-between px-5 py-4 text-left text-base font-semibold transition-colors ${
                    index === topicIndex ? 'bg-primary/10 text-primary' : 'text-zinc-900 hover:bg-orange-50'
                  }`}
                  aria-pressed={index === topicIndex}
                >
                  {item.label}
                  <ChevronRight className={`h-5 w-5 shrink-0 ${index === topicIndex ? 'text-primary' : 'text-zinc-500'}`} />
                </button>
              ))}
            </div>
          </section>

          <section className="border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-300 bg-zinc-50 px-5 py-4 text-sm font-bold uppercase tracking-wide text-zinc-700">
              {topic.label}
            </div>
            <div className="divide-y divide-zinc-200">
              {topic.questions.map((item) => (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => setSelectedQuestion(selectedQuestion === item.question ? null : item.question)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold text-zinc-900 transition-colors hover:bg-orange-50"
                  aria-expanded={selectedQuestion === item.question}
                >
                  <span>{item.question}</span>
                  <ChevronRight className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${selectedQuestion === item.question ? 'rotate-90 text-primary' : ''}`} />
                </button>
              ))}
            </div>
            {selectedQuestion && (
              <div className="border-t-4 border-primary bg-black px-5 py-5 text-base leading-8 text-white/85">
                {topic.questions.find((item) => item.question === selectedQuestion)?.answer}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl bg-primary/10 px-5 py-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-semibold">Ready to join the cooperation?</p>
            <p className="mt-1 text-base text-muted-foreground">Start your BWYDC membership application.</p>
          </div>
          <Link href="/">
            <Button className="gap-2">
              Start application <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}