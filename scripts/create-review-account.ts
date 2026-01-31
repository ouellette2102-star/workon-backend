/**
 * Create Review Account for App Store / Play Store Review
 * 
 * This script creates a test account for Apple/Google reviewers.
 * Account: review@workon.app / Review2026!
 * 
 * Run: npx ts-node scripts/create-review-account.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Review account credentials
const REVIEW_ACCOUNT = {
  email: 'review@workon.app',
  password: 'Review2026!',
  firstName: 'App',
  lastName: 'Reviewer',
  phone: '+15145550123',
};

async function main() {
  console.log('🔐 Creating review account for App Store / Play Store...\n');

  // Check if account already exists
  const existing = await prisma.user.findUnique({
    where: { email: REVIEW_ACCOUNT.email },
  });

  if (existing) {
    console.log(`⚠️  Account ${REVIEW_ACCOUNT.email} already exists.`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Created: ${existing.createdAt}`);
    
    // Update password to ensure it's correct
    const hashedPassword = await bcrypt.hash(REVIEW_ACCOUNT.password, 10);
    await prisma.user.update({
      where: { id: existing.id },
      data: { 
        passwordHash: hashedPassword,
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`   ✅ Password reset to: ${REVIEW_ACCOUNT.password}`);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(REVIEW_ACCOUNT.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      id: `user_review_${Date.now()}`,
      email: REVIEW_ACCOUNT.email,
      passwordHash: hashedPassword,
      firstName: REVIEW_ACCOUNT.firstName,
      lastName: REVIEW_ACCOUNT.lastName,
      phone: REVIEW_ACCOUNT.phone,
      role: 'CLIENT', // Can be both client and worker
      isActive: true,
      emailVerified: true,
      // Consent for compliance
      consentGiven: true,
      consentDate: new Date(),
    },
  });

  console.log('✅ Review account created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    ', REVIEW_ACCOUNT.email);
  console.log('🔑 Password: ', REVIEW_ACCOUNT.password);
  console.log('👤 Name:     ', `${REVIEW_ACCOUNT.firstName} ${REVIEW_ACCOUNT.lastName}`);
  console.log('🆔 User ID:  ', user.id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Use these credentials in App Store Connect / Play Console');
  console.log('   for the "Demo Account" field during app review.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating review account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
