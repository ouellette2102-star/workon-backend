import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Platform Stats ──────────────────────────────────────

  async getStats() {
    const [
      activeWorkers,
      completedMissions,
      openMissions,
      sectorAgg,
      cityAgg,
      ratingAgg,
    ] = await Promise.all([
      this.prisma.localUser.count({
        where: { role: 'worker', active: true },
      }),
      this.prisma.localMission.count({
        where: { status: { in: ['completed', 'paid'] } },
      }),
      this.prisma.localMission.count({
        where: { status: 'open' },
      }),
      this.prisma.localUser.findMany({
        where: { role: 'worker', active: true, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
      this.prisma.localUser.findMany({
        where: { role: 'worker', active: true, city: { not: null } },
        select: { city: true },
        distinct: ['city'],
      }),
      this.prisma.review.aggregate({
        _avg: { rating: true },
      }),
    ]);

    return {
      activeWorkers,
      completedMissions,
      openMissions,
      sectorCount: sectorAgg.length,
      activeCities: cityAgg.length,
      averagePlatformRating: ratingAgg._avg.rating ?? 0,
    };
  }

  // ── Featured Workers ────────────────────────────────────

  async getFeaturedWorkers(limit: number) {
    const workers = await this.prisma.localUser.findMany({
      where: { role: 'worker', active: true },
      orderBy: [
        { completionScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        city: true,
        pictureUrl: true,
        category: true,
        trustTier: true,
        createdAt: true,
      },
    });

    // Batch fetch completed mission counts for all workers
    const workerIds = workers.map((w) => w.id);

    const missionCounts = await this.prisma.localMission.groupBy({
      by: ['assignedToUserId'],
      where: {
        assignedToUserId: { in: workerIds },
        status: { in: ['completed', 'paid'] },
      },
      _count: { id: true },
    });

    const missionCountMap = new Map(
      missionCounts.map((mc) => [mc.assignedToUserId, mc._count.id]),
    );

    return workers.map((w) => ({
      id: w.id,
      slug: w.slug ?? '',
      firstName: w.firstName,
      lastName: w.lastName,
      city: w.city ?? null,
      photoUrl: w.pictureUrl ?? null,
      sector: w.category ?? null,
      ratingAvg: 0,
      ratingCount: 0,
      completedMissions: missionCountMap.get(w.id) ?? 0,
      badges: this.deriveBadges(w.trustTier),
      trustTier: w.trustTier,
    }));
  }

  // ── Worker Profile by Slug ──────────────────────────────

  async getWorkerBySlug(slug: string) {
    const normalizedSlug = slug.toLowerCase().trim();
    const worker = await this.prisma.localUser.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        city: true,
        pictureUrl: true,
        category: true,
        bio: true,
        trustTier: true,
        createdAt: true,
        active: true,
        gallery: {
          orderBy: { sortOrder: 'asc' },
          select: { imageUrl: true },
        },
      },
    });

    if (!worker || !worker.active) {
      throw new NotFoundException('Worker not found');
    }

    const completedMissions = await this.prisma.localMission.count({
      where: {
        assignedToUserId: worker.id,
        status: { in: ['completed', 'paid'] },
      },
    });

    return {
      id: worker.id,
      slug: worker.slug ?? '',
      firstName: worker.firstName,
      lastName: worker.lastName,
      city: worker.city ?? null,
      photoUrl: worker.pictureUrl ?? null,
      sector: worker.category ?? null,
      ratingAvg: 0,
      ratingCount: 0,
      completedMissions,
      badges: this.deriveBadges(worker.trustTier),
      trustTier: worker.trustTier,
      bio: worker.bio ?? null,
      sectors: worker.category ? [worker.category] : [],
      memberSince: worker.createdAt.toISOString(),
      reviews: [],
      portfolioPhotos: worker.gallery.map((g) => g.imageUrl),
    };
  }

  // ── Featured Reviews ────────────────────────────────────

  async getFeaturedReviews(limit: number) {
    const reviews = await this.prisma.review.findMany({
      where: { moderation: 'OK' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        authorId: true,
        targetUserId: true,
        createdAt: true,
      },
    });

    // Reviews are linked to User (Clerk), not LocalUser.
    // Fetch UserProfile names for author/target User ids.
    const userIds = [
      ...new Set([
        ...reviews.map((r) => r.authorId),
        ...reviews.map((r) => r.targetUserId),
      ]),
    ];

    const profiles = userIds.length
      ? await this.prisma.userProfile.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, name: true },
        })
      : [];

    const nameMap = new Map(profiles.map((p) => [p.userId, p.name]));

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? '',
      authorName: nameMap.get(r.authorId) ?? null,
      workerName: nameMap.get(r.targetUserId) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ── Public Missions ─────────────────────────────────────

  async getPublicMissions(params: {
    category?: string;
    city?: string;
    page: number;
    limit: number;
  }) {
    const where: any = { status: 'open' };

    if (params.category) {
      where.category = { contains: params.category, mode: 'insensitive' };
    }
    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }

    const [missions, total] = await Promise.all([
      this.prisma.localMission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          city: true,
          price: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.localMission.count({ where }),
    ]);

    return {
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        city: m.city,
        priceRange: `$${m.price}`,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page: params.page,
    };
  }

  // ── Sector Stats ────────────────────────────────────────

  async getSectorStats() {
    const [missionGroups, workerGroups] = await Promise.all([
      this.prisma.localMission.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.localUser.groupBy({
        by: ['category'],
        where: { role: 'worker', active: true, category: { not: null } },
        _count: { id: true },
      }),
    ]);

    // Merge into a single map
    const statsMap = new Map<string, { missionCount: number; workerCount: number }>();

    for (const mg of missionGroups) {
      statsMap.set(mg.category, {
        missionCount: mg._count.id,
        workerCount: 0,
      });
    }

    for (const wg of workerGroups) {
      const cat = wg.category as string;
      const existing = statsMap.get(cat);
      if (existing) {
        existing.workerCount = wg._count.id;
      } else {
        statsMap.set(cat, { missionCount: 0, workerCount: wg._count.id });
      }
    }

    return Array.from(statsMap.entries()).map(([category, stats]) => ({
      category,
      missionCount: stats.missionCount,
      workerCount: stats.workerCount,
    }));
  }

  // ── Helpers ─────────────────────────────────────────────

  private deriveBadges(trustTier: string): { label: string; type: string }[] {
    const badges: { label: string; type: string }[] = [];

    switch (trustTier) {
      case 'PREMIUM':
        badges.push({ label: 'Premium', type: 'premium' });
        badges.push({ label: 'Identifie verifie', type: 'verified' });
        badges.push({ label: 'Telephone verifie', type: 'phone' });
        break;
      case 'TRUSTED':
        badges.push({ label: 'Identifie verifie', type: 'verified' });
        badges.push({ label: 'Telephone verifie', type: 'phone' });
        break;
      case 'VERIFIED':
        badges.push({ label: 'Telephone verifie', type: 'phone' });
        break;
      default:
        break;
    }

    return badges;
  }
}
