import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Admin
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@jobaggregator.local' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: {
        email: 'admin@jobaggregator.local',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Created default admin: admin@jobaggregator.local / admin123');
  } else {
    console.log('Default admin already exists.');
  }

  // 2. Create Default Sources
  const defaultSources = [
    {
      name: 'Y Combinator Jobs',
      baseUrl: 'https://www.ycombinator.com/jobs',
      crawlFrequency: '24', // 24 hours
      enabled: true,
    },
    {
      name: 'We Work Remotely',
      baseUrl: 'https://weworkremotely.com/remote-jobs',
      crawlFrequency: '12',
      enabled: true,
    }
  ];

  for (const src of defaultSources) {
    const existing = await prisma.source.findUnique({ where: { baseUrl: src.baseUrl } });
    if (!existing) {
      await prisma.source.create({ data: src });
      console.log(`Created source: ${src.name}`);
    }
  }

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
