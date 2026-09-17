import { Link } from 'wouter';
import {
  ArrowRight,
  BookOpen,
  HandHeart,
  Landmark,
  MessagesSquare,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const pillars = [
  {
    icon: Sprout,
    title: 'Economic justice',
    description: 'Expanding access to agribusiness, entrepreneurship tools, and direct business development.',
  },
  {
    icon: BookOpen,
    title: 'Leadership and education',
    description: 'Building capacity for civic leadership, conflict transformation, and community governance.',
  },
  {
    icon: MessagesSquare,
    title: 'Social cohesion',
    description: 'Creating intergenerational dialogue and county-level networks that support community peace.',
  },
  {
    icon: ShieldCheck,
    title: 'Youth advocacy',
    description: 'Standing with local youth and helping communities respond to substance abuse and drug trafficking.',
  },
];

export default function Help() {
  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <p className="mb-4 inline-flex bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            About BWYDC
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            Building stronger communities in Bong County.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            The Bong County Women and Youth Development Cooperation is a community-centered initiative
            created by B4P CODEFOUND to advance grassroots empowerment across Central Liberia.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/">
              <Button size="lg" className="gap-2 rounded-full">
                Apply for membership <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/faqs">
              <Button size="lg" variant="outline" className="rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black">
                Read the FAQs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Our story</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">A local framework for lasting peace and opportunity</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              BWYDC was officially launched in June 2023 in Gbarnga, Bong County, Liberia. It serves as
              the primary regional framework for B4P CODEFOUND&apos;s development activities in Central Liberia.
            </p>
            <p className="mt-4 leading-7 text-muted-foreground">
              Its work increases the social, political, and economic agency of women, girls, and youth by
              connecting local groups with resources, leadership skills, and financial autonomy.
            </p>
          </div>
          <Card className="border-primary/15 bg-primary/5 shadow-none">
            <CardContent className="p-6">
              <HandHeart className="h-8 w-8 text-primary" />
              <h3 className="mt-5 text-lg font-bold">Our mission</h3>
              <p className="mt-2 leading-7 text-muted-foreground">
                Equip communities to pursue socio-economic justice, meaningful participation, and lasting peace.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">What we do</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Four connected areas of action</h2>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-border/70 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <Card className="bg-zinc-950 text-white shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <Landmark className="h-8 w-8 text-primary" />
              <h2 className="mt-5 text-xl font-bold">How BWYDC connects communities</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                BWYDC works with local and international civil society partners and coordinates physical
                and virtual forums. These conversations bring representatives together from all 14
                administrative districts of Bong County to discuss access to justice and equal rights.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/15 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Parent organization</p>
              <h2 className="mt-3 text-xl font-bold">B4P CODEFOUND</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The Business for Peace Community Development Foundation is a registered non-profit
                operating in Liberia and the United States. Founded by Mrs. Lindora Howard-Diawara,
                the foundation uses BWYDC as its flagship model for regional decentralization in Africa.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16 rounded-2xl bg-primary px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ready to take part?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                Start your membership application or find quick answers about BWYDC in the FAQs.
              </p>
            </div>
            <Link href="/faqs">
              <Button variant="secondary" className="shrink-0 gap-2">
                Visit FAQs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}