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

interface ChatMessage {
  missionId: string;
  senderId: string;
  content: string;
  timestamp?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId → userId

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedUsers.set(client.id, userId);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
  }

  @SubscribeMessage('joinMission')
  handleJoinMission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { missionId: string },
  ) {
    client.join(`mission:${data.missionId}`);
    this.logger.log(`Client ${client.id} joined mission:${data.missionId}`);
    return { event: 'joined', data: { missionId: data.missionId } };
  }

  @SubscribeMessage('leaveMission')
  handleLeaveMission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { missionId: string },
  ) {
    client.leave(`mission:${data.missionId}`);
    return { event: 'left', data: { missionId: data.missionId } };
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatMessage,
  ) {
    const userId = this.connectedUsers.get(client.id);
    const message = {
      ...data,
      senderId: userId || data.senderId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to everyone in the mission room (including sender)
    this.server.to(`mission:${data.missionId}`).emit('newMessage', message);

    return { event: 'messageSent', data: message };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { missionId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    client.to(`mission:${data.missionId}`).emit('userTyping', {
      userId,
      missionId: data.missionId,
    });
  }

  /**
   * Notify a specific user (called from services)
   */
  notifyUser(userId: string, event: string, payload: unknown) {
    for (const [socketId, uid] of this.connectedUsers.entries()) {
      if (uid === userId) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  /**
   * Broadcast to a mission room (called from services)
   */
  broadcastToMission(missionId: string, event: string, payload: unknown) {
    this.server.to(`mission:${missionId}`).emit(event, payload);
  }
}
