import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum SupportTicketCategoryDto {
  PAYMENT = 'PAYMENT',
  MISSION = 'MISSION',
  ACCOUNT = 'ACCOUNT',
  TECHNICAL = 'TECHNICAL',
  DISPUTE = 'DISPUTE',
  OTHER = 'OTHER',
}

export enum SupportTicketPriorityDto {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateSupportTicketDto {
  @ApiProperty({
    description: 'Ticket subject',
    example: 'Payment not received for mission',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'I completed mission XYZ on January 15th but the payment was not credited to my account.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Ticket category',
    enum: SupportTicketCategoryDto,
    example: SupportTicketCategoryDto.PAYMENT,
  })
  @IsEnum(SupportTicketCategoryDto)
  category: SupportTicketCategoryDto;

  @ApiPropertyOptional({
    description: 'Related mission ID (if applicable)',
    example: 'mission_abc123',
  })
  @IsString()
  @IsOptional()
  missionId?: string;

  @ApiPropertyOptional({
    description: 'Ticket priority',
    enum: SupportTicketPriorityDto,
    default: SupportTicketPriorityDto.NORMAL,
  })
  @IsEnum(SupportTicketPriorityDto)
  @IsOptional()
  priority?: SupportTicketPriorityDto;
}

export class AddTicketMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Here is additional information about my issue...',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

