import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
        label: 'Identity & history',
        questions: [
          {
            question: 'What does BWYDC stand for?',
            answer:
              'BWYDC stands for the Bong County Women and Youth Development Cooperation.',
          },
          {
            question: 'What is BWYDC?',
            answer:
              'BWYDC is a community-centered initiative that advances grassroots empowerment for women, girls, and youth in Bong County and Central Liberia.',
          },
          {
            question: 'When and where was BWYDC launched?',
            answer:
              'BWYDC was officially launched in June 2023 in Gbarnga, Bong County, Liberia.',
          },
          {
            question: 'Who does BWYDC serve?',
            answer:
              'BWYDC focuses on women, girls, youth, and local community groups. Its work is designed to strengthen their resources, leadership skills, participation, and financial autonomy.',
          },
          {
            question: 'Is BWYDC focused only on one community?',
            answer:
              'BWYDC is rooted in Bong County and works across Central Liberia. Its county-level networks and forums connect people and groups across all 14 administrative districts of Bong County.',
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
            question: 'Why was BWYDC created?',
            answer:
              'BWYDC provides a local framework for turning development goals into community action. It connects people with resources, learning, dialogue, and opportunities that support stronger livelihoods, participation, justice, and peace.',
          },
          {
            question: 'What does BWYDC mean by community empowerment?',
            answer:
              'Community empowerment means helping women, girls, youth, and local groups build resources, leadership skills, financial autonomy, and a stronger voice in social, political, and economic decisions.',
          },
          {
            question: 'How does BWYDC promote lasting peace?',
            answer:
              'BWYDC combines social cohesion work, intergenerational dialogue, conflict transformation, civic leadership, and access-to-justice conversations to help communities build more peaceful relationships.',
          },
        ],
      },
    ],
  },
  {
    label: 'Programs & impact',
    topics: [
      {
        label: 'Four program areas',
        questions: [
          {
            question: 'What are BWYDC’s four main program areas?',
            answer:
              'The four areas are economic justice; leadership and education; social cohesion; and youth advocacy. Together they cover entrepreneurship, civic leadership, conflict transformation, community peace, and youth protection.',
          },
          {
            question: 'What is included in economic justice?',
            answer:
              'Economic justice includes expanding access to agribusiness, entrepreneurship tools, and direct business development so local groups can build stronger and more independent livelihoods.',
          },
          {
            question: 'What happens through leadership and education?',
            answer:
              'This area builds capacity for civic leadership, conflict transformation, and community governance so people can participate more meaningfully in decisions that affect their communities.',
          },
          {
            question: 'What is social cohesion work?',
            answer:
              'BWYDC creates intergenerational dialogue and county-level networks that support community peace, mutual understanding, and stronger local relationships.',
          },
          {
            question: 'What does youth advocacy address?',
            answer:
              'Youth advocacy includes community work to combat substance abuse and drug trafficking among local youth, alongside leadership and education opportunities.',
          },
        ],
      },
      {
        label: 'Community action',
        questions: [
          {
            question: 'How does BWYDC work across Bong County?',
            answer:
              'BWYDC coordinates local and hybrid forums and builds county-level networks. Its dialogue work brings representatives from all 14 administrative districts together to discuss access to justice and equal rights.',
          },
          {
            question: 'What kinds of conversations do BWYDC forums support?',
            answer:
              'The forums support conversations about access to justice, equal rights, community peace, and the needs of women, girls, and youth across Bong County.',
          },
          {
            question: 'How does BWYDC support women and girls?',
            answer:
              'BWYDC connects women and girls with resources, leadership development, participation opportunities, and pathways toward greater social, political, and economic agency.',
          },
          {
            question: 'How can young people take part?',
            answer:
              'Young people can apply for membership and explore leadership, education, youth advocacy, community dialogue, and other opportunities offered through BWYDC’s work.',
          },
          {
            question: 'What local problems does BWYDC respond to?',
            answer:
              'BWYDC responds to gaps in legal, social, and economic opportunity, including the need for stronger livelihoods, civic participation, community peace, and protection for young people.',
          },
        ],
      },
    ],
  },
  {
    label: 'B4P CODEFOUND',
    topics: [
      {
        label: 'Parent organization',
        questions: [
          {
            question: 'What does B4P CODEFOUND stand for?',
            answer:
              'B4P CODEFOUND is the Business for Peace Community Development Foundation.',
          },
          {
            question: 'Who is B4P CODEFOUND?',
            answer:
              'B4P CODEFOUND is a registered non-profit operating in Liberia and the United States. It works to advance community development and uses BWYDC as its flagship regional model.',
          },
          {
            question: 'Who founded B4P CODEFOUND?',
            answer:
              'B4P CODEFOUND was founded by Mrs. Lindora Howard-Diawara.',
          },
          {
            question: 'Where does B4P CODEFOUND operate?',
            answer:
              'B4P CODEFOUND operates in Liberia and the United States. BWYDC is its flagship regional model for development activities in Africa.',
          },
          {
            question: 'What does B4P CODEFOUND focus on?',
            answer:
              'B4P CODEFOUND focuses on business for peace and community development. Its work connects development activities with practical community needs and opportunities for participation.',
          },
        ],
      },
      {
        label: 'The BWYDC relationship',
        questions: [
          {
            question: 'What is the relationship between BWYDC and B4P CODEFOUND?',
            answer:
              'BWYDC was established by B4P CODEFOUND. BWYDC serves as the foundation’s flagship regional model for decentralizing development activities in Africa.',
          },
          {
            question: 'Why is BWYDC important to B4P CODEFOUND?',
            answer:
              'BWYDC gives B4P CODEFOUND a practical, locally rooted model for advancing development, peace, leadership, and economic opportunity through communities in Central Liberia.',
          },
          {
            question: 'Is BWYDC part of B4P CODEFOUND’s regional work?',
            answer:
              'Yes. BWYDC is the flagship regional model through which B4P CODEFOUND decentralizes development activities in Africa, with its work rooted in Bong County and Central Liberia.',
          },
          {
            question: 'How can an organization work with BWYDC and B4P CODEFOUND?',
            answer:
              'Organizations can begin by contacting the official BWYDC communication channels with a clear description of their shared goals, community focus, and proposed contribution.',
          },
        ],
      },
    ],
  },
  {
    label: 'Membership & partners',
    topics: [
      {
        label: 'Joining BWYDC',
        questions: [
          {
            question: 'How can I apply for BWYDC membership?',
            answer:
              'Use the membership application on this website. Complete the required questions, review your information, and submit the application. You will receive an application reference after submission.',
          },
          {
            question: 'What membership options are available?',
            answer:
              'The form offers Individual / Regular membership, Group / Regular membership for organizations and collectives, and Associate Membership for supporting partners.',
          },
          {
            question: 'What can I choose as a membership interest?',
            answer:
              'The application lets you select interests in loans, group participation and development, personal development and training, volunteerism, and general benefits.',
          },
          {
            question: 'What happens after I submit my application?',
            answer:
              'Your application is submitted for review and the website displays an application reference number. Please save that reference so the BWYDC team can identify your application and contact you about next steps.',
          },
          {
            question: 'What payment methods are available?',
            answer:
              'The registration fee payment methods shown on the form are Sendwave, MoMo from MTN, and Orange Money. Please use the payment instructions provided by the BWYDC team when completing your registration.',
          },
          {
            question: 'What information should I prepare before applying?',
            answer:
              'Prepare your contact and location details, emergency contact information, date of birth, education and membership preferences, interests, and the required agreement information. The form marks required questions clearly.',
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
            question: 'What kinds of partners does BWYDC work with?',
            answer:
              'BWYDC works with local and international civil society groups and community networks whose work can help address legal, social, and economic needs.',
          },
          {
            question: 'Can a community group join BWYDC?',
            answer:
              'Yes. The application includes a Group / Regular membership option for organizations and collectives. Groups can also describe their participation and development interests in the application.',
          },
          {
            question: 'How can I ask a question that is not listed here?',
            answer:
              'Use the BWYDC Guide chatbot for quick answers about the organization, or contact the BWYDC team through its official communication channels for questions requiring a staff response.',
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const category = categories[categoryIndex];
  const topic = category.topics[topicIndex];

  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setIsSpeaking(false);
    setIsSpeechPaused(false);
  };

  const speakAnswer = (item: Question) => {
    if (!speechSupported) return;

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(`${item.question}. ${item.answer}`);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsSpeechPaused(false);
    };
    utterance.onend = () => {
      speechRef.current = null;
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };
    utterance.onerror = () => {
      speechRef.current = null;
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (!speechSupported || !selectedQuestion) return;

    if (isSpeaking && !isSpeechPaused) {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
      return;
    }

    if (isSpeaking && isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
      return;
    }

    const selectedItem = topic.questions.find((item) => item.question === selectedQuestion);
    if (selectedItem) speakAnswer(selectedItem);
  };

  const selectCategory = (index: number) => {
    stopSpeaking();
    setCategoryIndex(index);
    setTopicIndex(0);
    setSelectedQuestion(null);
  };

  const selectTopic = (index: number) => {
    stopSpeaking();
    setTopicIndex(index);
    setSelectedQuestion(null);
  };

  const selectQuestion = (item: Question) => {
    if (selectedQuestion === item.question) {
      stopSpeaking();
      setSelectedQuestion(null);
      return;
    }

    stopSpeaking();
    setSelectedQuestion(item.question);
  };

  return (
    <div className="bg-background">
      <section className="bg-black text-white">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to membership application
          </Link>
          <div className="mt-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <CircleHelp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">BWYDC knowledge centre</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl">BWYDC FAQs</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
                Choose a topic to learn about BWYDC, its parent organization B4P CODEFOUND, programs, membership, and partnerships.
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

        <div className="mb-8 flex flex-col gap-4 border border-primary/20 bg-primary/5 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              {speechSupported ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-bold text-zinc-950">Listen to an answer</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Select a question, then use the voice controls to hear the answer read aloud.
                {!speechSupported && ' Voice playback is not available in this browser.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-primary/30 bg-white"
              onClick={toggleSpeech}
              disabled={!speechSupported || !selectedQuestion}
              aria-label={isSpeaking && !isSpeechPaused ? 'Pause answer' : 'Listen to answer'}
            >
              {isSpeaking && !isSpeechPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isSpeaking && !isSpeechPaused ? 'Pause' : isSpeechPaused ? 'Resume' : 'Listen'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              aria-label="Stop answer playback"
              title="Stop playback"
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
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
                  onClick={() => selectQuestion(item)}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold transition-colors ${
                    selectedQuestion === item.question ? 'bg-primary/10 text-primary' : 'text-zinc-900 hover:bg-orange-50'
                  }`}
                  aria-expanded={selectedQuestion === item.question}
                >
                  <span>{item.question}</span>
                  <ChevronRight className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${selectedQuestion === item.question ? 'rotate-90 text-primary' : ''}`} />
                </button>
              ))}
            </div>
            {selectedQuestion && (
              <div className="border-t-4 border-primary bg-black px-5 py-5 text-base leading-8 text-white/85">
                <div className="flex items-start gap-3">
                  <Volume2 className={`mt-1 h-5 w-5 shrink-0 ${isSpeaking ? 'text-primary' : 'text-white/50'}`} aria-hidden="true" />
                  <div>
                    {topic.questions.find((item) => item.question === selectedQuestion)?.answer}
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/45" aria-live="polite">
                      {isSpeaking ? (isSpeechPaused ? 'Voice answer paused' : 'Reading this answer aloud') : 'Answer selected'}
                    </p>
                  </div>
                </div>
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