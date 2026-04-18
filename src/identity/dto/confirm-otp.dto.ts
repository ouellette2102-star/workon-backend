import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmOtpDto {
  @ApiProperty({ example: '123456', description: 'Code OTP 6 chiffres' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
