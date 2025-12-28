import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Types pour les données JSON
interface CategoryData {
  name: string;
  nameEn: string | null;
  icon: string | null;
  residentialAllowed: boolean;
  legalNotes: string | null;
}

interface SkillData {
  name: string;
  nameEn: string | null;
  categoryName: string;
  requiresPermit: boolean;
  proofType: string | null;
}

/**
 * Génère un ID unique pour les entités
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Seed les catégories depuis categories.json
 */
async function seedCategories(): Promise<Map<string, string>> {
  const dataPath = path.join(__dirname, 'data', 'categories.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ Fichier manquant: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const categories: CategoryData[] = JSON.parse(rawData);

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('❌ categories.json est vide ou invalide');
  }

  console.log(`\n📁 Seeding ${categories.length} categories...`);

  // Map pour stocker name -> id (pour les skills)
  const categoryMap = new Map<string, string>();

  for (const cat of categories) {
    // Chercher si la catégorie existe déjà
    const existing = await prisma.category.findUnique({
      where: { name: cat.name },
    });

    let category;
    if (existing) {
      // Update
      category = await prisma.category.update({
        where: { name: cat.name },
        data: {
          nameEn: cat.nameEn,
          icon: cat.icon,
          residentialAllowed: cat.residentialAllowed,
          legalNotes: cat.legalNotes,
        },
      });
      console.log(`  ✅ Category updated: ${cat.name}`);
    } else {
      // Create
      category = await prisma.category.create({
        data: {
          id: generateId('cat'),
          name: cat.name,
          nameEn: cat.nameEn,
          icon: cat.icon,
          residentialAllowed: cat.residentialAllowed,
          legalNotes: cat.legalNotes,
        },
      });
      console.log(`  ✅ Category created: ${cat.name}`);
    }

    categoryMap.set(cat.name, category.id);
  }

  console.log(`\n✅ Categories seeded: ${categories.length}`);
  return categoryMap;
}

/**
 * Seed les skills depuis skills.json
 */
async function seedSkills(categoryMap: Map<string, string>): Promise<number> {
  const dataPath = path.join(__dirname, 'data', 'skills.json');

  if (!fs.existsSync(dataPath)) {
    console.log(`\n⚠️  Fichier skills.json manquant: ${dataPath}`);
    console.log('   Créez prisma/data/skills.json avec les 90 métiers officiels.');
    throw new Error('skills.json manquant: fournir la liste officielle des 90 métiers/skills pour terminer PR#1.');
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const skills: SkillData[] = JSON.parse(rawData);

  if (!Array.isArray(skills)) {
    throw new Error('❌ skills.json doit être un tableau JSON');
  }

  if (skills.length === 0) {
    console.log('\n⚠️  skills.json est vide.');
    console.log('   📝 Format attendu dans prisma/data/skills.json:');
    console.log('   [');
    console.log('     {');
    console.log('       "name": "Nom du métier (FR)",');
    console.log('       "nameEn": "Job name (EN)",');
    console.log('       "categoryName": "Nom de la catégorie",');
    console.log('       "requiresPermit": true | false,');
    console.log('       "proofType": "Type de preuve" | null');
    console.log('     }');
    console.log('   ]');
    console.log('\n   📁 Catégories disponibles:');
    Array.from(categoryMap.keys()).forEach((catName) => {
      console.log(`      - ${catName}`);
    });
    throw new Error('skills.json est vide: fournir la liste officielle des 90 métiers/skills pour terminer PR#1.');
  }

  console.log(`\n📁 Seeding ${skills.length} skills...`);

  let seededCount = 0;

  for (const skill of skills) {
    // Résoudre categoryId via categoryName
    const categoryId = categoryMap.get(skill.categoryName);
    
    if (!categoryId) {
      throw new Error(
        `❌ Catégorie inconnue "${skill.categoryName}" pour le skill "${skill.name}". ` +
        `Catégories valides: ${Array.from(categoryMap.keys()).join(', ')}`
      );
    }

    // Upsert via la contrainte unique (name, categoryId)
    const existing = await prisma.skill.findFirst({
      where: {
        name: skill.name,
        categoryId: categoryId,
      },
    });

    if (existing) {
      // Update
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          nameEn: skill.nameEn,
          requiresPermit: skill.requiresPermit,
          proofType: skill.proofType,
        },
      });
      console.log(`  ✅ Skill updated: ${skill.name} (${skill.categoryName})`);
    } else {
      // Create
      await prisma.skill.create({
        data: {
          id: generateId('skill'),
          name: skill.name,
          nameEn: skill.nameEn,
          categoryId: categoryId,
          requiresPermit: skill.requiresPermit,
          proofType: skill.proofType,
        },
      });
      console.log(`  ✅ Skill created: ${skill.name} (${skill.categoryName})`);
    }

    seededCount++;
  }

  console.log(`\n✅ Skills seeded: ${seededCount}`);
  return seededCount;
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 WorkOn Catalogue Seed');
  console.log('========================\n');

  // 1. Seed catégories (obligatoire)
  const categoryMap = await seedCategories();

  // 2. Seed skills (bloque si vide)
  const skillsCount = await seedSkills(categoryMap);

  // Résumé final
  console.log('\n========================');
  console.log('🎉 Seed completed successfully!');
  console.log('========================');
  console.log(`📊 Summary:`);
  console.log(`   - Categories: ${categoryMap.size}`);
  console.log(`   - Skills: ${skillsCount}`);
  console.log('\n💡 Verify with: npx prisma studio');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n❌ Seed failed:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
