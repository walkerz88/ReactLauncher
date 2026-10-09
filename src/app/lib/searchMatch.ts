const EN_LAYOUT = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`";
const RU_LAYOUT = 'йцукенгшщзхъфывапролджэячсмитьбю.ё';

const toRussian = new Map<string, string>();
const toEnglish = new Map<string, string>();

for (let i = 0; i < EN_LAYOUT.length; i += 1) {
  toRussian.set(EN_LAYOUT[i], RU_LAYOUT[i]);
  toEnglish.set(RU_LAYOUT[i], EN_LAYOUT[i]);
}

const convert = (value: string, map: Map<string, string>) =>
  Array.from(value, (char) => map.get(char) ?? char).join('');

export const matchesSearch = (name: string, query: string) => {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [normalizedQuery, convert(normalizedQuery, toRussian), convert(normalizedQuery, toEnglish)].some(
    (variant) => normalizedName.includes(variant),
  );
};
