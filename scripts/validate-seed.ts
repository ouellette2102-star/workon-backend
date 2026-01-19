#!/usr/bin/env ts-node
/**
 * Seed Validation Script
 * PR-05: DB Freeze & Migration Safety
 *
 * Validates seed data integrity:
 * - JSON files are valid
 * - Required fields are present
 * - References are consistent (skills -> categories)
 * - No duplicate entries
 *
 * Usage:
 *   npm run db:validate-seed
 *   npx ts-node scripts/validate-seed.ts
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Validation errors
 *   2 = File not found
 */

import * as fs from 'fs';
import * as path from 'path';

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

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

function validateCategories(): ValidationResult {
  const filePath = path.join(__dirname, '..', 'prisma', 'data', 'categories.json');
  const result: ValidationResult = {
    file: 'categories.json',
    valid: true,
    errors: [],
    warnings: [],
    stats: {},
  };

  // Check file exists
  if (!fs.existsSync(filePath)) {
    result.valid = false;
    result.errors.push('File not found');
    return result;
  }

  // Parse JSON
  let categories: CategoryData[];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    categories = JSON.parse(content);
  } catch (e) {
    result.valid = false;
    result.errors.push(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
    return result;
  }

  // Validate array
  if (!Array.isArray(categories)) {
    result.valid = false;
    result.errors.push('Root element must be an array');
    return result;
  }

  result.stats.total = categories.length;

  // Check for duplicates
  const names = new Set<string>();
  for (const cat of categories) {
    if (names.has(cat.name)) {
      result.errors.push(`Duplicate category name: "${cat.name}"`);
      result.valid = false;
    }
    names.add(cat.name);
  }

  // Validate each category
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];

    if (!cat.name || typeof cat.name !== 'string') {
      result.errors.push(`Category[${i}]: missing or invalid "name"`);
      result.valid = false;
    }

    if (typeof cat.residentialAllowed !== 'boolean') {
      result.warnings.push(`Category[${i}] "${cat.name}": "residentialAllowed" should be boolean`);
    }
  }

  result.stats.valid = result.valid ? categories.length : 0;

  return result;
}

function validateSkills(categoryNames: Set<string>): ValidationResult {
  const filePath = path.join(__dirname, '..', 'prisma', 'data', 'skills.json');
  const result: ValidationResult = {
    file: 'skills.json',
    valid: true,
    errors: [],
    warnings: [],
    stats: {},
  };

  // Check file exists
  if (!fs.existsSync(filePath)) {
    result.valid = false;
    result.errors.push('File not found');
    return result;
  }

  // Parse JSON
  let skills: SkillData[];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    skills = JSON.parse(content);
  } catch (e) {
    result.valid = false;
    result.errors.push(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
    return result;
  }

  // Validate array
  if (!Array.isArray(skills)) {
    result.valid = false;
    result.errors.push('Root element must be an array');
    return result;
  }

  result.stats.total = skills.length;

  // Check for duplicates (name + categoryName)
  const seen = new Set<string>();
  const categoryUsage = new Map<string, number>();

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const key = `${skill.name}::${skill.categoryName}`;

    if (seen.has(key)) {
      result.errors.push(`Duplicate skill: "${skill.name}" in category "${skill.categoryName}"`);
      result.valid = false;
    }
    seen.add(key);

    // Validate required fields
    if (!skill.name || typeof skill.name !== 'string') {
      result.errors.push(`Skill[${i}]: missing or invalid "name"`);
      result.valid = false;
    }

    if (!skill.categoryName || typeof skill.categoryName !== 'string') {
      result.errors.push(`Skill[${i}] "${skill.name}": missing "categoryName"`);
      result.valid = false;
    } else if (!categoryNames.has(skill.categoryName)) {
      result.errors.push(`Skill[${i}] "${skill.name}": unknown category "${skill.categoryName}"`);
      result.valid = false;
    } else {
      // Track category usage
      categoryUsage.set(skill.categoryName, (categoryUsage.get(skill.categoryName) || 0) + 1);
    }

    if (typeof skill.requiresPermit !== 'boolean') {
      result.warnings.push(`Skill[${i}] "${skill.name}": "requiresPermit" should be boolean`);
    }
  }

  // Check for unused categories
  for (const catName of categoryNames) {
    if (!categoryUsage.has(catName)) {
      result.warnings.push(`Category "${catName}" has no skills`);
    }
  }

  result.stats.valid = result.valid ? skills.length : 0;
  result.stats.categoriesUsed = categoryUsage.size;

  return result;
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('  Seed Data Validation');
  console.log('  PR-05: DB Freeze & Migration Safety');
  console.log('========================================');
  console.log('');

  const results: ValidationResult[] = [];

  // Validate categories first
  const categoriesResult = validateCategories();
  results.push(categoriesResult);

  // Extract category names for skills validation
  const categoryNames = new Set<string>();
  if (categoriesResult.valid) {
    const filePath = path.join(__dirname, '..', 'prisma', 'data', 'categories.json');
    const categories: CategoryData[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    categories.forEach((c) => categoryNames.add(c.name));
  }

  // Validate skills
  const skillsResult = validateSkills(categoryNames);
  results.push(skillsResult);

  // Print results
  let allValid = true;

  for (const result of results) {
    const icon = result.valid ? '✅' : '❌';
    console.log(`${icon} ${result.file}`);

    if (Object.keys(result.stats).length > 0) {
      console.log(`   Stats: ${JSON.stringify(result.stats)}`);
    }

    for (const error of result.errors) {
      console.log(`   🚨 ERROR: ${error}`);
    }

    for (const warning of result.warnings) {
      console.log(`   ⚠️  WARNING: ${warning}`);
    }

    if (!result.valid) {
      allValid = false;
    }

    console.log('');
  }

  // Summary
  console.log('========================================');
  console.log('  SUMMARY');
  console.log('========================================');

  const totalErrors = results.flatMap((r) => r.errors).length;
  const totalWarnings = results.flatMap((r) => r.warnings).length;

  console.log(`Files checked:  ${results.length}`);
  console.log(`Errors:         ${totalErrors}`);
  console.log(`Warnings:       ${totalWarnings}`);
  console.log('');

  if (allValid) {
    console.log('✅ Seed data is valid');
    console.log('');
    console.log('To seed the database:');
    console.log('  npm run seed');
    process.exit(0);
  } else {
    console.log('❌ SEED VALIDATION FAILED');
    console.log('');
    console.log('Fix the errors above before seeding.');
    process.exit(1);
  }
}

main();

