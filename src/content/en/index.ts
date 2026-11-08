import type { PageContent } from '../types'
import { sites } from './projects'

export const en: PageContent = {
  nav: {
    items: [
      { label: 'Work', href: '#work' },
      { label: 'Services', href: '#services' },
      { label: 'Approach', href: '#approach' },
      { label: 'Studio', href: '#studio' },
      { label: 'Contact', href: '#contact' },
    ],
    cta: { label: 'Start a project', href: '#contact' },
    ariaLabel: 'Primary',
    menuLabel: 'Menu',
    closeLabel: 'Close menu',
    homeLabel: 'P. DESIGN — back to top',
    homePageLabel: 'P. DESIGN — home page',
    skipLink: 'Skip to content',
  },

  hero: {
    eyebrow: 'Independent design & development studio',
    title: [{ text: 'Digital experiences,' }, { text: 'beyond the ', accent: 'ordinary.' }],
    intro:
      'P. DESIGN designs and builds premium websites for brands, shops and service businesses — with motion and 3D only where they make the result better.',
    primary: { label: 'Start a project', href: '#contact' },
    secondary: { label: 'Explore our work', href: '#work' },
    scrollLabel: 'Scroll',
    scrollAria: 'Scroll to selected work',
  },

  work: {
    eyebrow: 'Selected work',
    title: 'Four businesses,',
    titleAccent: 'four distinct websites.',
    intro:
      'A jeweller, a beauty salon, a restaurant and a fitness club: self-initiated concept websites for fictional brands, not client commissions. Every one works — open it and click through, or read how it was designed.',
    sites,
    viewLabel: 'Explore the website',
    notesLabel: 'View case study',
    project: {
      back: 'Selected work',
      brief: 'The brief',
      direction: 'Creative direction',
      decisions: 'Design decisions',
      features: 'What the pages contain',
      responsive: 'On a phone',
      journeys: 'Key journeys',
      journeysTitle: 'The paths that matter.',
      system: 'Design system',
      palette: 'Palette',
      type: 'Typefaces',
      scope: 'Design scope',
      status: 'Status',
      done: 'Built so far',
      next: 'A real launch would add',
      desktop: 'Desktop page, 1440 px',
      mobile: 'Mobile page, 390 px',
      scrollHint: 'Scroll inside each frame to see the full page.',
      live: 'Explore the website',
      cta: 'Discuss a similar project',
      ctaText: 'Planning a website for a brand like this? Tell the studio what you have in mind.',
      more: 'More concepts',
      seeDesign: 'See the design',
      factSector: 'Sector',
      factYear: 'Year',
      factScope: 'Scope',
      statusShort: 'Concept study — fictional brand',
      homepage: 'The homepage',
      homepageTitle: 'One page, from first impression to booking.',
      sections: 'Inside the design',
      sectionsTitle: 'Section by section, and why.',
      responsiveTitle: 'Designed for the thumb, not shrunk for it.',
      decisionsTitle: 'The decisions behind it.',
      imagery: 'Photography',
      imageryTitle: 'The image direction.',
      credits: 'Photography credits',
      creditsNote: 'Photographs used inside this concept are from Unsplash, under the Unsplash License, lightly graded for one consistent tone.',
      nextProject: 'Next concept',
    },
  },

  services: {
    eyebrow: 'Services',
    title: 'What the studio',
    titleAccent: 'designs and builds.',
    intro: 'Design and development from one studio, from the first sketch to launch. Each service is shown working in one of the projects above.',
    seenIn: 'Seen in',
    items: [
      {
        id: 'brand',
        title: 'Brand-led marketing websites',
        summary: 'For businesses judged on atmosphere and first impressions: art direction, typography and photography that make the brand felt, and pages that answer the visitor’s questions quickly.',
        includes: ['Art direction', 'Page design', 'Content structure', 'Responsive build', 'SEO basics'],
        // the kitchen section, not the home page: Selected Work has just shown that one assembling
        image: { key: 'anar-shot-kitchen-desktop', group: 'shots', alt: 'The Anar Dining Room website, the kitchen section: “Old recipes, cooked over open flame.” beside an arched photograph of a golden rice crust with barberries and pistachios.', focus: '50% 50%' },
        examples: [{ label: 'Anar Dining Room', href: 'work/anar/' }],
      },
      {
        id: 'ecommerce',
        title: 'E-commerce websites',
        summary: 'Collections that are easy to browse, product pages that sell the material and the detail, and a bag and checkout without surprises.',
        includes: ['Collections and filters', 'Product variants', 'Bag and checkout', 'Shop platform setup'],
        image: { key: 'live-maison-aurel-shot-product-desktop', group: 'shots', alt: 'A Maison Aurel product page: the Ondine stack with gold and size options and an Add to bag button.', focus: '50% 0%' },
        examples: [{ label: 'Maison Aurel', href: 'work/maison-aurel/' }],
      },
      {
        id: 'service',
        title: 'Websites for service businesses',
        summary: 'Salons, clubs, studios and clinics: prices that read at a glance, schedules that work on a phone, and booking or a trial in a few calm steps.',
        includes: ['Services and prices', 'Timetables', 'Booking and trial flows', 'Booking system setup'],
        examples: [
          { label: 'Lune Atelier', href: 'work/lune/' },
          { label: 'Tensile Athletic Club', href: 'work/tensile/' },
        ],
      },
      {
        id: 'apps',
        title: 'Web applications and interfaces',
        summary: 'When a website has to do more than inform: booking, checkout, timetables and other multi-step flows, designed as clear interfaces and built as fast, accessible front ends that work on any phone.',
        includes: ['Interface and UX design', 'Multi-step flows and forms', 'Front-end development (React, TypeScript)', 'Accessibility'],
        examples: [
          { label: 'Booking, in Lune Atelier', href: 'work/lune/#book' },
          { label: 'Checkout, in Maison Aurel', href: 'work/maison-aurel/checkout/' },
          { label: 'Free trial, in Tensile', href: 'work/tensile/trial/' },
        ],
      },
      {
        id: 'motion',
        title: 'Motion and 3D, where they help',
        summary: 'Product views you can turn, rendered key images and interface motion — added where they help someone choose or understand, with a fast still version for every device.',
        includes: ['Interactive 3D products', 'Rendered images', 'Interface motion', 'Reduced-motion support'],
        examples: [{ label: 'The Stella ring in 3D, in Maison Aurel', href: 'work/maison-aurel/pieces/stella-solitaire/' }],
      },
    ],
  },

  approach: {
    eyebrow: 'Approach',
    title: 'From first call',
    titleAccent: 'to launch.',
    intro: 'Design and code move forward together, so what you approve is what ships. You click through a working prototype early, not a slideshow.',
    process: [
      {
        title: 'Discovery and direction',
        text: 'A call about your business, your customers and what the website must do; then a short brief and a visual direction — type, colour and imagery.',
        outcome: 'A brief and a direction you approve',
      },
      {
        title: 'Design and prototyping',
        text: 'The key pages designed at phone and desktop sizes, then built as a prototype you can try on your own phone before the rest is built.',
        outcome: 'A prototype to click through',
      },
      {
        title: 'Development and refinement',
        text: 'Every page built in code with your content, and the shop or booking system connected. You review it on a preview link as it grows.',
        outcome: 'The finished site, on a preview link',
      },
      {
        title: 'Launch and handover',
        text: 'Speed, accessibility and devices checked, then launched on your domain, with notes on how to update it yourself.',
        outcome: 'A live website you own',
      },
    ],
  },

  studio: {
    eyebrow: 'Studio',
    title: 'Independent,',
    titleAccent: 'and hands-on.',
    intro:
      'P. DESIGN is an independent design and development studio. You talk directly to the person designing and building your website — there is no account manager in between.',
    points: [
      { title: 'Design and code, together', text: 'The pages are designed and coded in the same studio, so the details you approve survive the build.' },
      { title: 'Honest about the work', text: 'The projects shown are concept studies for fictional brands, and labelled that way. Client work will appear as it launches.' },
      { title: 'Across Europe and beyond', text: 'Available for projects across Europe, in Iran and internationally, with calls and reviews online.' },
    ],
    link: { label: 'The studio’s identity and brand guidelines', href: 'work/p-design/' },
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Have a project',
    titleAccent: 'in mind?',
    intro: 'A few lines are enough to start. Write to the studio and you will get a reply with questions and next steps.',
    emailLabel: 'Write to the studio',
    briefLabel: 'Email your brief',
    copyLabel: 'Copy address',
    copiedLabel: 'Copied',
    socialTitle: 'Elsewhere',
    newTab: 'opens in a new tab',
    checklistTitle: 'Helpful to include',
    checklist: [
      'What you need — a new website, a redesign, a launch page or a web app',
      'Your ideal timeline',
      'A budget range, even a rough one',
      'Links to sites or work you like',
    ],
    emailBody:
      'Hello P. DESIGN,\n\nWhat we need:\n\nTimeline:\n\nBudget range:\n\nReferences we like:\n\n',
  },

  footer: {
    tagline: 'Brand-led websites, shops and booking sites — designed and built by an independent studio.',
    navTitle: 'Navigate',
    contactTitle: 'Contact',
    socialTitle: 'Elsewhere',
    newTab: 'opens in a new tab',
    note: 'Projects shown are concept studies for fictional brands, not client commissions.',
    backToTop: 'Back to top',
  },

  notFound: {
    title: 'This page drifted out of frame.',
    text: 'The link may be old, or the address may have a typo.',
    cta: 'Return to the studio',
  },
}
