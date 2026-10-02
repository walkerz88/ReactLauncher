import {
  Award,
  Binary,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Cake,
  Camera,
  CalendarCheck,
  CalendarClock,
  Cat,
  Clapperboard,
  Clock,
  Crown,
  Dices,
  DoorOpen,
  Download,
  FastForward,
  Film,
  Flame,
  Gamepad2,
  Gauge,
  Ghost,
  HardDrive,
  Heart,
  History,
  Hourglass,
  Joystick,
  KeyRound,
  Layers,
  LibraryBig,
  Moon,
  OctagonX,
  PartyPopper,
  Palette,
  Pencil,
  Rocket,
  Shapes,
  ShieldCheck,
  Siren,
  Skull,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Terminal,
  ThumbsDown,
  Trophy,
  TrendingUp,
  Tv,
  Undo2,
  Utensils,
  Video,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

import type { Locale } from '@/app/i18n/messages';
import type { AchievementDef, ProgressMetric } from '@/electron';

/**
 * What the renderer knows about achievements: how they are worded and drawn. The rules (targets, tiers, XP)
 * live in the main process (`electron/achievements.ts`) and arrive with the progress state. A family step is
 * `<metric>-<target>`, a one-off "special" is `special-<key>`; the entries below are matched by those ids.
 */

export type Localized = Record<Locale, string>;

type FamilyMetric = Exclude<ProgressMetric, 'special'>;

export type AchievementGroup = NonNullable<AchievementDef['group']>;

/** Display order of the families on the page (those with a `group` are listed under that group instead). */
export const METRIC_ORDER: FamilyMetric[] = [
  'launches',
  'playHours',
  'gamesPlayed',
  'longestSessionHours',
  'maxGameHours',
  'daysPlayed',
  'bestStreak',
  'nightLaunches',
  'morningLaunches',
  'eveningLaunches',
  'weekendLaunches',
  'weekdayLaunches',
  'favoritesAdded',
  'gamesAdded',
  'luckyOpens',
  'themesTried',
  'themesCreated',
  'trailerViews',
  'genresPlayed',
  'seriesCompleted',
  'screenshotsTaken',
  'recordingsMade',
  'level',
  'achievements',
];

/** Display order of the groups of one-off achievements, listed after the families. */
export const GROUP_ORDER: AchievementGroup[] = ['calendar', 'habits', 'launcher', 'library', 'secrets'];

export const GROUP_TITLES: Record<AchievementGroup, Localized> = {
  calendar: { ru: 'Календарь', en: 'Calendar' },
  habits: { ru: 'Повадки', en: 'Habits' },
  launcher: { ru: 'Лаунчер', en: 'Launcher' },
  library: { ru: 'Библиотека', en: 'Library' },
  secrets: { ru: 'Секреты', en: 'Secrets' },
};

/** One icon per family: together with the tier ring it is the achievement's picture. */
const METRIC_ICONS: Record<FamilyMetric, LucideIcon> = {
  launches: Rocket,
  playHours: Clock,
  gamesPlayed: Gamepad2,
  longestSessionHours: Hourglass,
  maxGameHours: Heart,
  daysPlayed: CalendarCheck,
  bestStreak: Flame,
  nightLaunches: Moon,
  morningLaunches: Sunrise,
  dayLaunches: Sun,
  eveningLaunches: Sunset,
  weekendLaunches: PartyPopper,
  weekdayLaunches: Briefcase,
  avgSessionMinutes: Gauge,
  favoritesAdded: Star,
  gamesAdded: LibraryBig,
  luckyOpens: Dices,
  themesTried: Wand2,
  trailerViews: Film,
  genresPlayed: Shapes,
  seriesCompleted: BookMarked,
  cheatCodes: KeyRound,
  themesCreated: Palette,
  screenshotsTaken: Camera,
  recordingsMade: Video,
  level: TrendingUp,
  achievements: Trophy,
};

export const METRIC_TITLES: Record<FamilyMetric, Localized> = {
  launches: { ru: 'Запуски', en: 'Launches' },
  playHours: { ru: 'Время в играх', en: 'Play time' },
  gamesPlayed: { ru: 'Разные игры', en: 'Different games' },
  longestSessionHours: { ru: 'Долгие сеансы', en: 'Long sessions' },
  maxGameHours: { ru: 'Одна игра', en: 'One game' },
  daysPlayed: { ru: 'Дни с играми', en: 'Days played' },
  bestStreak: { ru: 'Серии дней', en: 'Streaks' },
  nightLaunches: { ru: 'Ночные запуски', en: 'Night launches' },
  morningLaunches: { ru: 'Утренние запуски', en: 'Morning launches' },
  dayLaunches: { ru: 'Дневные запуски', en: 'Day launches' },
  eveningLaunches: { ru: 'Вечерние запуски', en: 'Evening launches' },
  weekendLaunches: { ru: 'Выходные', en: 'Weekends' },
  weekdayLaunches: { ru: 'Будни', en: 'Weekdays' },
  avgSessionMinutes: { ru: 'Средняя сессия', en: 'Average session' },
  favoritesAdded: { ru: 'Избранное', en: 'Favourites' },
  gamesAdded: { ru: 'Новые игры', en: 'New games' },
  luckyOpens: { ru: 'Удача', en: 'Luck' },
  themesTried: { ru: 'Примерка тем', en: 'Trying themes' },
  trailerViews: { ru: 'Трейлеры', en: 'Trailers' },
  genresPlayed: { ru: 'Жанры', en: 'Genres' },
  seriesCompleted: { ru: 'Серии игр', en: 'Series' },
  cheatCodes: { ru: 'Чит-коды', en: 'Cheat codes' },
  themesCreated: { ru: 'Свои темы', en: 'Custom themes' },
  screenshotsTaken: { ru: 'Скриншоты', en: 'Screenshots' },
  recordingsMade: { ru: 'Записи экрана', en: 'Screen recordings' },
  level: { ru: 'Уровни', en: 'Levels' },
  achievements: { ru: 'Коллекция', en: 'Collection' },
};

/** `[target, ru, en]` for every step of a family, in the same order as the rules. */
const TITLES: Record<FamilyMetric, Array<[number, string, string]>> = {
  launches: [
    [1, 'Первый запуск', 'First launch'],
    [10, 'Разогрев', 'Warm-up'],
    [25, 'Вошёл во вкус', 'Getting the taste'],
    [50, 'Завсегдатай', 'Regular'],
    [100, 'Сотка', 'The hundred'],
    [250, 'Стабильный игрок', 'Steady player'],
    [500, 'Неутомимый', 'Tireless'],
    [1000, 'Тысяча запусков', 'A thousand launches'],
  ],
  playHours: [
    [1, 'Первый час', 'First hour'],
    [5, 'Втянулся', 'Hooked'],
    [10, 'Десять часов', 'Ten hours in'],
    [25, 'Целые сутки', 'A full day'],
    [50, 'Полсотни часов', 'Fifty hours'],
    [100, 'Сотня часов', 'Hundred hours'],
    [250, 'Ветеран экрана', 'Screen veteran'],
    [500, 'Полтысячи часов', 'Five hundred hours'],
    [1000, 'Легенда лаунчера', 'Launcher legend'],
  ],
  gamesPlayed: [
    [1, 'С чего-то надо начать', 'Gotta start somewhere'],
    [3, 'Пробую разное', 'Trying things out'],
    [5, 'Исследователь', 'Explorer'],
    [10, 'Коллекция впечатлений', 'Collection of experiences'],
    [15, 'Путешественник', 'Traveller'],
    [25, 'Первооткрыватель', 'Trailblazer'],
    [40, 'Энциклопедист', 'Encyclopedist'],
    [60, 'Хранитель библиотеки', 'Library keeper'],
  ],
  longestSessionHours: [
    [1, 'Час без перерыва', 'An hour straight'],
    [2, 'Не оторваться', 'Can not look away'],
    [3, 'Марафон', 'Marathon'],
    [5, 'Долгий путь', 'The long haul'],
    [8, 'Полная смена', 'A full shift'],
    [12, 'Железная выдержка', 'Iron endurance'],
  ],
  maxGameHours: [
    [1, 'Задержался', 'Stuck around'],
    [5, 'Понравилось', 'Liked it'],
    [10, 'Одна любовь', 'One true love'],
    [25, 'С головой', 'All in'],
    [50, 'Не могу расстаться', 'Can not let go'],
    [100, 'Сто часов в одной игре', 'A hundred in one'],
  ],
  daysPlayed: [
    [1, 'Первый день', 'Day one'],
    [3, 'Три дня', 'Three days in'],
    [7, 'Неделя с играми', 'A week of games'],
    [14, 'Две недели', 'Fortnight'],
    [30, 'Месяц в игре', 'A month in'],
    [60, 'Два месяца', 'Two months'],
    [100, 'Сто дней', 'Hundred days'],
    [200, 'Двести дней', 'Two hundred days'],
    [365, 'Год с лаунчером', 'A year together'],
  ],
  bestStreak: [
    [2, 'Два дня подряд', 'Two in a row'],
    [3, 'Разгоняюсь', 'Warming up'],
    [5, 'Пять дней подряд', 'Five-day streak'],
    [7, 'Неделя без пропусков', 'A week, no misses'],
    [14, 'Две недели без пропусков', 'Fortnight streak'],
    [30, 'Месяц без пропусков', 'Month streak'],
    [60, 'Непрерывный огонь', 'Unbroken flame'],
  ],
  nightLaunches: [
    [2, 'Ночной гость', 'Night visitor'],
    [5, 'Сова', 'Night owl'],
    [15, 'Полуночник', 'Midnight regular'],
    [30, 'Тёмная сторона', 'The dark side'],
    [75, 'Хранитель ночи', 'Guardian of the night'],
    [150, 'Вечная ночь', 'Endless night'],
  ],
  morningLaunches: [
    [2, 'Ранняя пташка', 'Early bird'],
    [5, 'С добрым утром', 'Good morning'],
    [15, 'Утренний ритуал', 'Morning ritual'],
    [30, 'Встречаю рассвет', 'Dawn greeter'],
    [75, 'Жаворонок', 'Lark'],
  ],
  eveningLaunches: [
    [2, 'Вечерний гость', 'Evening guest'],
    [5, 'Сумерки зовут', 'Twilight calling'],
    [15, 'Прайм-тайм', 'Prime time'],
    [30, 'Завсегдатай вечера', 'Evening regular'],
    [75, 'Король эфира', 'King of the airwaves'],
  ],
  // No achievement family (stats-only, see the "when you play" chart) — never actually indexed.
  dayLaunches: [],
  weekendLaunches: [
    [2, 'Выходной режим', 'Weekend mode'],
    [5, 'Субботний игрок', 'Saturday gamer'],
    [15, 'Любитель выходных', 'Weekend lover'],
    [40, 'Выходные — моё время', 'Weekends are mine'],
    [100, 'Вечные выходные', 'Eternal weekend'],
  ],
  weekdayLaunches: [
    [2, 'После работы', 'After hours'],
    [5, 'Будни не помеха', 'Weekdays are no excuse'],
    [15, 'Понедельник начинается в субботу', 'Monday begins on Saturday'],
    [40, 'Трудоголик по расписанию', 'Scheduled workaholic'],
    [100, 'Все дни хороши', 'Every day is a good day'],
  ],
  avgSessionMinutes: [],
  favoritesAdded: [
    [1, 'Любимчик', 'Favourite'],
    [3, 'Тройка любимых', 'Top three'],
    [5, 'Пятёрка любимых', 'Fab five'],
    [10, 'Тёплая коллекция', 'Cosy collection'],
    [25, 'Большая любовь', 'Big love'],
    [50, 'Сердце библиотеки', 'Heart of the library'],
  ],
  gamesAdded: [
    [1, 'Новая игра', 'New game'],
    [3, 'Растущая библиотека', 'Growing library'],
    [5, 'Пополнение коллекции', 'Library expands'],
    [10, 'Куратор', 'Curator'],
    [25, 'Хранитель фонда', 'Archivist'],
    [50, 'Великий каталог', 'The great catalogue'],
  ],
  luckyOpens: [[1, 'Авось повезёт', 'Fingers crossed']],
  themesTried: [
    [3, 'Примерка', 'Trying on'],
    [6, 'Хамелеон', 'Chameleon'],
    [10, 'Радужный', 'Rainbow'],
  ],
  trailerViews: [
    [20, 'Киноман', 'Movie buff'],
    [100, 'Кинозал', 'Cinema hall'],
    [300, 'Режиссёрская версия', "Director's cut"],
  ],
  genresPlayed: [
    [3, 'Универсал', 'All-rounder'],
    [5, 'Всеядный', 'Omnivore'],
    [8, 'Человек эпохи Возрождения', 'Renaissance gamer'],
  ],
  seriesCompleted: [
    [1, 'Сага', 'Saga'],
    [3, 'Марафон серий', 'Series binge'],
    [5, 'Летописец', 'Chronicler'],
  ],
  cheatCodes: [
    [3, 'Чит-кодер', 'Code cracker'],
  ],
  themesCreated: [
    [1, 'Дизайнер', 'Designer'],
    [3, 'Стилист', 'Stylist'],
    [5, 'Художник', 'Artist'],
    [10, 'Мастер оформления', 'Theme master'],
  ],
  screenshotsTaken: [
    [1, 'Первый кадр', 'First shot'],
    [5, 'Фотограф', 'Photographer'],
    [15, 'Папарацци', 'Paparazzi'],
    [40, 'Хроникёр', 'Chronicler of pixels'],
    [100, 'Личный фотоальбом', 'Personal photo album'],
  ],
  recordingsMade: [
    [1, 'Первая запись', 'First recording'],
    [5, 'Режиссёр моментов', 'Moment director'],
    [15, 'Монтажёр', 'Editor'],
    [40, 'Съёмочная группа', 'Film crew'],
    [100, 'Собственная киностудия', 'Own film studio'],
  ],
  level: [
    [2, 'Новобранец', 'Recruit'],
    [3, 'Освоился', 'Settled in'],
    [5, 'Опытный', 'Seasoned'],
    [8, 'Закалённый', 'Battle-hardened'],
    [10, 'Десятый уровень', 'Level ten'],
    [15, 'Знаток', 'Connoisseur'],
    [20, 'Мастер', 'Master'],
    [25, 'Гроссмейстер', 'Grandmaster'],
    [30, 'Легенда', 'Legend'],
  ],
  achievements: [
    [5, 'Начало коллекции', 'Collection begins'],
    [10, 'Десять трофеев', 'Ten trophies'],
    [20, 'Охотник за достижениями', 'Achievement hunter'],
    [35, 'Собиратель трофеев', 'Trophy collector'],
    [50, 'Полсотни трофеев', 'Fifty trophies'],
    [75, 'Перфекционист', 'Perfectionist'],
    [100, 'Сотня трофеев', 'Hundred trophies'],
    [125, 'Легенда коллекции', 'Collection legend'],
    [150, 'Живая легенда', 'Living legend'],
    [160, 'Полная коллекция', 'Full collection'],
    [180, 'Абсолютный чемпион', 'Absolute champion'],
  ],
};

const TITLE_BY_ID: Record<string, Localized> = Object.fromEntries(
  (Object.entries(TITLES) as Array<[FamilyMetric, Array<[number, string, string]>]>).flatMap(([metric, steps]) =>
    steps.map(([target, ru, en]) => [`${metric}-${target}`, { ru, en }]),
  ),
);

interface SpecialInfo {
  icon: LucideIcon;
  title: Localized;
  description: Localized;
  /** Only for secrets: shown instead of the description until it is found. */
  hint?: Localized;
}

const info = (
  icon: LucideIcon,
  [titleRu, titleEn]: [string, string],
  [descriptionRu, descriptionEn]: [string, string],
  hint?: [string, string],
): SpecialInfo => ({
  icon,
  title: { ru: titleRu, en: titleEn },
  description: { ru: descriptionRu, en: descriptionEn },
  ...(hint ? { hint: { ru: hint[0], en: hint[1] } } : {}),
});

/** Keyed by the special's key (the id without its `special-` prefix). */
const SPECIALS: Record<string, SpecialInfo> = {
  // secrets
  helloWorld: info(Terminal, ['Первые слова программиста', 'Hello, World!'], ['Вы поздоровались с миром', 'You said hello to the world'], ['Иногда стоит просто поздороваться с миром.', 'Sometimes it pays to say hello to the world.']),
  konami: info(Joystick, ['+30 жизней', '+30 Lives'], ['Вы знаете самый известный чит-код в истории', 'You know the most famous cheat code ever'], ['Вверх, вверх, вниз, вниз… вы знаете, что дальше.', 'Up, up, down, down… you know the rest.']),
  answer42: info(Brain, ['Ответ на всё', 'The Answer'], ['Проведите в игре ровно 42 минуты (плюс-минус минута)', 'Play one session of exactly 42 minutes (give or take a minute)'], ['Главный вопрос жизни, вселенной и всего такого.', 'The ultimate question of life, the universe and everything.']),
  witchingHour: info(Ghost, ['Ведьмин час', 'Witching Hour'], ['Запустите игру в 03:33', 'Launch a game at 03:33'], ['Когда даже совам пора спать.', 'When even owls should be asleep.']),
  makeAWish: info(Sparkles, ['Загадай желание', 'Make a Wish'], ['Запустите игру ровно в 11:11', 'Launch a game at exactly 11:11'], ['Желания принято загадывать на одинаковые цифры.', 'Wishes are made on matching numbers.']),
  leetSpeak: info(Terminal, ['Элита', 'Leet'], ['Запустите игру в 13:37', 'Launch a game at 13:37'], ['1337 — это не число, это образ жизни.', '1337 is not a number, it is a way of life.']),
  bondTime: info(KeyRound, ['Агент 007', 'Agent 007'], ['Запустите игру в 00:07', 'Launch a game at 00:07'], ['Бонд, Джеймс Бонд.', 'Bond, James Bond.']),
  fourTwenty: info(Clock, ['Особое время', 'That Time'], ['Запустите игру в 04:20', 'Launch a game at 04:20'], ['Четыре-двадцать, брат. Ты знаешь, что это значит.', 'Four-twenty, man. You know what that means.']),
  numberOfTheBeast: info(Skull, ['Число зверя', 'Number of the Beast'], ['Запустите игру в 666-й раз', 'Launch a game for the 666th time'], ['666', '666']),
  sixSeven: info(Dices, ['Шесть-семь', 'Six-Seven'], ['Запустите игру в 67-й раз', 'Launch a game for the 67th time'], ['Шесть-семь!', 'Six-seven!']),
  // calendar
  newYear: info(Snowflake, ['С Новым годом!', 'Happy New Year!'], ['Запустите игру 1 января', 'Launch a game on 1 January']),
  halloween: info(Skull, ['Тыквенный сезон', 'Spooky Season'], ['Запустите игру 31 октября', 'Launch a game on 31 October']),
  friday13: info(Cat, ['Пятница, 13-е', 'Friday the 13th'], ['Запустите игру в пятницу 13-го числа', 'Launch a game on Friday the 13th']),
  leapDay: info(CalendarClock, ['Раз в четыре года', 'Once in a Leap Year'], ['Запустите игру 29 февраля', 'Launch a game on 29 February']),
  programmersDay: info(Binary, ['День программиста', "Programmer's Day"], ['Запустите игру в 256-й день года (13 сентября, в високосный год — 12-го)', 'Launch a game on the 256th day of the year (13 September, or the 12th in a leap year)']),
  profileBirthday: info(Cake, ['С днём рождения, профиль!', 'Happy Profile Birthday!'], ['Запустите игру в годовщину создания профиля', 'Launch a game on the anniversary of your profile']),
  cosmonauticsDay: info(Rocket, ['Поехали!', "Let's Go!"], ['Запустите игру 12 апреля', 'Launch a game on 12 April']),
  oldNewYear: info(Snowflake, ['Ещё раз с Новым годом!', 'New Year, Take Two'], ['Запустите игру 14 января', 'Launch a game on 14 January']),
  piDay: info(Gauge, ['Число Пи', 'Pi Day'], ['Запустите игру 14 марта', 'Launch a game on 14 March']),
  starWarsDay: info(Sparkles, ['Да пребудет с тобой сила', 'May the Fourth Be With You'], ['Запустите игру 4 мая', 'Launch a game on 4 May']),
  towelDay: info(ShieldCheck, ['Где моё полотенце?', "Where's My Towel?"], ['Запустите игру 25 мая', 'Launch a game on 25 May']),
  defenderDay: info(ShieldCheck, ['С Днём Победы!', "Happy Defender's Day"], ['Запустите игру 23 февраля', 'Launch a game on 23 February']),
  womensDay: info(Sparkles, ['Цветы подарили — можно и поиграть', "Flowers Delivered, Now Let's Play"], ['Запустите игру 8 марта', 'Launch a game on 8 March']),
  belkaAndStrelka: info(Rocket, ['Белка и Стрелка', 'Belka and Strelka'], ['Запустите игру 19 августа', 'Launch a game on 19 August']),
  // habits
  falseAlarm: info(Siren, ['Ложная тревога', 'False Alarm'], ['Закройте игру в первую минуту после запуска', 'Close a game within a minute of launching it']),
  noBreak: info(FastForward, ['Без передышки', 'No Breaks'], ['Запустите новую игру в течение минуты после закрытия предыдущей', 'Launch a game within a minute of closing the previous one']),
  oldLove30: info(History, ['Старая любовь', 'Old Flame'], ['Вернитесь в игру, в которую не играли 30 дней', 'Go back to a game you have not played for 30 days']),
  oldLove90: info(History, ['Ностальгия', 'Nostalgia'], ['Вернитесь в игру, в которую не играли 90 дней', 'Go back to a game you have not played for 90 days']),
  oldLove365: info(History, ['Из глубин веков', 'From the Depths of Time'], ['Вернитесь в игру, в которую не играли целый год', 'Go back to a game you have not played for a whole year']),
  longTimeNoSee: info(DoorOpen, ['Долго же тебя не было', 'Long Time No See'], ['Вернитесь в лаунчер после перерыва в 30 дней', 'Come back to the launcher after a 30-day break']),
  multitasker: info(Layers, ['Многостаночник', 'Multitasker'], ['Запустите 3 разные игры за один день', 'Launch 3 different games in one day']),
  taster: info(Utensils, ['Дегустатор', 'Taster'], ['Запустите 5 разных игр за один день', 'Launch 5 different games in one day']),
  workingHours: info(Briefcase, ['Рабочее время?', 'Working Hours?'], ['Запустите игру в будни с 10:00 до 16:00', 'Launch a game on a weekday between 10:00 and 16:00']),
  marathoner: info(Hourglass, ['Заигрался', 'Lost Track of Time'], ['Проведите одну игровую сессию длиной 6 часов и больше', 'Play a single session of 6 hours or more']),
  allHours: info(Clock, ['Круглые сутки', 'Around the Clock'], ['Запускайте игры в каждый час суток хотя бы раз (по местному времени)', 'Launch a game during every hour of the day at least once (local time)']),
  // launcher
  backup: info(ShieldCheck, ['Страховка', 'Insurance'], ['Создайте резервную копию сохранений', 'Make a backup of your saves']),
  restore: info(Undo2, ['Машина времени', 'Time Machine'], ['Восстановите сохранения из резервной копии', 'Restore your saves from a backup']),
  manual: info(BookOpen, ['Читаю инструкцию', 'RTFM'], ['Откройте инструкцию к игре', "Open a game's instructions"]),
  bonus: info(Clapperboard, ['За кулисами', 'Behind the Scenes'], ['Откройте дополнительный контент игры', "Open a game's bonus content"]),
  installer: info(Download, ['Мастер установки', 'Setup Wizard'], ['Запустите установщик игры из лаунчера', "Run a game's installer from the launcher"]),
  tweaker: info(SlidersHorizontal, ['Крутим ручки', 'Knob Twiddler'], ['Откройте внешние настройки игры', "Open a game's external settings"]),
  emergencyExit: info(OctagonX, ['Аварийный выход', 'Emergency Exit'], ['Принудительно остановите игру кнопкой «Остановить»', 'Force-quit a game with the Stop button']),
  editor: info(Pencil, ['Редактор', 'Editor'], ['Сохраните правки данных игры', "Save changes to a game's data"]),
  lightAtNight: info(Sun, ['Мои глаза!', 'My Eyes!'], ['Включите светлую тему между 00:00 и 05:00', 'Switch to a light theme between 00:00 and 05:00']),
  diskScan: info(HardDrive, ['Ревизор', 'Auditor'], ['Дождитесь полного подсчёта места на диске в разделе здоровья библиотеки', 'Let the library health tab finish measuring disk usage for every game']),
  // library
  lowRated: info(ThumbsDown, ['Вопреки критикам', 'Against the Critics'], ['Запустите игру с рейтингом ниже 7', 'Launch a game rated below 7']),
  highRated: info(Award, ['Проверено критиками', 'Critic Approved'], ['Запустите игру с рейтингом 9 и выше', 'Launch a game rated 9 or higher']),
  retro: info(Tv, ['Ретро', 'Retro'], ['Запустите игру, вышедшую до 2000 года', 'Launch a game released before the year 2000']),
  mysteryBox: info(HardDrive, ['Тайна за семью печатями', 'Mystery Box'], ['Запустите игру совсем без обложек', 'Launch a game with no covers at all']),
  libraryQuarter: info(LibraryBig, ['Четверть коллекции', 'A Quarter of the Collection'], ['Запустите хотя бы раз 25% своей библиотеки', 'Launch at least 25% of your library']),
  libraryHalf: info(LibraryBig, ['Половина пройдена', 'Halfway There'], ['Запустите хотя бы раз 50% своей библиотеки', 'Launch at least 50% of your library']),
  libraryMost: info(LibraryBig, ['Почти всё', 'Almost Everything'], ['Запустите хотя бы раз 75% своей библиотеки', 'Launch at least 75% of your library']),
  libraryComplete: info(Crown, ['Библиотека покорена', 'Library Conquered'], ['Запустите хотя бы раз каждую игру в своей библиотеке', 'Launch every single game in your library at least once']),
};

const SPECIAL_ID_PREFIX = 'special-';

const specialOf = (achievement: AchievementDef): SpecialInfo | undefined =>
  achievement.metric === 'special' ? SPECIALS[achievement.id.slice(SPECIAL_ID_PREFIX.length)] : undefined;

const russianPlural = (count: number, [one, few, many]: [string, string, string]): string => {
  const lastTwo = count % 100;
  const last = count % 10;

  if (last === 1 && lastTwo !== 11) {
    return one;
  }

  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
};

const englishPlural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

const DESCRIPTIONS: Record<FamilyMetric, { ru: (n: number) => string; en: (n: number) => string }> = {
  launches: {
    ru: (n) => `Запустите игры ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch games ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  playHours: {
    ru: (n) => `Проведите в играх ${n} ${russianPlural(n, ['час', 'часа', 'часов'])}`,
    en: (n) => `Spend ${n} ${englishPlural(n, 'hour', 'hours')} playing`,
  },
  gamesPlayed: {
    ru: (n) => `Поиграйте в ${n} ${russianPlural(n, ['игру', 'разные игры', 'разных игр'])}`,
    en: (n) => `Play ${n} different ${englishPlural(n, 'game', 'games')}`,
  },
  longestSessionHours: {
    ru: (n) => `Играйте ${n} ${russianPlural(n, ['час', 'часа', 'часов'])} подряд`,
    en: (n) => `Play for ${n} ${englishPlural(n, 'hour', 'hours')} in one go`,
  },
  maxGameHours: {
    ru: (n) => `Проведите ${n} ${russianPlural(n, ['час', 'часа', 'часов'])} в одной игре`,
    en: (n) => `Spend ${n} ${englishPlural(n, 'hour', 'hours')} in a single game`,
  },
  daysPlayed: {
    ru: (n) => `Играйте в течение ${n} ${russianPlural(n, ['дня', 'дней', 'дней'])}`,
    en: (n) => `Play on ${n} different ${englishPlural(n, 'day', 'days')}`,
  },
  bestStreak: {
    ru: (n) => `Играйте ${n} ${russianPlural(n, ['день', 'дня', 'дней'])} подряд`,
    en: (n) => `Play ${n} ${englishPlural(n, 'day', 'days')} in a row`,
  },
  nightLaunches: {
    ru: (n) => `Запустите игру ночью (00:00–05:00) ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch a game at night (00:00–05:00) ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  morningLaunches: {
    ru: (n) => `Запустите игру утром (05:00–09:00) ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch a game in the morning (05:00–09:00) ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  weekendLaunches: {
    ru: (n) => `Запустите игру в выходные ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch a game on a weekend ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  eveningLaunches: {
    ru: (n) => `Запустите игру вечером (18:00–00:00) ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch a game in the evening (18:00–00:00) ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  weekdayLaunches: {
    ru: (n) => `Запустите игру в будний день ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Launch a game on a weekday ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  // No achievement family for these two (stats-only) — the functions are never actually called.
  dayLaunches: { ru: () => '', en: () => '' },
  avgSessionMinutes: { ru: () => '', en: () => '' },
  favoritesAdded: {
    ru: (n) => `Добавьте в избранное ${n} ${russianPlural(n, ['игру', 'игры', 'игр'])}`,
    en: (n) => `Add ${n} ${englishPlural(n, 'game', 'games')} to favourites`,
  },
  gamesAdded: {
    ru: (n) => `Добавьте в галерею ${n} ${russianPlural(n, ['игру', 'игры', 'игр'])}`,
    en: (n) => `Add ${n} ${englishPlural(n, 'game', 'games')} to the gallery`,
  },
  luckyOpens: {
    ru: (n) =>
      n === 1
        ? 'Крутаните «Мне повезёт» и откройте выпавшую игру'
        : `Откройте ${n} ${russianPlural(n, ['игру', 'игры', 'игр'])}, выпавших в «Мне повезёт»`,
    en: (n) =>
      n === 1
        ? 'Spin the Feeling Lucky reel and open the game it lands on'
        : `Open ${n} games the Feeling Lucky reel landed on`,
  },
  themesTried: {
    ru: (n) => `Попробуйте ${n} ${russianPlural(n, ['тему', 'темы', 'тем'])} оформления`,
    en: (n) => `Try ${n} different ${englishPlural(n, 'theme', 'themes')}`,
  },
  trailerViews: {
    ru: (n) => `Посмотрите превью трейлеров ${n} ${russianPlural(n, ['раз', 'раза', 'раз'])}`,
    en: (n) => `Watch trailer previews ${n} ${englishPlural(n, 'time', 'times')}`,
  },
  genresPlayed: {
    ru: (n) => `Сыграйте в игры из ${n} ${russianPlural(n, ['разного жанра', 'разных жанров', 'разных жанров'])}`,
    en: (n) => `Play games from ${n} different ${englishPlural(n, 'genre', 'genres')}`,
  },
  seriesCompleted: {
    ru: (n) =>
      n === 1
        ? 'Запустите все игры одной серии (в библиотеке их должно быть не меньше трёх)'
        : `Запустите все игры ${n} ${russianPlural(n, ['серии', 'серий', 'серий'])}`,
    en: (n) =>
      n === 1
        ? 'Launch every game of one series (it needs at least three in the library)'
        : `Launch every game of ${n} different series`,
  },
  cheatCodes: {
    ru: (n) => `Введите ${n} ${russianPlural(n, ['чит-код', 'разных чит-кода', 'разных чит-кодов'])} из старых игр`,
    en: (n) => `Enter ${n} different ${englishPlural(n, 'cheat code', 'cheat codes')} from classic games`,
  },
  themesCreated: {
    ru: (n) => `Создайте ${n} ${russianPlural(n, ['свою тему', 'своих темы', 'своих тем'])} оформления`,
    en: (n) => `Create ${n} ${englishPlural(n, 'custom theme', 'custom themes')}`,
  },
  screenshotsTaken: {
    ru: (n) => `Сделайте ${n} ${russianPlural(n, ['скриншот', 'скриншота', 'скриншотов'])} во время игры`,
    en: (n) => `Take ${n} in-game ${englishPlural(n, 'screenshot', 'screenshots')}`,
  },
  recordingsMade: {
    ru: (n) => `Запишите ${n} ${russianPlural(n, ['видео', 'видео', 'видео'])} игрового процесса`,
    en: (n) => `Record ${n} ${englishPlural(n, 'gameplay clip', 'gameplay clips')}`,
  },
  level: {
    ru: (n) => `Достигните ${n} уровня`,
    en: (n) => `Reach level ${n}`,
  },
  achievements: {
    ru: (n) => `Получите ${n} ${russianPlural(n, ['достижение', 'достижения', 'достижений'])}`,
    en: (n) => `Unlock ${n} ${englishPlural(n, 'achievement', 'achievements')}`,
  },
};

/** What a secret family shows instead of its description until it is found (specials carry their own hint). */
const FAMILY_HINTS: Partial<Record<FamilyMetric, Localized>> = {
  cheatCodes: { ru: 'Старые игры знали секретные слова.', en: 'Classic games knew secret words.' },
};

export const achievementIcon = (achievement: AchievementDef): LucideIcon =>
  specialOf(achievement)?.icon ?? METRIC_ICONS[achievement.metric as FamilyMetric];

export const achievementTitle = (achievement: AchievementDef, locale: Locale): string =>
  specialOf(achievement)?.title[locale] ?? TITLE_BY_ID[achievement.id]?.[locale] ?? achievement.id;

export const achievementDescription = (achievement: AchievementDef, locale: Locale): string => {
  const special = specialOf(achievement);

  return special ? special.description[locale] : DESCRIPTIONS[achievement.metric as FamilyMetric][locale](achievement.target);
};

export const secretHint = (achievement: AchievementDef, locale: Locale): string =>
  specialOf(achievement)?.hint?.[locale] ?? FAMILY_HINTS[achievement.metric as FamilyMetric]?.[locale] ?? '';

/** "1K" for 1000, otherwise the number itself. */
export const compactNumber = (value: number): string => (value >= 1000 ? `${value / 1000}K` : String(value));

/** The small figure on an achievement's badge: the target of a family step; none for one-offs and secrets. */
export const achievementLabel = (achievement: AchievementDef): string | undefined =>
  achievement.metric === 'special' || achievement.hidden ? undefined : compactNumber(achievement.target);

const LEVEL_TITLES: Array<{ from: number; title: Localized }> = [
  { from: 1, title: { ru: 'Новичок', en: 'Rookie' } },
  { from: 3, title: { ru: 'Игрок', en: 'Player' } },
  { from: 5, title: { ru: 'Опытный игрок', en: 'Seasoned player' } },
  { from: 8, title: { ru: 'Ветеран', en: 'Veteran' } },
  { from: 12, title: { ru: 'Эксперт', en: 'Expert' } },
  { from: 16, title: { ru: 'Мастер', en: 'Master' } },
  { from: 20, title: { ru: 'Легенда', en: 'Legend' } },
  { from: 25, title: { ru: 'Гроссмейстер', en: 'Grandmaster' } },
];

export const levelTitle = (level: number, locale: Locale): string =>
  [...LEVEL_TITLES].reverse().find((entry) => level >= entry.from)?.title[locale] ?? LEVEL_TITLES[0].title[locale];
