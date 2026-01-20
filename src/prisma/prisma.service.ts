import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Logging des requêtes Prisma (désactivable en production)
    this.$on('query' as never, (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
      }
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`);
    });
  }

  async onModuleInit() {
    // RAILWAY FIX: Ne pas bloquer le boot avec $connect()
    // Prisma se connectera automatiquement à la première requête (lazy connection)
    // Cela permet au healthcheck /health de répondre immédiatement
    this.logger.log('Prisma initialized (lazy connection - will connect on first query)');
    
    // Tentative de connexion en arrière-plan (non-bloquante)
    // Si échec, le serveur reste UP et la connexion sera retentée à la première requête
    this.$connect()
      .then(() => this.logger.log('Database connection established'))
      .catch((error) => {
        this.logger.warn('Initial database connection failed, will retry on first query', error);
        // NE PAS throw - permet au serveur de démarrer
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Helper pour transactions
   */
  async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }
}

