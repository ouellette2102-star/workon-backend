import { PrismaClient, UserRole, MissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WorkOn data...');

  // 1. Créer un utilisateur worker de test
  const workerUser = await prisma.user.upsert({
    where: { email: 'worker@test.com' },
    update: {},
    create: {
      clerkId: 'test-worker-001',
      email: 'worker@test.com',
      name: 'Alex Tremblay',
      fullName: 'Alex Tremblay',
      role: UserRole.WORKER,
      primaryRole: UserRole.WORKER,
      city: 'Montréal',
      phone: '+1 514 555 0100',
      active: true,
    },
  });

  console.log(`✅ Worker user created: ${workerUser.email}`);

  // 2. Créer le profil Worker associé
  const worker = await prisma.worker.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      skills: [
        { name: 'Montage de meubles', level: 'expert', verified: true },
        { name: 'Déneigement', level: 'intermédiaire', verified: false },
        { name: 'Déménagement', level: 'expert', verified: true },
      ],
      rating: 4.8,
      badges: ['verified', 'punctual'],
    },
  });

  console.log(`✅ Worker profile created: ${worker.id}`);

  // 3. Créer un employeur de test pour les missions
  const employerUser = await prisma.user.upsert({
    where: { email: 'employer@test.com' },
    update: {},
    create: {
      clerkId: 'test-employer-001',
      email: 'employer@test.com',
      name: 'Entreprise Test',
      fullName: 'Entreprise Test Inc.',
      role: UserRole.EMPLOYER,
      primaryRole: UserRole.EMPLOYER,
      city: 'Montréal',
      active: true,
    },
  });

  const employer = await prisma.employer.upsert({
    where: { userId: employerUser.id },
    update: {},
    create: {
      userId: employerUser.id,
      companyName: 'Test Company Inc.',
      billingInfo: {
        address: '123 rue Test, Montréal, QC',
        taxNumber: 'TVQ123456789',
      },
    },
  });

  console.log(`✅ Employer created: ${employer.companyName}`);

  // 4. Créer 5 missions de test
  const missions = [
    {
      title: 'Montage de meubles IKEA',
      description: "Besoin d'un coup de main pour monter un bureau.",
      category: 'Entretien / Maison',
      hourlyRate: 25.0,
      priceCents: 7500, // 75$ (3h × 25$/h)
      city: 'Montréal',
      address: '456 rue Sainte-Catherine',
      location: { lat: 45.5017, lng: -73.5673 },
      status: MissionStatus.CREATED,
      employerId: employer.id,
    },
    {
      title: 'Déneigement d\'entrée',
      description: 'Entrée résidentielle à déneiger après tempête.',
      category: 'Saisonnier',
      hourlyRate: 30.0,
      priceCents: 9000, // 90$ (3h × 30$/h)
      city: 'Laval',
      address: '789 boulevard Chomedey',
      location: { lat: 45.6066, lng: -73.7124 },
      status: MissionStatus.CREATED,
      employerId: employer.id,
    },
    {
      title: 'Aide au déménagement',
      description: 'Besoin de 2h de bras pour déplacement de meubles.',
      category: 'Manutention',
      hourlyRate: 20.0,
      priceCents: 4000, // 40$ (2h × 20$/h)
      city: 'Repentigny',
      address: '321 avenue du Parc',
      location: { lat: 45.742, lng: -73.45 },
      status: MissionStatus.CREATED,
      employerId: employer.id,
    },
    {
      title: 'Nettoyage d\'appartement',
      description: 'Grand ménage 3 ½, produits fournis.',
      category: 'Entretien ménager',
      hourlyRate: 28.0,
      priceCents: 11200, // 112$ (4h × 28$/h)
      city: 'Montréal',
      address: '555 rue Saint-Denis',
      location: { lat: 45.53, lng: -73.57 },
      status: MissionStatus.CREATED,
      employerId: employer.id,
    },
    {
      title: 'Installation TV murale',
      description: 'Fixer une télévision au mur + gestion des câbles.',
      category: 'Service technique',
      hourlyRate: 40.0,
      priceCents: 8000, // 80$ (2h × 40$/h)
      city: 'Terrebonne',
      address: '999 montée Masson',
      location: { lat: 45.7, lng: -73.64 },
      status: MissionStatus.CREATED,
      employerId: employer.id,
    },
  ];

  for (const missionData of missions) {
    await prisma.mission.create({
      data: missionData,
    });
    console.log(`  ✅ Mission created: "${missionData.title}"`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`  - Worker: ${workerUser.email} (${workerUser.fullName})`);
  console.log(`  - Employer: ${employerUser.email}`);
  console.log(`  - Missions created: ${missions.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
