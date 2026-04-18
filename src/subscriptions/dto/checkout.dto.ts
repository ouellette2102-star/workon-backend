import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';

export enum CheckoutPlan {
  CLIENT_PRO = 'CLIENT_PRO',
  WORKER_PRO = 'WORKER_PRO',
  CLIENT_BUSINESS = 'CLIENT_BUSINESS',
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: CheckoutPlan })
  @IsEnum(CheckoutPlan)
  plan!: CheckoutPlan;

  @ApiProperty({ required: false, description: 'URL to return to on success' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  successUrl?: string;

  @ApiProperty({ required: false, description: 'URL to return to on cancel' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}
