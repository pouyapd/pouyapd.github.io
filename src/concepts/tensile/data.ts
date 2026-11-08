/**
 * Tensile Athletic Club — a fictional strength and conditioning club. Plans,
 * prices, classes, the timetable and the coaches are sample content for the
 * concept (the coaches are fictional profiles shown with Unsplash photographs);
 * nothing can be joined or booked.
 */

export type Discipline = 'strength' | 'conditioning' | 'mobility'

export const disciplines: { id: Discipline; label: string; line: string }[] = [
  { id: 'strength', label: 'Strength', line: 'Barbells, coached technique, a written programme.' },
  { id: 'conditioning', label: 'Conditioning', line: 'Engine work on rowers, bikes, ropes and kettlebells.' },
  { id: 'mobility', label: 'Mobility', line: 'Range, control and recovery, so you keep training.' },
]

export interface Coach {
  id: string
  name: string
  role: string
  photo: string
  focus: string
  alt: string
  specialties: string[]
  bio: string
  /** What a first session with this coach looks like. */
  first: string
}

export const coaches: Coach[] = [
  {
    id: 'mara',
    name: 'Mara Lind',
    role: 'Head of strength',
    photo: 'coach-kettlebell',
    focus: '50% 22%',
    alt: 'A coach holding a kettlebell in a dark gym, looking back over her shoulder.',
    specialties: ['Barbell technique', 'Strength for beginners', 'Programme design'],
    bio: 'Mara builds the strength programme every member follows: three lifts a week, written down, adjusted every four weeks. She coaches first deadlifts more than anything else, and likes it that way.',
    first: 'A movement screen, your first lifts filmed and reviewed, and a four-week plan to take home.',
  },
  {
    id: 'theo',
    name: 'Theo Brandt',
    role: 'Conditioning coach',
    photo: 'trainer-tank',
    focus: '50% 18%',
    alt: 'A coach in a white tank top against a dark backdrop.',
    specialties: ['Engine and intervals', 'Rowing technique', 'Hybrid racing'],
    bio: 'Theo runs Engine and the Saturday hybrid sessions. His classes are hard but measured: every interval has a target, and the targets come from your own numbers, not the person next to you.',
    first: 'A two-kilometre row test, heart-rate zones worked out together, and a plan for three sessions a week.',
  },
  {
    id: 'ines',
    name: 'Ines Haddad',
    role: 'Mobility and gymnastics',
    photo: 'trainer-rings',
    focus: '50% 30%',
    alt: 'A coach holding gymnastic rings overhead in a gym.',
    specialties: ['Mobility Lab', 'Rings and bodyweight', 'Returning from injury'],
    bio: 'Ines teaches the classes people come back to when something hurts. Mobility Lab is slow and specific; her rings class is the opposite. Both are about control.',
    first: 'A joint-by-joint range check and three drills to do before every session.',
  },
  {
    id: 'kai',
    name: 'Kai Mendes',
    role: 'Coach, early mornings',
    photo: 'trainer-curls',
    focus: '46% 30%',
    alt: 'A young coach with curly hair, looking away from the camera.',
    specialties: ['Kettlebells', 'Strength Foundations', 'Training before work'],
    bio: 'Kai opens the club at six on weekdays. Strength Foundations at 6:30 is his: the class for people who have never touched a barbell and want someone patient in the room.',
    first: 'A walk round the floor, the basics of the hinge and the squat, and a first class booked together.',
  },
]

export const coachById = (id: string) => coaches.find((c) => c.id === id)

export interface ClassType {
  id: string
  name: string
  discipline: Discipline
  minutes: number
  level: 'All levels' | 'Beginner' | 'Intermediate'
  /** 1–5, for the intensity bar. */
  intensity: number
  line: string
  detail: string
  expect: string[]
  kit: string
  photo: string
  focus: string
  alt: string
  capacity: number
}

export const classTypes: ClassType[] = [
  {
    id: 'foundations',
    name: 'Strength Foundations',
    discipline: 'strength',
    minutes: 60,
    level: 'Beginner',
    intensity: 2,
    line: 'Learn the squat, hinge and press with a coach beside you.',
    detail: 'A six-week block for people new to barbells. Small groups, the same coach each week, and every lift taught from an empty bar.',
    expect: ['A ten-minute warm-up you can repeat alone', 'Two lifts, taught and practised', 'A short finisher, never to failure'],
    kit: 'Flat shoes and clothes you can squat in. We supply everything else.',
    photo: 'chalk-barbell',
    focus: '55% 35%',
    alt: 'A woman chalking her hands beside a loaded barbell.',
    capacity: 8,
  },
  {
    id: 'barbell',
    name: 'Barbell Club',
    discipline: 'strength',
    minutes: 75,
    level: 'Intermediate',
    intensity: 4,
    line: 'Squat, bench and deadlift on a written, progressive programme.',
    detail: 'The club’s main strength class. Everyone follows the same four-week cycle at their own numbers, logged in the app so each week builds on the last.',
    expect: ['Warm-up and mobility for the day’s lift', 'Main lift: work sets at your programmed weight', 'Accessories in pairs'],
    kit: 'Lifting shoes and a belt help, but neither is required.',
    photo: 'hero-deadlift',
    focus: '50% 55%',
    alt: 'An athlete setting up a deadlift under a single light.',
    capacity: 10,
  },
  {
    id: 'engine',
    name: 'Engine',
    discipline: 'conditioning',
    minutes: 45,
    level: 'All levels',
    intensity: 5,
    line: 'Intervals on rowers and bikes, paced from your own numbers.',
    detail: 'Hard, short and measurable. Targets come from a test you do in your first week, so beginners and racers share the room and both work at the right effort.',
    expect: ['A paced warm-up', 'Three interval blocks with set rests', 'A cool-down and a note of your numbers'],
    kit: 'Trainers and a water bottle.',
    photo: 'bike',
    focus: '50% 50%',
    alt: 'Hands gripping the handlebars of an indoor bike.',
    capacity: 14,
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell Flow',
    discipline: 'conditioning',
    minutes: 45,
    level: 'All levels',
    intensity: 3,
    line: 'Swings, carries and complexes: strength that moves.',
    detail: 'A class built around one kettlebell. Swings and cleans for power, carries for the trunk, and short complexes that leave you out of breath but not wrecked.',
    expect: ['Hinge practice before the first swing', 'Two complexes, scaled by bell size', 'Loaded carries to finish'],
    kit: 'Flat shoes.',
    photo: 'kettlebell-chalk',
    focus: '50% 50%',
    alt: 'A chalked hand gripping a kettlebell.',
    capacity: 12,
  },
  {
    id: 'hybrid',
    name: 'Hybrid Saturday',
    discipline: 'conditioning',
    minutes: 60,
    level: 'Intermediate',
    intensity: 5,
    line: 'Ropes, sleds, rowers and carries in a team format.',
    detail: 'The week’s long session: stations in pairs, a running clock and a lot of noise. Scaled so everyone finishes.',
    expect: ['A team warm-up', 'Four stations in pairs', 'A shared finisher'],
    kit: 'Trainers and gloves if you like them.',
    photo: 'ropes',
    focus: '60% 50%',
    alt: 'An athlete kneeling at the end of a pair of battle ropes.',
    capacity: 16,
  },
  {
    id: 'mobility',
    name: 'Mobility Lab',
    discipline: 'mobility',
    minutes: 45,
    level: 'All levels',
    intensity: 1,
    line: 'Slow, specific range work for hips, spine and shoulders.',
    detail: 'Not a stretch class: each session takes one area and works on usable range under control. Good on rest days, and before heavy weeks.',
    expect: ['Breathing and a range check', 'Three areas, each with a drill to keep', 'A quiet finish'],
    kit: 'Bare feet or socks. Mats are provided.',
    photo: 'mobility',
    focus: '50% 60%',
    alt: 'A woman in a back bend on a mat in a wood-panelled room.',
    capacity: 12,
  },
]

export const classById = (id: string) => classTypes.find((c) => c.id === id)

/** The sample weekly timetable: day index 0 = Monday. */
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export interface Session {
  day: number
  time: string
  type: string
  coach: string
}

const S = (day: number, time: string, type: string, coach: string): Session => ({ day, time, type, coach })

export const timetable: Session[] = [
  S(0, '06:30', 'foundations', 'kai'), S(0, '07:30', 'engine', 'theo'), S(0, '12:15', 'mobility', 'ines'), S(0, '17:30', 'barbell', 'mara'), S(0, '18:45', 'kettlebell', 'kai'), S(0, '19:45', 'engine', 'theo'),
  S(1, '06:30', 'kettlebell', 'kai'), S(1, '07:30', 'barbell', 'mara'), S(1, '12:15', 'engine', 'theo'), S(1, '17:30', 'foundations', 'mara'), S(1, '18:45', 'mobility', 'ines'),
  S(2, '06:30', 'foundations', 'kai'), S(2, '07:30', 'engine', 'theo'), S(2, '12:15', 'kettlebell', 'kai'), S(2, '17:30', 'barbell', 'mara'), S(2, '18:45', 'engine', 'theo'), S(2, '19:45', 'mobility', 'ines'),
  S(3, '06:30', 'engine', 'theo'), S(3, '07:30', 'mobility', 'ines'), S(3, '12:15', 'barbell', 'mara'), S(3, '17:30', 'kettlebell', 'kai'), S(3, '18:45', 'foundations', 'mara'),
  S(4, '06:30', 'kettlebell', 'kai'), S(4, '07:30', 'barbell', 'mara'), S(4, '12:15', 'mobility', 'ines'), S(4, '17:30', 'engine', 'theo'),
  S(5, '09:00', 'hybrid', 'theo'), S(5, '10:30', 'foundations', 'mara'), S(5, '11:45', 'mobility', 'ines'),
  S(6, '10:00', 'mobility', 'ines'), S(6, '11:15', 'barbell', 'mara'),
]

/** Deterministic sample places left, so the timetable looks the same on every visit. */
export function placesLeft(s: Session) {
  const cap = classById(s.type)!.capacity
  let h = 11
  for (const c of `${s.day}${s.time}${s.type}`) h = (h * 33 + c.charCodeAt(0)) % 8191
  const taken = h % (cap + 2)
  return Math.max(0, cap - taken)
}

export const sessionId = (s: Session) => `${s.day}-${s.time.replace(':', '')}-${s.type}`

export interface Plan {
  id: string
  name: string
  line: string
  monthly: number
  highlight?: boolean
  includes: string[]
}

export const plans: Plan[] = [
  {
    id: 'open',
    name: 'Open Gym',
    line: 'The floor, the racks and the programme, on your own schedule.',
    monthly: 49,
    includes: ['Open gym, 6:00–22:00', 'The monthly strength programme in the app', 'A coached induction'],
  },
  {
    id: 'classes',
    name: 'Classes',
    line: 'Every coached class on the timetable, plus open gym.',
    monthly: 89,
    highlight: true,
    includes: ['Everything in Open Gym', 'Unlimited classes', 'A progress review every eight weeks'],
  },
  {
    id: 'coached',
    name: 'Coached',
    line: 'Classes plus a coach who writes your plan and checks in weekly.',
    monthly: 159,
    includes: ['Everything in Classes', 'Two 1:1 sessions a month', 'A personal plan, reviewed weekly'],
  },
]

/** The comparison table: one row per feature, a cell per plan (true, false or a short note). */
export const comparison: { feature: string; cells: (boolean | string)[] }[] = [
  { feature: 'Open gym access', cells: ['6:00–22:00', '6:00–22:00', '6:00–22:00'] },
  { feature: 'Strength programme in the app', cells: [true, true, true] },
  { feature: 'Coached classes', cells: [false, 'Unlimited', 'Unlimited'] },
  { feature: 'Book classes ahead', cells: [false, '7 days', '14 days'] },
  { feature: '1:1 coaching sessions', cells: [false, false, '2 a month'] },
  { feature: 'Personal plan', cells: [false, false, 'Reviewed weekly'] },
  { feature: 'Progress review', cells: [false, 'Every 8 weeks', 'Every 4 weeks'] },
  { feature: 'Bring a friend', cells: [false, 'Once a month', 'Twice a month'] },
  { feature: 'Towels and lockers', cells: [true, true, true] },
]

export const faqs: { q: string; a: string }[] = [
  { q: 'Is there a joining fee?', a: 'No. You pay the first month when you join and can cancel with thirty days’ notice. (Sample terms for this concept.)' },
  { q: 'Can I freeze my membership?', a: 'Yes, for up to two months a year, for injury, travel or anything else.' },
  { q: 'I have never lifted. Where do I start?', a: 'With a free trial and Strength Foundations. A coach teaches every lift from an empty bar.' },
  { q: 'What does annual billing save?', a: 'Paying for the year costs ten months: two months free on every plan.' },
]

export const goals = [
  { id: 'strength', label: 'Get stronger', line: 'Learn to lift and follow a programme' },
  { id: 'fitness', label: 'Build fitness', line: 'Conditioning you can measure' },
  { id: 'return', label: 'Come back from a break', line: 'Rebuild safely, at your pace' },
  { id: 'unsure', label: 'Not sure yet', line: 'A coach helps you decide' },
]
