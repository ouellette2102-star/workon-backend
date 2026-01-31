/**
 * Seed du compte de test pour Apple/Google Store Review
 * 
 * Ce script crée le compte `review@workon.app` avec des données
 * de démonstration réalistes pour les reviewers des stores.
 * 
 * UTILISATION :
 *   npx ts-node prisma/seed.review.ts
 * 
 * IMPORTANT :
 * - Ce compte est pour les reviewers Apple App Store et Google Play
 * - Le mot de passe est simple pour faciliter le test
 * - Les données sont réalistes mais fictives
 */

import { PrismaClient, MissionStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION DU COMPTE DE TEST REVIEW
// ═══════════════════════════════════════════════════════════════════════════

const REVIEW_ACCOUNT = {
  clerkId: 'review_store_account_2026',
  name: 'App Reviewer',
  phone: '+1 514 555 0199',
  city: 'Montréal',
};

// Identifiants à fournir aux reviewers
const REVIEW_CREDENTIALS = {
  email: 'review@workon.app',
  password: 'WorkOn2026!',
};

// ═══════════════════════════════════════════════════════════════════════════

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function main() {
  console.log('🍎 WorkOn Store Review Account Seed');
  console.log('====================================\n');

  // 1️⃣ Créer l'utilisateur reviewer
  console.log('📝 Création du compte de test...');
  
  const reviewUser = await prisma.user.upsert({
    where: { clerkId: REVIEW_ACCOUNT.clerkId },
    update: {
      updatedAt: new Date(),
    },
    create: {
      id: generateId('user'),
      clerkId: REVIEW_ACCOUNT.clerkId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Utilisateur créé (ID: ${reviewUser.id})`);

  // 2️⃣ Créer le UserProfile
  console.log('\n👤 Création du profil utilisateur...');
  
  const userProfile = await prisma.userProfile.upsert({
    where: { userId: reviewUser.id },
    update: {
      name: REVIEW_ACCOUNT.name,
      phone: REVIEW_ACCOUNT.phone,
      city: REVIEW_ACCOUNT.city,
      updatedAt: new Date(),
    },
    create: {
      userId: reviewUser.id,
      role: UserRole.EMPLOYER, // Rôle employer pour créer/voir des missions
      name: REVIEW_ACCOUNT.name,
      phone: REVIEW_ACCOUNT.phone,
      city: REVIEW_ACCOUNT.city,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Profil créé: ${userProfile.name}`);

  // 3️⃣ Récupérer une catégorie existante
  console.log('\n📁 Récupération des catégories...');
  
  const categories = await prisma.category.findMany({ take: 5 });
  
  if (categories.length === 0) {
    console.log('⚠️  Aucune catégorie trouvée. Exécutez d\'abord: npm run seed');
    console.log('   Les missions ne seront pas créées.');
  } else {
    console.log(`✅ ${categories.length} catégories disponibles`);

    // 4️⃣ Créer des missions de démonstration
    console.log('\n🎯 Création de missions de démonstration...');

    const now = new Date();
    const missions = [
      {
        title: 'Ménage appartement Plateau',
        description: 'Grand ménage d\'un appartement 4½ sur le Plateau Mont-Royal. Inclut cuisine, salle de bain et planchers.',
        categoryId: categories[0]?.id,
        locationLat: 45.5211,
        locationLng: -73.5897,
        locationAddress: '4567 avenue du Parc, Montréal',
        priceType: 'FIXED',
        budgetMin: 80,
        budgetMax: 120,
        startAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        status: MissionStatus.OPEN,
      },
      {
        title: 'Déménagement studio Griffintown',
        description: 'Aide pour déménager un studio. Environ 20 boîtes + meubles de base (lit, bureau, canapé).',
        categoryId: categories[1]?.id || categories[0]?.id,
        locationLat: 45.4892,
        locationLng: -73.5569,
        locationAddress: '1200 rue Ottawa, Montréal',
        priceType: 'FIXED',
        budgetMin: 150,
        budgetMax: 200,
        startAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        status: MissionStatus.OPEN,
      },
      {
        title: 'Tonte de gazon Ahuntsic',
        description: 'Tonte de gazon pour un terrain résidentiel de taille moyenne. Tondeuse fournie.',
        categoryId: categories[2]?.id || categories[0]?.id,
        locationLat: 45.5533,
        locationLng: -73.6591,
        locationAddress: '9800 rue Lajeunesse, Montréal',
        priceType: 'FIXED',
        budgetMin: 40,
        budgetMax: 60,
        startAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        status: MissionStatus.OPEN,
      },
      {
        title: 'Montage meubles IKEA',
        description: 'Montage de 3 meubles IKEA (armoire PAX, bureau MALM, étagère KALLAX). Outils fournis.',
        categoryId: categories[3]?.id || categories[0]?.id,
        locationLat: 45.5649,
        locationLng: -73.7458,
        locationAddress: '3000 boulevard Le Carrefour, Laval',
        priceType: 'FIXED',
        budgetMin: 75,
        budgetMax: 100,
        startAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        status: MissionStatus.OPEN,
      },
      {
        title: 'Livraison colis Vieux-Port',
        description: 'Livraison de 5 colis moyens au Vieux-Port. Véhicule fourni si nécessaire.',
        categoryId: categories[4]?.id || categories[0]?.id,
        locationLat: 45.5048,
        locationLng: -73.5538,
        locationAddress: '333 rue de la Commune, Montréal',
        priceType: 'FIXED',
        budgetMin: 35,
        budgetMax: 50,
        startAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        status: MissionStatus.OPEN,
      },
    ];

    for (const missionData of missions) {
      if (!missionData.categoryId) continue;
      
      const mission = await prisma.mission.create({
        data: {
          id: generateId('mission'),
          authorClientId: reviewUser.id,
          title: missionData.title,
          description: missionData.description,
          categoryId: missionData.categoryId,
          requiredSkills: [],
          locationLat: missionData.locationLat,
          locationLng: missionData.locationLng,
          locationAddress: missionData.locationAddress,
          priceType: missionData.priceType,
          budgetMin: missionData.budgetMin,
          budgetMax: missionData.budgetMax,
          status: missionData.status,
          startAt: missionData.startAt,
          endAt: missionData.endAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Mission créée: "${mission.title}" - ${mission.budgetMin}$-${mission.budgetMax}$`);
    }
  }

  // 5️⃣ Créer un worker fictif avec un bon profil
  console.log('\n👷 Création d\'un worker de démonstration...');

  const workerUser = await prisma.user.upsert({
    where: { clerkId: 'demo_worker_jean_2026' },
    update: {},
    create: {
      id: generateId('user'),
      clerkId: 'demo_worker_jean_2026',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      role: UserRole.WORKER,
      name: 'Jean Tremblay',
      phone: '+1 514 555 0101',
      city: 'Montréal',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const workerProfile = await prisma.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      id: generateId('worker'),
      userId: workerUser.id,
      hourlyRate: 28.0,
      residentialEnabled: true,
      completedMissions: 47,
      totalEarnings: 3850.0,
      serviceAreas: { cities: ['Montréal', 'Laval', 'Longueuil'] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Worker créé: Jean Tremblay (${workerProfile.completedMissions} missions complétées)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ FINAL
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n====================================');
  console.log('🎉 COMPTE DE TEST CRÉÉ AVEC SUCCÈS !');
  console.log('====================================\n');
  
  console.log('📱 IDENTIFIANTS POUR STORE REVIEW :');
  console.log('────────────────────────────────────');
  console.log(`   Email    : ${REVIEW_CREDENTIALS.email}`);
  console.log(`   Password : ${REVIEW_CREDENTIALS.password}`);
  console.log('────────────────────────────────────\n');
  
  console.log('⚠️  NOTE: Ces identifiants doivent être configurés');
  console.log('   dans Clerk Dashboard pour fonctionner.\n');
  
  console.log('📊 Données de démonstration :');
  console.log(`   - Missions disponibles : 5`);
  console.log(`   - Worker avec profil   : 1`);
  console.log(`   - Villes couvertes     : Montréal, Laval\n`);
  
  console.log('💡 IMPORTANT pour la soumission :');
  console.log('   1. Créer le compte dans Clerk avec ces identifiants');
  console.log('   2. Ajouter ces identifiants dans App Store Connect');
  console.log('      Section "App Review Information" → Demo Account');
  console.log('   3. Même chose pour Google Play Console\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
