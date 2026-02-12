import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCategoriesQueryDto } from './dto/get-categories.query.dto';
import { GetSkillsQueryDto } from './dto/get-skills.query.dto';
import {
  CatalogHealthResponseDto,
} from './dto/catalog.responses';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all categories with optional filtering
   */
  async getCategories(query: GetCategoriesQueryDto) {
    const { includeResidential } = query;

    // Build where clause
    const where: any = {};

    if (includeResidential === 'true') {
      where.residentialAllowed = true;
    } else if (includeResidential === 'false') {
      where.residentialAllowed = false;
    }
    // 'all' = no filter

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        icon: true,
        legalNotes: true,
        residentialAllowed: true,
        createdAt: true,
      },
    });

    this.logger.debug(`Found ${categories.length} categories`);
    return categories;
  }

  /**
   * Get skills with filtering and pagination
   */
  async getSkills(query: GetSkillsQueryDto) {
    const {
      categoryName,
      requiresPermit,
      proofType,
      q,
      page = 1,
      pageSize = 50,
      sort = 'name',
      order = 'asc',
    } = query;

    // Build where clause
    const where: any = {};

    // Filter by category name (via relation)
    if (categoryName) {
      where.category = {
        name: categoryName,
      };
    }

    // Filter by requiresPermit
    if (requiresPermit !== undefined) {
      where.requiresPermit = requiresPermit;
    }

    // Filter by proofType
    if (proofType) {
      where.proofType = proofType;
    }

    // Search query (case-insensitive on name + nameEn)
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Count total
    const total = await this.prisma.skill.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Build orderBy
    const orderBy: any = {};
    orderBy[sort] = order;

    // Fetch skills
    const skills = await this.prisma.skill.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        name: true,
        nameEn: true,
        categoryId: true,
        requiresPermit: true,
        proofType: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            icon: true,
            residentialAllowed: true,
          },
        },
      },
    });

    this.logger.debug(
      `Found ${skills.length} skills (page ${page}/${totalPages}, total: ${total})`,
    );

    return {
      data: skills,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get catalog health status
   */
  async getHealth(): Promise<CatalogHealthResponseDto> {
    const [categoriesCount, skillsCount] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.skill.count(),
    ]);

    return {
      categoriesCount,
      skillsCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Seed catalog from JSON files (admin only)
   * Idempotent: safe to run multiple times
   */
  async seedCatalog(): Promise<{
    categories: { created: number; updated: number };
    skills: { created: number; updated: number; skipped: number };
    timestamp: string;
  }> {
    this.logger.log('Starting catalog seed...');

    // Find data directory (handle both dev and production paths)
    const possiblePaths = [
      path.join(process.cwd(), 'prisma', 'data'),
      path.join(__dirname, '..', '..', 'prisma', 'data'),
      path.join(__dirname, '..', '..', '..', 'prisma', 'data'),
    ];

    let dataDir: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'categories.json'))) {
        dataDir = p;
        break;
      }
    }

    if (!dataDir) {
      throw new Error('Catalog data files not found');
    }

    this.logger.log(`Using data directory: ${dataDir}`);

    // Seed categories
    const categoriesPath = path.join(dataDir, 'categories.json');
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
    
    const categoryMap = new Map<string, string>();
    let catCreated = 0;
    let catUpdated = 0;

    for (const cat of categoriesData) {
      const existing = await this.prisma.category.findUnique({
        where: { name: cat.name },
      });

      if (existing) {
        await this.prisma.category.update({
          where: { name: cat.name },
          data: {
            nameEn: cat.nameEn,
            icon: cat.icon,
            residentialAllowed: cat.residentialAllowed,
            legalNotes: cat.legalNotes,
          },
        });
        categoryMap.set(cat.name, existing.id);
        catUpdated++;
      } else {
        const created = await this.prisma.category.create({
          data: {
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: cat.name,
            nameEn: cat.nameEn,
            icon: cat.icon,
            residentialAllowed: cat.residentialAllowed,
            legalNotes: cat.legalNotes,
          },
        });
        categoryMap.set(cat.name, created.id);
        catCreated++;
      }
    }

    this.logger.log(`Categories: ${catCreated} created, ${catUpdated} updated`);

    // Seed skills
    const skillsPath = path.join(dataDir, 'skills.json');
    const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));

    let skillCreated = 0;
    let skillUpdated = 0;
    let skillSkipped = 0;

    for (const skill of skillsData) {
      const categoryId = categoryMap.get(skill.categoryName);

      if (!categoryId) {
        this.logger.warn(`Skipping skill "${skill.name}" - category "${skill.categoryName}" not found`);
        skillSkipped++;
        continue;
      }

      const existing = await this.prisma.skill.findFirst({
        where: {
          name: skill.name,
          categoryId: categoryId,
        },
      });

      if (existing) {
        await this.prisma.skill.update({
          where: { id: existing.id },
          data: {
            nameEn: skill.nameEn,
            requiresPermit: skill.requiresPermit,
            proofType: skill.proofType,
          },
        });
        skillUpdated++;
      } else {
        await this.prisma.skill.create({
          data: {
            id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: skill.name,
            nameEn: skill.nameEn,
            categoryId: categoryId,
            requiresPermit: skill.requiresPermit,
            proofType: skill.proofType,
          },
        });
        skillCreated++;
      }
    }

    this.logger.log(`Skills: ${skillCreated} created, ${skillUpdated} updated, ${skillSkipped} skipped`);

    // Verify
    const [categoriesCount, skillsCount] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.skill.count(),
    ]);

    this.logger.log(`Seed complete. Total: ${categoriesCount} categories, ${skillsCount} skills`);

    return {
      categories: { created: catCreated, updated: catUpdated },
      skills: { created: skillCreated, updated: skillUpdated, skipped: skillSkipped },
      timestamp: new Date().toISOString(),
    };
  }
}
