import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { EmailTemplateManager } from '../email/email-template-manager';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [EmailModule, UsersModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, EmailTemplateManager],
  exports: [AuthService],
})
export class AuthModule {}
