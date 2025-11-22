/**
 * Seed de développement pour WorkOn
 * 
 * Ce fichier crée des données de test pour faciliter le développement local.
 * Il génère :
 * - Un utilisateur worker de test
 * - Un profil Worker associé
 * - Plusieurs missions de test (disponibles, réservées, etc.)
 * - Un employeur avec quelques missions
 * 
 * UTILISATION :
 * 1. Ajustez CLERK_USER_ID avec votre vrai Clerk ID (voir ci-dessous)
 * 2. Lancez : npm run seed:dev
 * 
 * ATTENTION : Ce seed utilise `upsert` pour éviter les doublons.
 * Il est safe de le lancer plusieurs fois.
 */

import { PrismaClient, UserRole, MissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ⚠️ IMPORTANT : Remplacez cette valeur par votre vrai Clerk User ID
// Vous pouvez le trouver dans :
// - Les logs du backend quand vous vous connectez
// - Le dashboard Clerk
// - La console du navigateur : await clerk.user.id
const CLERK_USER_ID = 'user_YOUR_CLERK_ID_HERE'; // TODO: Remplacez par votre Clerk ID

// Email de test (doit correspondre à votre compte Clerk)
const DEV_EMAIL = 'dev@workon.local'; // TODO: Remplacez par votre email Clerk

async function main() {
  console.log('🌱 Seed de développement WorkOn...\n');

  // 1️⃣ Créer/mettre à jour l'utilisateur worker de test
  console.log('📝 Création de l\'utilisateur worker de test...');
  const workerUser = await prisma.user.upsert({
    where: { clerkId: CLERK_USER_ID },
    update: {
      role: UserRole.WORKER,
      primaryRole: UserRole.WORKER,
      fullName: 'Travailleur Test',
      phone: '+1 514 555 0100',
      city: 'Montréal',
      active: true,
      profile: {
        bio: 'Worker de test pour le développement',
        avatar: null,
        skills: ['Ménage', 'Déménagement', 'Peinture'],
      },
    },
    create: {
      clerkId: CLERK_USER_ID,
      email: DEV_EMAIL,
      name: 'Travailleur Test',
      role: UserRole.WORKER,
      primaryRole: UserRole.WORKER,
      fullName: 'Travailleur Test',
      phone: '+1 514 555 0100',
      city: 'Montréal',
      active: true,
      profile: {
        bio: 'Worker de test pour le développement',
        avatar: null,
        skills: ['Ménage', 'Déménagement', 'Peinture'],
      },
    },
  });
  console.log(`✅ Utilisateur créé/mis à jour : ${workerUser.email} (ID: ${workerUser.id})`);

  // 2️⃣ Créer le profil Worker associé
  console.log('\n👷 Création du profil Worker...');
  const worker = await prisma.worker.upsert({
    where: { userId: workerUser.id },
    update: {
      skills: [
        { name: 'Ménage', level: 'expert', verified: true },
        { name: 'Déménagement', level: 'intermédiaire', verified: false },
        { name: 'Peinture', level: 'débutant', verified: false },
      ],
      rating: 4.7,
      badges: ['verified', 'punctual', 'top-rated'],
    },
    create: {
      userId: workerUser.id,
      skills: [
        { name: 'Ménage', level: 'expert', verified: true },
        { name: 'Déménagement', level: 'intermédiaire', verified: false },
        { name: 'Peinture', level: 'débutant', verified: false },
      ],
      rating: 4.7,
      badges: ['verified', 'punctual', 'top-rated'],
    },
  });
  console.log(`✅ Profil Worker créé : ${worker.id}`);

  // 3️⃣ Créer un employeur de test
  console.log('\n🏢 Création d\'un employeur de test...');
  const employerUser = await prisma.user.upsert({
    where: { email: 'employer-dev@workon.local' },
    update: {
      role: UserRole.EMPLOYER,
      primaryRole: UserRole.EMPLOYER,
      fullName: 'Employeur Test',
      city: 'Montréal',
    },
    create: {
      email: 'employer-dev@workon.local',
      clerkId: 'user_dev_employer_' + Date.now(), // Fake clerk ID pour dev
      name: 'Employeur Test',
      role: UserRole.EMPLOYER,
      primaryRole: UserRole.EMPLOYER,
      fullName: 'Employeur Test',
      city: 'Montréal',
      active: true,
    },
  });

  const employer = await prisma.employer.upsert({
    where: { userId: employerUser.id },
    update: {
      companyName: 'Test Company Inc.',
    },
    create: {
      userId: employerUser.id,
      companyName: 'Test Company Inc.',
      billingInfo: {
        address: '123 rue Test, Montréal',
        taxNumber: 'TVQ123456',
      },
    },
  });
  console.log(`✅ Employeur créé : ${employer.companyName}`);

  // 4️⃣ Créer des missions de test
  console.log('\n🎯 Création de missions de test...');

  const missions = [
    {
      title: 'Ménage appartement 3½',
      description: 'Ménage complet d\'un appartement de 3 pièces et demie à Montréal',
      category: 'Ménage',
      city: 'Montréal',
      address: '456 rue Sainte-Catherine',
      hourlyRate: 25.0,
      priceCents: 7500, // 75$ (3h × 25$/h)
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3h plus tard
      status: MissionStatus.CREATED,
      location: { lat: 45.5017, lng: -73.5673 },
    },
    {
      title: 'Déménagement studio',
      description: 'Aide au déménagement d\'un studio, 2 travailleurs requis',
      category: 'Déménagement',
      city: 'Montréal',
      address: '789 avenue du Parc',
      hourlyRate: 30.0,
      priceCents: 12000, // 120$ (4h × 30$/h)
      startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Dans 5 jours
      endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4h plus tard
      status: MissionStatus.CREATED,
      location: { lat: 45.5085, lng: -73.5878 },
    },
    {
      title: 'Peinture salon',
      description: 'Peindre un salon de 15m²',
      category: 'Peinture',
      city: 'Laval',
      address: '321 boulevard Chomedey',
      hourlyRate: 28.0,
      priceCents: 16800, // 168$ (6h × 28$/h)
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6h plus tard
      status: MissionStatus.CREATED,
      location: { lat: 45.6066, lng: -73.7124 },
    },
    {
      title: 'Mission réservée (déjà prise)',
      description: 'Cette mission est déjà réservée par le worker de test',
      category: 'Ménage',
      city: 'Montréal',
      address: '999 rue Test',
      hourlyRate: 25.0,
      priceCents: 5000,
      startsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      status: MissionStatus.RESERVED,
      workerId: worker.id, // Assignée au worker de test
      location: { lat: 45.5017, lng: -73.5673 },
    },
  ];

  for (const missionData of missions) {
    const mission = await prisma.mission.create({
      data: {
        ...missionData,
        employerId: employer.id,
      },
    });
    console.log(`  ✅ Mission créée : "${mission.title}" (${mission.status})`);
  }

  console.log('\n🎉 Seed de développement terminé avec succès !');
  console.log('\n📋 Résumé :');
  console.log(`  - Utilisateur worker : ${workerUser.email}`);
  console.log(`  - Clerk ID : ${CLERK_USER_ID}`);
  console.log(`  - Profil Worker ID : ${worker.id}`);
  console.log(`  - Missions disponibles : ${missions.filter(m => m.status === MissionStatus.CREATED).length}`);
  console.log(`  - Missions réservées : ${missions.filter(m => m.status === MissionStatus.RESERVED).length}`);
  console.log('\n💡 Prochaines étapes :');
  console.log('  1. Démarrez le backend : npm run start:dev');
  console.log('  2. Démarrez le frontend : npm run dev (dans le dossier racine)');
  console.log('  3. Connectez-vous avec votre compte Clerk');
  console.log('  4. Visitez http://localhost:3000/worker/dashboard');
  console.log('\n⚠️  Si vous voyez encore des erreurs 403 :');
  console.log('  - Vérifiez que CLERK_USER_ID correspond à votre vrai Clerk ID');
  console.log('  - Vérifiez les logs du backend : [DEV MODE] Worker profile missing');
  console.log('  - Relancez le seed avec le bon Clerk ID\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

