import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: 'אוכל בחוץ',
    icon: '☕',
    color: '#FF6B6B',
    sortOrder: 1,
    keywords: [
      'קפה', 'מסעדה', 'פיצה', 'סושי', 'בורגר', 'שווארמה', 'פלאפל',
      'בירה', 'בר', 'מקדונלדס', 'מאפה', 'ארוחה', 'משלוח', 'וולט',
      'תן ביס', 'ג\'חנון', 'חומוס', 'סנדוויץ', 'אוכל', 'המבורגר',
    ],
  },
  {
    name: 'סופר/מזון',
    icon: '🛒',
    color: '#4ECDC4',
    sortOrder: 2,
    keywords: [
      'סופר', 'רמי לוי', 'שופרסל', 'מזון', 'ירקות', 'בשר', 'מכולת',
      'יוחננוף', 'ויקטורי', 'אושר עד', 'שוק', 'פירות', 'חלב', 'לחם',
    ],
  },
  {
    name: 'תחבורה',
    icon: '🚗',
    color: '#45B7D1',
    sortOrder: 3,
    keywords: [
      'דלק', 'רכבת', 'אוטובוס', 'רב קו', 'מונית', 'גט', 'חניה',
      'כביש 6', 'סונול', 'פז', 'דור אלון', 'אובר', 'טרמינל',
    ],
  },
  {
    name: 'בילויים',
    icon: '🎬',
    color: '#96CEB4',
    sortOrder: 4,
    keywords: [
      'סרט', 'קולנוע', 'הופעה', 'כרטיס', 'מופע', 'פארק', 'בריכה',
      'ספא', 'הצגה', 'פאב', 'מסיבה', 'בילוי',
    ],
  },
  {
    name: 'קניות',
    icon: '🛍️',
    color: '#DDA0DD',
    sortOrder: 5,
    keywords: [
      'בגד', 'נעליים', 'חולצה', 'מכנסיים', 'ביגוד', 'עלי אקספרס',
      'אמזון', 'שיין', 'טרמינל', 'קניון', 'חנות',
    ],
  },
  {
    name: 'בריאות',
    icon: '🏥',
    color: '#98D8C8',
    sortOrder: 6,
    keywords: [
      'רופא', 'תרופות', 'מרשם', 'בית מרקחת', 'קופת חולים', 'שיאצו',
      'פיזיו', 'רפואה', 'רופא שיניים', 'אופטיקה', 'משקפיים',
    ],
  },
  {
    name: 'חשבונות',
    icon: '📄',
    color: '#F7DC6F',
    sortOrder: 7,
    keywords: [
      'חשמל', 'מים', 'גז', 'ארנונה', 'ועד בית', 'אינטרנט', 'סלולר',
      'ביטוח', 'טלפון',
    ],
  },
  {
    name: 'אחר',
    icon: '📌',
    color: '#AEB6BF',
    sortOrder: 8,
    keywords: [],
  },
];

async function main() {
  console.log('Seeding database...');

  // Create categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, color: cat.color, keywords: cat.keywords, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`Created ${CATEGORIES.length} categories`);

  // Create OWNER user
  const owner = await prisma.user.upsert({
    where: { accessToken: process.env.OWNER_ACCESS_TOKEN || 'owner-niv-budget-2026-secret-token' },
    update: {},
    create: {
      name: 'ניב',
      role: 'OWNER',
      accessToken: process.env.OWNER_ACCESS_TOKEN || 'owner-niv-budget-2026-secret-token',
    },
  });
  console.log(`Created owner: ${owner.name} (${owner.id})`);

  // Create VIEWER user (Mom)
  const viewer = await prisma.user.upsert({
    where: { accessToken: process.env.VIEWER_ACCESS_TOKEN || 'viewer-mom-budget-2026-secret-token' },
    update: {},
    create: {
      name: 'אמא',
      role: 'VIEWER',
      accessToken: process.env.VIEWER_ACCESS_TOKEN || 'viewer-mom-budget-2026-secret-token',
    },
  });
  console.log(`Created viewer: ${viewer.name} (${viewer.id})`);

  // Create default settings
  const existingSettings = await prisma.userSettings.findFirst();
  if (!existingSettings) {
    await prisma.userSettings.create({
      data: {
        loanTotal: 0,
        loanMonthlyPayment: 0,
        loanStartDate: new Date(),
        weeklyReportEnabled: true,
        weeklyReportDay: 0,
        alertThreshold: 80,
        isOnboarded: false,
      },
    });
    console.log('Created default settings');
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
