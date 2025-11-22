import { IsString, IsNumber, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  missionId: string;

  @IsNumber()
  @Min(1)
  amount: number; // Montant en dollars CAD
}

