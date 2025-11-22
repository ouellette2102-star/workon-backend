import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { UserRole } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  async createPaymentIntent(@Request() req: any, @Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    // req.user.sub contient le clerkId, on doit trouver l'id interne User
    // Note: JwtStrategy doit mapper le clerkId vers l'id utilisateur interne
    return this.paymentsService.createPaymentIntent(req.user.userId || req.user.sub, createPaymentIntentDto);
  }
}

