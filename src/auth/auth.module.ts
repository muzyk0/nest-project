import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { EmailModule } from '../email/email.module';
import { LimitsModule } from '../limits/limits.module';
import { SecurityModule } from '../security/security.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AtJwtStrategy } from './strategies/at.jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RtJwtStrategy } from './strategies/rt.jwt.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    EmailModule,
    UsersModule,
    PassportModule,
    LimitsModule,
    SecurityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, AtJwtStrategy, RtJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
