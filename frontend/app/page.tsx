import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountAction } from '@/components/auth/AccountAction';

const CATEGORIES = [
  { name: 'Beef', href: '/catalog?category=cat-beef', image: '/images/premium-beef-steak.png' },
  { name: 'Chicken', href: '/catalog?category=cat-chicken', image: '/images/whole-chicken.png' },
  { name: 'Fish', href: '/catalog?category=cat-fish', image: '/images/fresh-tilapia.png' },
  { name: 'Groceries', href: '/catalog?category=cat-groceries', image: '/images/scotch-bonnet-pepper.png' },
];

const POPULAR_PRODUCTS = [
  {
    name: 'Premium Beef Steak',
    image: '/images/premium-beef-steak.png',
    price: '₦8,500',
    slug: 'premium-beef-steak',
    note: 'Rich marbling, cut fresh for grills and stews.',
  },
  {
    name: 'Whole Chicken',
    image: '/images/whole-chicken.png',
    price: '₦4,500',
    slug: 'whole-chicken',
    note: 'Cleaned whole bird for soups, roasting, and family meals.',
  },
  {
    name: 'Fresh Tilapia',
    image: '/images/fresh-tilapia.png',
    price: '₦5,500',
    slug: 'fresh-tilapia',
    note: 'Fresh fish, packed carefully for same-city delivery.',
  },
  {
    name: 'Goat Meat',
    image: '/images/goat-meat.png',
    price: '₦7,500',
    slug: 'goat-meat',
    note: 'Tender cuts for pepper soup, stew, and weekend cooking.',
  },
];

const FEATURES = [
  {
    icon: Leaf,
    title: 'Fresh Market Sourcing',
    description:
      'We select meat, fish, vegetables, and pantry items from trusted suppliers before dispatch.',
  },
  {
    icon: ShoppingBasket,
    title: 'Buy by Exact Weight',
    description:
      'Order the quantity you need, from small half-kilo portions to family-size purchases.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality Checked',
    description:
      'Products are reviewed before packing so customers receive clean, reliable food items.',
  },
  {
    icon: CalendarCheck,
    title: 'Scheduled Delivery',
    description:
      'Choose your delivery date and get updates as your order moves from packing to dispatch.',
  },
];

const STEPS = [
  'Choose a category',
  'Select weight and delivery date',
  'Pay securely and track your order',
];

export default function HomePage() {
  return (
    <div className="flex flex-col text-white">
      <section>
        <div className="container grid min-h-[680px] items-center gap-10 py-12 lg:grid-cols-[1fr_0.92fr] lg:py-16">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-crisp-100 backdrop-blur">
              <span className="flex h-2.5 w-2.5 rounded-full bg-crisp-300" />
              Fresh food delivered across Lagos
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Fresh food for your kitchen,
                <span className="block text-crisp-300">packed and delivered.</span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-crisp-100/80 md:text-xl">
                Shop quality beef, chicken, fish, flour, peppers, and everyday
                groceries by kilogram. CrispRun helps you buy fresh food without
                the market stress.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="px-8 text-base shadow-lg shadow-primary/25">
                <Link href="/catalog">
                  Browse Catalog
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <AccountAction className="px-8 text-base" />
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 p-3 text-sm backdrop-blur">
                <PackageCheck className="h-4 w-4 text-crisp-300" />
                Freshly packed
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 p-3 text-sm backdrop-blur">
                <Truck className="h-4 w-4 text-crisp-300" />
                Lagos delivery
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 p-3 text-sm backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-crisp-300" />
                Quality checked
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl shadow-crisp-950/40 sm:aspect-[5/4] sm:rounded-[2rem] lg:aspect-[4/5]">
              <Image
                src="/images/premium-beef-steak.png"
                alt="Fresh beef steak packed for CrispRun delivery"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>

            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl shadow-crisp-950/40 sm:hidden">
              <Image
                src="/images/rice-market.png"
                alt="Fresh foodstuff packed for CrispRun delivery"
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
            </div>
            </div>

            <div className="site-soft-panel mt-3 rounded-2xl p-4 sm:absolute sm:-bottom-5 sm:left-auto sm:right-8 sm:mt-0 sm:w-80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ShoppingBasket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Fresh groceries packed today</p>
                  <p className="text-sm text-muted-foreground">
                    Beef, chicken, fish, flour, and more.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-crisp-950 shadow">
              <Star className="mr-1 inline h-4 w-4 fill-primary text-primary" />
              Customer favorites
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#071b10]/75 backdrop-blur">
        <div className="container grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/95 p-3 text-crisp-950 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                <Image src={category.image} alt={category.name} fill className="object-cover" sizes="64px" />
              </div>
              <div>
                <p className="font-semibold">{category.name}</p>
                <p className="text-sm text-muted-foreground">Shop category</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              Shop fresh
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Popular products
            </h2>
            <p className="mt-2 max-w-xl text-crisp-100/75">
              Frequently ordered items from Lagos homes and small kitchens.
            </p>
          </div>

          <Link
            href="/catalog"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            View all products
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {POPULAR_PRODUCTS.map((product) => (
            <Link
              key={product.slug}
              href={`/product/${product.slug}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/95 text-crisp-950 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[4/3]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
                  Fresh cut
                </div>
              </div>

              <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                <div>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-base">{product.name}</h3>
                  <p className="mt-1 hidden text-sm text-muted-foreground sm:line-clamp-2">
                    {product.note}
                  </p>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-bold text-primary sm:text-lg">
                    {product.price}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground sm:text-xs">
                      /kg
                    </span>
                  </p>
                  <span className="text-xs font-semibold text-primary sm:text-sm">View</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#071b10]/75 backdrop-blur">
        <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Why choose us
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Built for fresh food shopping in Lagos
            </h2>
            <p className="mt-4 text-crisp-100/75">
              CrispRun keeps the buying process clear: choose the item, select
              the weight, schedule delivery, and get updates until it arrives.
            </p>

            <div className="mt-8 space-y-3">
              {STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/10 bg-white/95 p-6 text-crisp-950 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#020b07] text-white">
        <div className="container grid gap-8 py-16 md:grid-cols-[1fr_0.7fr] md:items-center md:py-20">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-crisp-200">
              Ready when you are
            </p>
            <h2 className="text-3xl font-bold md:text-5xl">
              Stock your kitchen without going to the market.
            </h2>
            <p className="mt-4 max-w-2xl text-crisp-100">
              Browse the catalog, pick your products by weight, select your
              delivery date, and let CrispRun handle the fresh food run.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-crisp-300" />
                <span>Fresh products packed carefully</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-crisp-300" />
                <span>Delivery across Lagos areas</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-crisp-300" />
                <span>Schedule your preferred delivery day</span>
              </div>
            </div>

            <Button asChild size="lg" variant="secondary" className="mt-6 w-full">
              <Link href="/catalog">
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
