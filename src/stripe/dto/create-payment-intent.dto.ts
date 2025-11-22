import { IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  missionId: string;

  @IsNumber()
  @Min(1) // Minimum 1$ CAD
  amount: number; // Montant en dollars CAD
}

