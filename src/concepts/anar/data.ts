/**
 * Anar Dining Room — a fictional Persian restaurant. Dishes, prices, hours
 * and tables are sample content for the concept; photographs are from
 * Unsplash (credits on the case-study page).
 */

export type Course = 'begin' | 'fire' | 'stews' | 'rice' | 'sweets' | 'tea'
export type Diet = 'v' | 'vg' | 'gf' | 'n'

export interface Dish {
  id: string
  name: string
  persian?: string
  course: Course
  price: number
  line: string
  detail: string
  diet: Diet[]
  photo?: { key: string; focus?: string; alt: string }
  signature?: boolean
}

export const COURSES: { id: Course; label: string; note: string }[] = [
  { id: 'begin', label: 'To begin', note: 'Small plates with warm sangak bread, for the middle of the table.' },
  { id: 'fire', label: 'From the fire', note: 'Kababs grilled over oak charcoal, with grilled tomato and sumac onions.' },
  { id: 'stews', label: 'Khoresh', note: 'Slow stews, served with saffron rice.' },
  { id: 'rice', label: 'Rice & tahdig', note: 'Polo, chelo and the golden crust from the bottom of the pot.' },
  { id: 'sweets', label: 'To finish', note: 'Rosewater, saffron and sour cherry.' },
  { id: 'tea', label: 'Tea & sharbat', note: 'From the samovar, and cold sharbats made in the kitchen.' },
]

export const DIET: Record<Diet, string> = { v: 'Vegetarian', vg: 'Vegan', gf: 'Gluten-free', n: 'Contains nuts' }

export const dishes: Dish[] = [
  { id: 'kashk-bademjan', name: 'Kashk-e bademjan', course: 'begin', price: 12, line: 'Smoked aubergine, whey, crisp mint, walnuts', detail: 'Aubergines charred whole over the fire, mashed with fried onion and garlic, finished with kashk (fermented whey), mint oil and toasted walnuts.', diet: ['v', 'n'], photo: { key: 'spread', alt: 'A table of Persian dishes in blue-and-white bowls: herbs, rice, yoghurt and dips.' } },
  { id: 'sabzi-khordan', name: 'Sabzi khordan', course: 'begin', price: 9, line: 'Fresh herbs, feta, radish, warm sangak', detail: 'A basket of the morning’s herbs — tarragon, basil, mint, chives — with radishes, walnuts, feta and warm sangak bread. Wrap, fold, repeat.', diet: ['v', 'n'], photo: { key: 'spread-2', alt: 'Herbs, rice and small dishes on a patterned tablecloth.' } },
  { id: 'mast-o-khiar', name: 'Mast-o khiar', course: 'begin', price: 8, line: 'Yoghurt, cucumber, dried rose, raisins', detail: 'Thick yoghurt with grated cucumber, dried mint, rose petals and golden raisins. Cool against everything from the fire.', diet: ['v', 'gf'] },
  { id: 'kuku-sabzi', name: 'Kuku sabzi', course: 'begin', price: 11, line: 'Herb frittata, barberries, walnut', detail: 'A deep green frittata made with more herbs than egg, studded with barberries and walnuts, served at room temperature with yoghurt.', diet: ['v', 'gf', 'n'] },
  { id: 'jujeh', name: 'Jujeh kabab', course: 'fire', price: 24, line: 'Saffron and lemon chicken, charred tomato', detail: 'Chicken thighs marinated overnight in saffron, lemon and yoghurt, grilled over charcoal and brushed with saffron butter.', diet: ['gf'], signature: true, photo: { key: 'saffron-plate', alt: 'Saffron chicken with yellow-topped rice and barberries on a copper platter.' } },
  { id: 'koobideh', name: 'Kabab koobideh', course: 'fire', price: 23, line: 'Minced lamb skewers, sumac, grilled tomato', detail: 'Lamb and onion pressed by hand onto wide skewers and grilled fast and hot, served on bread that catches the juices.', diet: [] },
  { id: 'barg', name: 'Kabab barg', course: 'fire', price: 31, line: 'Lamb fillet, saffron butter, onion', detail: 'Thin ribbons of lamb fillet marinated in onion and grilled briefly, finished with saffron butter.', diet: ['gf'] },
  { id: 'ghormeh', name: 'Ghormeh sabzi', course: 'stews', price: 22, line: 'Slow herb stew, kidney beans, dried lime', detail: 'The national stew: parsley, coriander, fenugreek and chives fried slowly until dark, cooked for hours with lamb, kidney beans and dried limes.', diet: ['gf'], signature: true, photo: { key: 'sabzi', alt: 'A bowl of dark green herb stew beside saffron rice and fresh herbs.' } },
  { id: 'fesenjan', name: 'Fesenjan', course: 'stews', price: 26, line: 'Pomegranate and walnut stew, slow-cooked', detail: 'Ground walnuts cooked for hours until they release their oil, with pomegranate molasses and duck leg — sweet, sour and deep.', diet: ['gf', 'n'] },
  { id: 'gheimeh', name: 'Khoresh gheimeh', course: 'stews', price: 21, line: 'Yellow split peas, tomato, dried lime, crisp potato', detail: 'Lamb and yellow split peas in a tomato and dried-lime broth, topped with crisp matchstick potatoes.', diet: ['gf'] },
  { id: 'tahdig', name: 'Tahdig', course: 'rice', price: 10, line: 'The golden crust of the pot', detail: 'The prize of every Persian kitchen: saffron rice left to crisp at the bottom of the pot, turned out whole and broken at the table.', diet: ['v', 'gf'], signature: true, photo: { key: 'tahdig', alt: 'Golden saffron tahdig topped with barberries and pistachios.' } },
  { id: 'tahchin', name: 'Tahchin', course: 'rice', price: 19, line: 'Baked saffron rice, barberries, pistachio', detail: 'Rice set with saffron, yoghurt and egg, baked until golden and crisp outside, soft inside, layered with chicken and topped with barberries and pistachio.', diet: ['gf', 'n'], photo: { key: 'tahdig-3', alt: 'Squares of baked saffron rice with barberries and pistachio slivers.' } },
  { id: 'baghali-polo', name: 'Baghali polo', course: 'rice', price: 9, line: 'Dill and broad-bean rice', detail: 'Long-grain rice steamed with dill and broad beans, finished with saffron.', diet: ['vg', 'gf'] },
  { id: 'sholeh-zard', name: 'Sholeh zard', course: 'sweets', price: 9, line: 'Saffron rice pudding, rosewater, cinnamon', detail: 'Rice cooked slowly with saffron, sugar and rosewater, set and decorated with cinnamon and slivered almonds.', diet: ['vg', 'gf', 'n'] },
  { id: 'faloodeh', name: 'Faloodeh', course: 'sweets', price: 8, line: 'Rosewater sorbet, lime, sour cherry', detail: 'Frozen rice-noodle threads in rosewater syrup, with fresh lime and sour-cherry syrup poured at the table.', diet: ['vg', 'gf'] },
  { id: 'bastani', name: 'Bastani sonnati', course: 'sweets', price: 9, line: 'Saffron and pistachio ice cream', detail: 'Saffron and rosewater ice cream with frozen cream and pistachios, pressed between thin wafers.', diet: ['v', 'n'] },
  { id: 'samovar-tea', name: 'Samovar tea', course: 'tea', price: 6, line: 'Black tea, dates, saffron rock sugar', detail: 'Strong black tea brewed on the samovar, poured clear into glasses, with dates and nabat (saffron rock sugar). Refilled as long as you stay.', diet: ['vg', 'gf'], photo: { key: 'samovar', alt: 'A brass samovar with tea glasses, dates and nuts.' } },
  { id: 'gol-gavzaban', name: 'Gol gavzaban', course: 'tea', price: 6, line: 'Borage flower tisane, lime', detail: 'A calming tisane of dried borage flowers that turns from blue to pink when lime is added.', diet: ['vg', 'gf'] },
  { id: 'sekanjabin', name: 'Sharbat sekanjabin', course: 'tea', price: 7, line: 'Mint and vinegar syrup, cucumber, ice', detail: 'One of the oldest drinks in Persian cooking: honeyed mint and vinegar syrup over ice with grated cucumber.', diet: ['vg', 'gf'] },
]

export const dishById = (id: string) => dishes.find((d) => d.id === id)

/** Sample opening hours: dinner Tuesday to Sunday. */
export const HOURS = [
  ['Tuesday – Thursday', '18:00 – 23:00'],
  ['Friday – Saturday', '18:00 – 00:00'],
  ['Sunday', '17:00 – 22:00'],
  ['Monday', 'Closed'],
]

/** The next 10 evenings of a sample calendar (Monday closed). */
export const DATES = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-24']
export const TIMES = ['18:00', '18:30', '19:15', '19:45', '20:30', '21:15']
export const SEATING = [
  { id: 'room', title: 'Dining room', line: 'By the windows' },
  { id: 'counter', title: 'Fire counter', line: 'Watch the kitchen' },
  { id: 'courtyard', title: 'Courtyard', line: 'Heated, covered' },
]

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const shortDate = (iso: string) => `${DAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]} ${Number(iso.slice(8))} Nov`

/** deterministic sample availability: tables free for a date, time and party size */
export function tablesLeft(iso: string, time: string, guests: number) {
  let h = 11
  for (const c of iso + time) h = (h * 33 + c.charCodeAt(0)) % 7919
  const base = h % 6
  return Math.max(0, base - (guests > 4 ? 2 : guests > 2 ? 1 : 0))
}
