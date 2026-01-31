#!/usr/bin/env node
/**
 * Seed Catalog Script (Production-ready)
 * 
 * Seeds categories and skills from JSON files.
 * Can be run in production without ts-node.
 * 
 * Usage: node scripts/seed-catalog.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function log(message) {
  console.log(`[seed-catalog] ${message}`);
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function seedCategories() {
  const dataPath = path.join(__dirname, '..', 'prisma', 'data', 'categories.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Missing file: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const categories = JSON.parse(rawData);

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('categories.json is empty or invalid');
  }

  log(`Seeding ${categories.length} categories...`);

  const categoryMap = new Map();

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { name: cat.name },
    });

    let category;
    if (existing) {
      category = await prisma.category.update({
        where: { name: cat.name },
        data: {
          nameEn: cat.nameEn,
          icon: cat.icon,
          residentialAllowed: cat.residentialAllowed,
          legalNotes: cat.legalNotes,
        },
      });
      log(`  ✅ Category updated: ${cat.name}`);
    } else {
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
      log(`  ✅ Category created: ${cat.name}`);
    }

    categoryMap.set(cat.name, category.id);
  }

  return categoryMap;
}

async function seedSkills(categoryMap) {
  const dataPath = path.join(__dirname, '..', 'prisma', 'data', 'skills.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Missing file: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const skills = JSON.parse(rawData);

  if (!Array.isArray(skills) || skills.length === 0) {
    throw new Error('skills.json is empty or invalid');
  }

  log(`Seeding ${skills.length} skills...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const skill of skills) {
    const categoryId = categoryMap.get(skill.categoryName);
    
    if (!categoryId) {
      log(`  ⚠️ Skipping skill "${skill.name}" - category "${skill.categoryName}" not found`);
      skipped++;
      continue;
    }

    const existing = await prisma.skill.findFirst({
      where: { 
        name: skill.name,
        categoryId: categoryId,
      },
    });

    if (existing) {
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          nameEn: skill.nameEn,
          requiresPermit: skill.requiresPermit,
          proofType: skill.proofType,
        },
      });
      updated++;
    } else {
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
      created++;
    }
  }

  log(`  ✅ Skills: ${created} created, ${updated} updated, ${skipped} skipped`);
  return created + updated;
}

async function verifySeed() {
  const categoryCount = await prisma.category.count();
  const skillCount = await prisma.skill.count();
  
  log(`\n📊 Verification:`);
  log(`  Categories: ${categoryCount}`);
  log(`  Skills: ${skillCount}`);
  
  return { categoryCount, skillCount };
}

async function main() {
  log('Starting catalog seed...');
  
  try {
    const categoryMap = await seedCategories();
    await seedSkills(categoryMap);
    const { categoryCount, skillCount } = await verifySeed();
    
    if (categoryCount > 0 && skillCount > 0) {
      log('\n✅ Catalog seed completed successfully!');
    } else {
      log('\n⚠️ Seed completed but counts are low');
    }
  } catch (error) {
    log(`\n❌ Seed failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
