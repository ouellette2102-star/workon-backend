import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Payload for chat message push notification.
 */
export interface ChatMessagePushPayload {
  conversationId: string;
  missionId: string;
  senderName: string;
  preview: string;
}

/**
 * Service for sending push notifications via Firebase Cloud Messaging.
 *
 * PR-PUSH: Initial implementation for chat notifications.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  /**
   * Initializes Firebase Admin SDK.
   *
   * Uses GOOGLE_APPLICATION_CREDENTIALS env var or
   * FIREBASE_SERVICE_ACCOUNT_JSON for the service account.
   */
  private initializeFirebase(): void {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        this.logger.log('Firebase Admin already initialized');
        return;
      }

      // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS file path
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin initialized with application default credentials');
        return;
      }

      // Option 2: Use FIREBASE_SERVICE_ACCOUNT_JSON env var (base64 encoded)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8'),
          );
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.initialized = true;
          this.logger.log('Firebase Admin initialized with service account JSON');
          return;
        } catch (parseError) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', parseError);
        }
      }

      // Option 3: Use individual env vars
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin initialized with individual env vars');
        return;
      }

      this.logger.warn(
        'Firebase Admin not initialized: no credentials found. ' +
          'Push notifications will be disabled. ' +
          'Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_JSON, ' +
          'or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.',
      );
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  /**
   * Returns true if Firebase is initialized and ready.
   */
  get isReady(): boolean {
    return this.initialized;
  }

  /**
   * Sends a chat message push notification.
   *
   * @param tokens - FCM device tokens to send to
   * @param payload - Chat message payload
   */
  async sendChatMessageNotification(
    tokens: string[],
    payload: ChatMessagePushPayload,
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('Push skipped: Firebase not initialized');
      return;
    }

    if (!tokens.length) {
      this.logger.debug('Push skipped: no tokens');
      return;
    }

    const title = `Message de ${payload.senderName}`;
    const body = payload.preview.length > 100
      ? `${payload.preview.substring(0, 97)}...`
      : payload.preview;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        type: 'message',
        conversationId: payload.conversationId,
        missionId: payload.missionId,
        senderName: payload.senderName,
        preview: payload.preview,
      },
      android: {
        notification: {
          channelId: 'chat_messages',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      this.logger.debug(`Sending push to ${tokens.length} device(s)`);
      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Push sent: ${response.successCount} success, ${response.failureCount} failed`,
      );

      // Log failures for debugging
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.warn(
              `Push failed for token[${idx}]: ${resp.error?.message}`,
            );
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }
  }

  /**
   * Sends a generic push notification.
   *
   * @param tokens - FCM device tokens
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Custom data payload
   */
  async sendNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('Push skipped: Firebase not initialized');
      return;
    }

    if (!tokens.length) {
      this.logger.debug('Push skipped: no tokens');
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Push sent: ${response.successCount} success, ${response.failureCount} failed`,
      );
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }
  }
}

