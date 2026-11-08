/** Shapes for all translatable page content. Add a locale by creating src/content/<lang>/ with the same shape. */

export interface NavItem {
  label: string
  /** In-page anchor, e.g. "#work". */
  href: string
}

export interface CTA {
  label: string
  href: string
}

export interface HeroContent {
  /** Compact studio identifier shown above the headline. */
  eyebrow: string
  /** Headline lines; `accent` is set after `text` in the editorial italic. */
  title: { text: string; accent?: string }[]
  intro: string
  primary: CTA
  secondary: CTA
  scrollLabel: string
  /** Accessible name for the scroll cue link. */
  scrollAria: string
}

/** A section title in two parts: plain, then an editorial italic accent. */
export interface SplitTitle {
  title: string
  titleAccent: string
}

export interface Service {
  id: string
  title: string
  summary: string
  /** What the service covers, in a few words each (shown on one line). */
  includes: string[]
  /** A real page from a project that shows the service; services without one are listed in text below the others. */
  image?: Photo
  /** The projects in Selected Work (or a page inside one) that show it. */
  examples: CTA[]
}

/** A licensed photograph from the concept's set (media.json → photos: "<set>-<key>"), with group 'hero' a hero render (media.json → hero: "<key>"), or with group 'shots' a captured section of a website (media.json → shots: "<key>"). */
export interface Photo {
  key: string
  alt: string
  /** CSS object-position for crops. */
  focus?: string
  group?: 'photos' | 'hero' | 'shots'
}

/** A section of a concept website shown in its portfolio preview: its capture (media.json → shots: `<preview>-shot-<shot>-<desktop|mobile>`), a name, one line, and its address inside the website. */
export interface ShowcaseSection {
  shot: string
  label: string
  text: string
  /** Relative to the website, e.g. "shop/" or "#reserve". */
  path: string
}

/**
 * How a project is presented in Selected Work, each suited to its brand:
 *   ring       a ring from the shop turning in the card's own light, the website over it in a browser and on a phone
 *   orbit      the website's pages on six cards turning round one axis; the scroll adds speed, a click brings one forward
 *   assemble   scattered pages that come together, as the page scrolls, into the website on a desktop and a phone
 *   technique  the website in a browser and on a phone, beside its own live technique module
 */
export interface Showcase {
  style: 'ring' | 'orbit' | 'assemble' | 'technique'
  sections?: ShowcaseSection[]
  /** One line on what the preview shows. */
  note?: string
}

/**
 * A project in Selected Work: a working concept website at /work/<slug>/ and
 * its case study at /work/<slug>/case-study/. Previews are captures of the
 * built website (scripts/captures.mjs → media.json → sites, shots).
 *   liveUrl  an external demo, if one is ever published elsewhere.
 */
export interface ConceptSite {
  slug: string
  /** The studio's own brand rather than a fictional one. */
  own?: boolean
  /** Shown in Selected Work on the home page (default true); others stay reachable at their routes. */
  featured?: boolean
  title: string
  /** What the project is, in the words someone would search for (case-study title). */
  searchTitle?: string
  sector: string
  /** Honest status label, e.g. "Concept study". */
  kind: string
  year: number
  summary: string
  /** Presentation colours (CSS): the stage, text on it, and the accent. */
  stage: string
  ink: string
  accent: string
  /** One line for the project page's opening. */
  intro: string
  palette: { name: string; hex: string }[]
  /** Each typeface with its role and a line set in it on the project page. */
  typefaces: { name: string; role: string; sample: string }[]
  /** Key prefix in media.json → sites: `<preview>-desktop`, `<preview>-mobile`. */
  preview: string
  previewAlt: string
  /** Fictional address shown in the browser frame (not a real domain). */
  url: string
  /** The photo set used inside the concept (tools/photos/<set>), for covers and credits. */
  photoSet: string
  /** The opening photograph for the card and the case study. */
  cover: Photo
  /** One line of art direction shown over the cover. */
  tagline: string
  /** Its presentation in Selected Work (default: classic). */
  showcase?: Showcase
  /** The main paths through the website, step by step. */
  journeys: { title: string; steps: string[] }[]
  /** Sections of the designed page, each shown on its own with the reason behind it. */
  spotlights: { shot: string; title: string; text: string }[]
  /** Phone screens (one per section) shown side by side. */
  phones: { shot: string; caption: string }[]
  /** The brand's photography direction: a few photos from the set. */
  imagery: { text: string; photos: Photo[] }
  details: {
    brief: string
    direction: string
    scope: string[]
    status: string
  }
  /** Design decisions, explained (typography, colour, imagery, layout). */
  decisions: { title: string; text: string }[]
  /** What the designed pages contain. */
  features: { title: string; text: string }[]
  /** How the layout changes on a phone. */
  responsive: string[]
  /** Honest implementation status: what exists, what a build would add. */
  implementation: { done: string[]; next: string[] }
  liveUrl: string | null
  /** Credits other than the photo set's (e.g. a CC0 sky), and the note above them. */
  credits?: { photographer: string; page: string; subject: string }[]
  creditsNote?: string
}

export interface ProcessStep {
  title: string
  text: string
  outcome: string
}

export interface PageContent {
  nav: {
    items: NavItem[]
    cta: CTA
    ariaLabel: string
    menuLabel: string
    closeLabel: string
    homeLabel: string
    /** The logo link's name on other pages, where it leads to the home page. */
    homePageLabel: string
    skipLink: string
  }
  hero: HeroContent
  services: SplitTitle & { eyebrow: string; intro: string; seenIn: string; items: Service[] }
  work: SplitTitle & {
    eyebrow: string
    intro: string
    sites: ConceptSite[]
    /** Card link to the project page. */
    viewLabel: string
    /** Card link to the notes on how a concept was designed (/work/<slug>/case-study/). */
    notesLabel: string
    /** Labels for the project pages (/work/<slug>/). */
    project: {
      back: string
      brief: string
      direction: string
      decisions: string
      features: string
      responsive: string
      journeys: string
      journeysTitle: string
      system: string
      palette: string
      type: string
      scope: string
      status: string
      done: string
      next: string
      desktop: string
      mobile: string
      scrollHint: string
      live: string
      cta: string
      ctaText: string
      more: string
      seeDesign: string
      factSector: string
      factYear: string
      factScope: string
      statusShort: string
      homepage: string
      homepageTitle: string
      sections: string
      sectionsTitle: string
      responsiveTitle: string
      decisionsTitle: string
      imagery: string
      imageryTitle: string
      credits: string
      creditsNote: string
      nextProject: string
    }
  }
  approach: SplitTitle & {
    eyebrow: string
    intro: string
    process: ProcessStep[]
  }
  studio: SplitTitle & {
    eyebrow: string
    intro: string
    points: { title: string; text: string }[]
    /** The studio's own identity and brand guidelines (/work/p-design/). */
    link: CTA
  }
  contact: SplitTitle & {
    eyebrow: string
    intro: string
    emailLabel: string
    /** The primary button: opens an email with the brief template. */
    briefLabel: string
    copyLabel: string
    copiedLabel: string
    socialTitle: string
    /** Suffix for the accessible name of links that open in a new tab. */
    newTab: string
    checklistTitle: string
    checklist: string[]
    emailBody: string
  }
  footer: {
    tagline: string
    navTitle: string
    contactTitle: string
    socialTitle: string
    newTab: string
    note: string
    backToTop: string
  }
  notFound: { title: string; text: string; cta: string }
}
