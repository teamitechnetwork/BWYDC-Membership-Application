import { Link } from 'wouter';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    question: 'What is BWYDC?',
    answer:
      'The Bong County Women and Youth Development Cooperation (BWYDC) is a community-centered initiative that advances grassroots empowerment for women, girls, and youth in Bong County and Central Liberia.',
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
    question: 'What are BWYDC’s main program areas?',
    answer:
      'The four main areas are economic justice; leadership and education; social cohesion; and youth advocacy. Together they cover entrepreneurship, civic leadership, conflict transformation, community peace, and youth protection.',
  },
  {
    question: 'How does BWYDC support economic opportunity?',
    answer:
      'The cooperation expands access to agribusiness, entrepreneurship tools, and direct business development so local groups can build stronger and more independent livelihoods.',
  },
  {
    question: 'How does BWYDC work with communities across Bong County?',
    answer:
      'BWYDC coordinates local and hybrid forums and builds county-level networks. Its dialogue work brings together representatives from all 14 administrative districts of Bong County to discuss access to justice and equal rights.',
  },
  {
    question: 'What is the relationship between BWYDC and B4P CODEFOUND?',
    answer:
      'BWYDC was established by the Business for Peace Community Development Foundation (B4P CODEFOUND). It is the foundation’s flagship regional model for decentralizing development activities in Africa.',
  },
  {
    question: 'How can I apply for BWYDC membership?',
    answer:
      'Use the membership application on this website. Complete the required questions, review your information, and submit the application. You will receive an application reference after submission.',
  },
  {
    question: 'Can organizations partner with BWYDC?',
    answer:
      'BWYDC works with local and international civil society groups on initiatives that address legal, social, and economic gaps. Organizations interested in partnership can use the official BWYDC communication channels to begin a conversation.',
  },
  {
    question: 'How does BWYDC support youth advocacy?',
    answer:
      'Youth advocacy includes active community work to combat substance abuse and drug trafficking among local youth, alongside leadership and education opportunities.',
  },
];

export default function FAQs() {
  return (
    <div className="bg-background">
      <section className="bg-black text-white">
        <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <Link href="/help" className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to BWYDC information
          </Link>
          <div className="mt-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <CircleHelp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Need to know</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl">Frequently asked questions</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
                Quick answers about BWYDC&apos;s purpose, programs, membership, and community work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-border/70 bg-card px-5 shadow-sm sm:px-8">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="py-5 text-left text-lg font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl text-base leading-8 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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