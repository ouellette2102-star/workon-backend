import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for conversation list response.
 *
 * A conversation is a chat thread associated with a mission.
 * PR-INBOX: Added for Inbox/Conversations feature.
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID (same as missionId)',
    example: 'mission_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Mission ID this conversation is about',
    example: 'mission_abc123',
  })
  missionId: string;

  @ApiProperty({
    description: 'Mission title',
    example: 'Déneigement entrée',
  })
  missionTitle: string;

  @ApiProperty({
    description: 'Name of the other participant',
    example: 'Jean Dupont',
  })
  participantName: string;

  @ApiProperty({
    description: 'Avatar URL of the other participant (optional)',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  participantAvatar?: string;

  @ApiProperty({
    description: 'Last message content preview',
    example: 'Bonjour, je suis disponible demain.',
  })
  lastMessage: string;

  @ApiProperty({
    description: 'Timestamp of the last message',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastMessageAt: string;

  @ApiProperty({
    description: 'Number of unread messages in this conversation',
    example: 2,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Current user role in this conversation',
    example: 'EMPLOYER',
    enum: ['EMPLOYER', 'WORKER'],
  })
  myRole: 'EMPLOYER' | 'WORKER';
}

