import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.shiftSwapRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();

  // Create users - Admins
  const emma = await prisma.user.create({
    data: { name: 'Emma', email: 'emma@vaktplan.no', password: '-', role: 'ADMIN', active: true },
  });
  const mia = await prisma.user.create({
    data: { name: 'Mia', email: 'mia@vaktplan.no', password: '-', role: 'ADMIN', active: true },
  });
  const andreas = await prisma.user.create({
    data: { name: 'Andreas', email: 'andreas@vaktplan.no', password: '-', role: 'ADMIN', active: true },
  });

  // Create users - Employees
  const helle = await prisma.user.create({
    data: { name: 'Helle', email: 'helle@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });
  const arin = await prisma.user.create({
    data: { name: 'Arin', email: 'arin@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });
  const helene = await prisma.user.create({
    data: { name: 'Helene', email: 'helene@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });
  const madelen = await prisma.user.create({
    data: { name: 'Madelen', email: 'madelen@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });
  const rokaia = await prisma.user.create({
    data: { name: 'Rokaia', email: 'rokaia@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });
  const filip = await prisma.user.create({
    data: { name: 'Filip', email: 'filip@vaktplan.no', password: '-', role: 'EMPLOYEE', active: true },
  });

  console.log('✅ Created 9 users');

  // Helper function to create shift with assignment
  async function createShift(userName: string, userId: string, date: string, startTime: string, endTime: string) {
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    const shift = await prisma.shift.create({
      data: {
        title: userName,
        startsAt,
        endsAt,
        location: '-',
        status: 'PLANNED',
      },
    });

    await prisma.shiftAssignment.create({
      data: {
        shiftId: shift.id,
        userId: userId,
        assignmentStatus: 'ASSIGNED',
      },
    });

    return shift;
  }

  // ===== UKE 4 =====

  // Mandag 19.01
  await createShift('Andreas', andreas.id, '2026-01-19', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-19', '11:30', '19:00');
  await createShift('Arin', arin.id, '2026-01-19', '17:00', '21:15');

  // Tirsdag 20.01
  await createShift('Andreas', andreas.id, '2026-01-20', '10:00', '17:00');
  await createShift('Rokaia', rokaia.id, '2026-01-20', '17:00', '21:15');

  // Onsdag 21.01
  await createShift('Mia', mia.id, '2026-01-21', '09:30', '17:00');
  await createShift('Andreas', andreas.id, '2026-01-21', '12:00', '19:00');
  await createShift('Arin', arin.id, '2026-01-21', '17:00', '21:15');

  // Torsdag 22.01
  await createShift('Andreas', andreas.id, '2026-01-22', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-22', '11:30', '19:00');
  await createShift('Madelen', madelen.id, '2026-01-22', '17:00', '21:15');

  // Fredag 23.01
  await createShift('Andreas', andreas.id, '2026-01-23', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-23', '09:30', '17:00');
  await createShift('Rokaia', rokaia.id, '2026-01-23', '17:00', '21:15');
  await createShift('Arin', arin.id, '2026-01-23', '17:00', '21:15');

  // Lørdag 24.01
  await createShift('Mia', mia.id, '2026-01-24', '09:30', '17:00');
  await createShift('Helene', helene.id, '2026-01-24', '10:30', '18:00');
  await createShift('Helle', helle.id, '2026-01-24', '12:00', '19:00');

  // ===== UKE 5 =====

  // Mandag 26.01
  await createShift('Andreas', andreas.id, '2026-01-26', '10:00', '17:00');
  await createShift('Arin', arin.id, '2026-01-26', '13:00', '19:00');
  await createShift('Rokaia', rokaia.id, '2026-01-26', '17:00', '21:15');

  // Tirsdag 27.01
  await createShift('Mia', mia.id, '2026-01-27', '09:30', '17:00');
  await createShift('Andreas', andreas.id, '2026-01-27', '12:00', '19:00');
  await createShift('Arin', arin.id, '2026-01-27', '17:00', '21:15');

  // Onsdag 28.01
  await createShift('Andreas', andreas.id, '2026-01-28', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-28', '11:30', '19:00');
  await createShift('Arin', arin.id, '2026-01-28', '17:00', '21:15');

  // Torsdag 29.01
  await createShift('Andreas', andreas.id, '2026-01-29', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-29', '11:30', '19:00');
  await createShift('Madelen', madelen.id, '2026-01-29', '17:00', '21:15');

  // Fredag 30.01
  await createShift('Andreas', andreas.id, '2026-01-30', '10:00', '17:00');
  await createShift('Mia', mia.id, '2026-01-30', '09:30', '17:00');
  await createShift('Helle', helle.id, '2026-01-30', '17:00', '21:15');
  await createShift('Filip', filip.id, '2026-01-30', '17:00', '21:15');

  // Lørdag 31.01
  await createShift('Rokaia', rokaia.id, '2026-01-31', '09:30', '17:00');
  await createShift('Arin', arin.id, '2026-01-31', '10:30', '18:00');
  await createShift('Filip', filip.id, '2026-01-31', '12:00', '19:00');

  console.log('✅ Created all shifts for Week 4 and Week 5');
  console.log('');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
