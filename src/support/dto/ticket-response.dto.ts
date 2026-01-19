import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketMessageResponseDto {
  @ApiProperty({ example: 'msg_abc123' })
  id: string;

  @ApiProperty({ example: 'user_xyz789' })
  senderId: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin'] })
  senderType: string;

  @ApiProperty({ example: 'Here is my response...' })
  content: string;

  @ApiPropertyOptional({ example: ['https://storage.example.com/file1.jpg'] })
  attachments?: string[];

  @ApiProperty({ example: '2026-01-19T10:30:00.000Z' })
  createdAt: string;
}

export class SupportTicketResponseDto {
  @ApiProperty({ example: 'ticket_abc123' })
  id: string;

  @ApiProperty({ example: 'user_xyz789' })
  userId: string;

  @ApiPropertyOptional({ example: 'mission_def456' })
  missionId?: string;

  @ApiProperty({ example: 'Payment not received' })
  subject: string;

  @ApiProperty({ example: 'Detailed description...' })
  description: string;

  @ApiProperty({ example: 'PAYMENT', enum: ['PAYMENT', 'MISSION', 'ACCOUNT', 'TECHNICAL', 'DISPUTE', 'OTHER'] })
  category: string;

  @ApiProperty({ example: 'NORMAL', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  priority: string;

  @ApiProperty({ example: 'OPEN', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_ADMIN', 'RESOLVED', 'CLOSED'] })
  status: string;

  @ApiPropertyOptional({ example: 'admin_user_id' })
  assignedTo?: string;

  @ApiPropertyOptional({ example: '2026-01-20T14:00:00.000Z' })
  resolvedAt?: string;

  @ApiProperty({ example: '2026-01-19T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-19T10:30:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({ type: [TicketMessageResponseDto] })
  messages?: TicketMessageResponseDto[];
}

export class TicketListResponseDto {
  @ApiProperty({ type: [SupportTicketResponseDto] })
  tickets: SupportTicketResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

