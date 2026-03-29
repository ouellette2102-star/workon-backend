import { IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  missionId: string;

  @IsNumber()
  @Min(100) // Minimum 100 cents (1$ CAD)
  amountCents: number; // Montant en cents CAD
}

