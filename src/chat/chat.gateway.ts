import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesLocalService } from '../messages-local/messages-local.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * WebSocket Gateway for real-time chat.
 *
 * Clients connect with JWT token, join mission rooms,
 * and receive messages in real-time.
 *
 * Events:
 * - connect: authenticate via token query param
 * - join_mission: join a mission chat room
 * - send_message: send a message (persisted + broadcast)
 * - typing: broadcast typing indicator
 * - message_read: mark messages as read
 *
 * Server emits:
 * - new_message: new message in a joined room
 * - user_typing: someone is typing
 * - messages_read: read receipt
 * - error: error message
 */
@WebSocketGateway({
  cors: {
    origin: (() => {
      const frontendUrl = process.env.FRONTEND_URL;
      const corsOrigin = process.env.CORS_ORIGIN;
      if (process.env.NODE_ENV === 'production') {
        if (!frontendUrl && !corsOrigin) {
          // Fail-closed in production — same as HTTP CORS in main.ts
          return 'https://workonapp.vercel.app';
        }
        return frontendUrl || corsOrigin;
      }
      return frontendUrl || 'http://localhost:3000';
    })(),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesLocalService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.query.token as string
        || client.handshake.auth?.token as string;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.userId || payload.sub;

      // Track connected sockets per user
      if (!this.connectedUsers.has(client.userId!)) {
        this.connectedUsers.set(client.userId!, new Set());
      }
      this.connectedUsers.get(client.userId!)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${client.userId})`);
    } catch (err) {
      this.logger.warn(`Client ${client.id} auth failed: ${err instanceof Error ? err.message : 'unknown'}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.connectedUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_mission')
  async handleJoinMission(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { missionId: string },
  ) {
    if (!client.userId) return;

    const room = `mission:${data.missionId}`;
    client.join(room);
    this.logger.debug(`User ${client.userId} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave_mission')
  async handleLeaveMission(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { missionId: string },
  ) {
    const room = `mission:${data.missionId}`;
    client.leave(room);
    return { event: 'left', room };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { missionId: string; content: string },
  ) {
    if (!client.userId) return;

    try {
      // Persist via existing service (includes anti-disintermediation filter)
      const message = await this.messagesService.createMessage(
        data.missionId,
        client.userId,
        data.content,
      );

      // Broadcast to all clients in the mission room
      const room = `mission:${data.missionId}`;
      this.server.to(room).emit('new_message', message);

      return { event: 'message_sent', messageId: message.id };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      client.emit('error', { message: errorMsg });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { missionId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    const room = `mission:${data.missionId}`;
    client.to(room).emit('user_typing', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('message_read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { missionId: string },
  ) {
    if (!client.userId) return;

    try {
      const result = await this.messagesService.markAsRead(data.missionId, client.userId);
      const room = `mission:${data.missionId}`;
      this.server.to(room).emit('messages_read', {
        userId: client.userId,
        missionId: data.missionId,
        count: result.count,
      });
    } catch (err) {
      // Silently fail for read receipts
    }
  }

  /**
   * Check if a user is currently online.
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get count of connected users.
   */
  getOnlineCount(): number {
    return this.connectedUsers.size;
  }
}
