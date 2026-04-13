import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponseDto, ProfileRole } from './dto/profile-response.dto';
import { LocalUserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile-role.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.mapToProfileDto(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    this.logger.debug(
      `updateProfile called for userId=${userId} dto=${JSON.stringify(dto)}`,
    );

    try {
      const user = await this.prisma.localUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (dto.primaryRole !== undefined) {
        const mappedRole = this.mapProfileRoleToLocalUserRole(dto.primaryRole);
        if (mappedRole) {
          updateData.role = mappedRole;
        }
      }

      if (dto.fullName !== undefined) {
        // Store fullName by splitting into firstName/lastName
        const parts = dto.fullName.trim().split(/\s+/);
        updateData.firstName = parts[0] || '';
        updateData.lastName = parts.slice(1).join(' ') || '';
      }

      if (dto.phone !== undefined) {
        updateData.phone = dto.phone;
      }

      if (dto.city !== undefined) {
        updateData.city = dto.city;
      }

      const updated = await this.prisma.localUser.update({
        where: { id: userId },
        data: updateData,
      });

      return this.mapToProfileDto(updated);
    } catch (error) {
      this.logger.error(
        `updateProfile failed for userId=${userId} dto=${JSON.stringify(dto)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private mapToProfileDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    city: string | null;
    role: LocalUserRole;
    createdAt: Date;
    updatedAt: Date;
  }): ProfileResponseDto {
    const profileRole = this.mapLocalUserRoleToProfileRole(user.role);

    const dto = new ProfileResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = `${user.firstName} ${user.lastName}`.trim();
    dto.phone = user.phone ?? '';
    dto.city = user.city ?? '';
    dto.primaryRole = profileRole;
    dto.isWorker = profileRole === ProfileRole.WORKER;
    dto.isEmployer = profileRole === ProfileRole.EMPLOYER;
    dto.isClientResidential = profileRole === ProfileRole.CLIENT_RESIDENTIAL;

    return dto;
  }

  private mapLocalUserRoleToProfileRole(role: LocalUserRole): ProfileRole {
    switch (role) {
      case LocalUserRole.worker:
        return ProfileRole.WORKER;
      case LocalUserRole.employer:
        return ProfileRole.EMPLOYER;
      case LocalUserRole.residential_client:
        return ProfileRole.CLIENT_RESIDENTIAL;
      default:
        return ProfileRole.WORKER;
    }
  }

  private mapProfileRoleToLocalUserRole(role: ProfileRole): LocalUserRole | null {
    switch (role) {
      case ProfileRole.WORKER:
        return LocalUserRole.worker;
      case ProfileRole.EMPLOYER:
        return LocalUserRole.employer;
      case ProfileRole.CLIENT_RESIDENTIAL:
        return LocalUserRole.residential_client;
      case ProfileRole.ADMIN:
        // LocalUser doesn't have admin role, keep current
        return null;
      default:
        return null;
    }
  }
}
