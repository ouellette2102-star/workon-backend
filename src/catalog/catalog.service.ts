import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCategoriesQueryDto } from './dto/get-categories.query.dto';
import { GetSkillsQueryDto } from './dto/get-skills.query.dto';
import {
  CatalogHealthResponseDto,
} from './dto/catalog.responses';

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
}
