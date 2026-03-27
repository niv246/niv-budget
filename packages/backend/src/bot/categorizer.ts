import prisma from '../prisma';

let categoriesCache: { id: string; name: string; keywords: string[] }[] | null = null;

async function getCategories() {
  if (!categoriesCache) {
    categoriesCache = await prisma.category.findMany({
      select: { id: true, name: true, keywords: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
  return categoriesCache;
}

export function clearCategoryCache() {
  categoriesCache = null;
}

export async function categorize(description: string): Promise<string> {
  const categories = await getCategories();
  const words = description.toLowerCase().split(/\s+/);

  for (const category of categories) {
    for (const word of words) {
      for (const keyword of category.keywords) {
        if (word.includes(keyword) || keyword.includes(word)) {
          return category.id;
        }
      }
    }
  }

  // Fallback to "אחר"
  const other = categories.find((c) => c.name === 'אחר');
  return other?.id || categories[categories.length - 1].id;
}
