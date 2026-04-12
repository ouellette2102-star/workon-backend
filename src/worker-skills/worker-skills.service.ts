import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkerSkillsService {
  private readonly logger = new Logger(WorkerSkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the authenticated worker's skills with full catalog details.
   */
  async getMySkills(userId: string) {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true, skills: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'worker') {
      throw new ForbiddenException('Only workers can manage skills');
    }

    if (!user.skills || user.skills.length === 0) {
      return [];
    }

    // Fetch full skill objects from catalog
    const skills = await this.prisma.skill.findMany({
      where: { id: { in: user.skills } },
      select: {
        id: true,
        name: true,
        nameEn: true,
        requiresPermit: true,
        proofType: true,
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            icon: true,
          },
        },
      },
    });

    return skills;
  }

  /**
   * Set (replace) the authenticated worker's skills.
   * Validates all skill IDs exist in the catalog.
   */
  async setMySkills(userId: string, skillIds: string[]) {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'worker') {
      throw new ForbiddenException('Only workers can manage skills');
    }

    // Deduplicate
    const uniqueIds = [...new Set(skillIds)];

    // Validate all skill IDs exist in catalog
    if (uniqueIds.length > 0) {
      const existingSkills = await this.prisma.skill.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingSkills.map((s) => s.id));
      const invalidIds = uniqueIds.filter((id) => !existingIds.has(id));

      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Invalid skill IDs: ${invalidIds.join(', ')}`,
        );
      }
    }

    // Update LocalUser.skills
    await this.prisma.localUser.update({
      where: { id: userId },
      data: { skills: uniqueIds },
    });

    this.logger.log(
      `User ${userId} updated skills: ${uniqueIds.length} skill(s)`,
    );

    // Return full skill objects
    return this.getMySkills(userId);
  }
}
