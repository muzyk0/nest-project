import { join } from 'path';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

/* eslint import/order: ["error", {"newlines-between": "ignore"}] */
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { configModule } from './constants';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './features/auth/auth.module';
import { BlogsModule } from './features/blogs/blogs.module';
import { CommentsModule } from './features/comments/comments.module';
import configuration from './config/configuration';
import { LimitsModule } from './features/limits/limits.module';
import { PostsModule } from './features/posts/posts.module';
import { TestingModule } from './features/testing/testing.module';
import { UsersModule } from './features/users/users.module';
import { SecurityModule } from './features/security/security.module';
import { PasswordRecoveryModule } from './features/password-recovery/password-recovery.module';
import { LikesModule } from './features/likes/likes.module';
import typeOrmConfig from './config/typeorm.config';
import { EmailModuleLocal } from './features/email-local/email-local.module';
import { SuperAdminModule } from './features/super-admin/super-admin.module';

@Module({
  imports: [
    configModule,
    MongooseModule.forRoot(configuration().MONGO_URI),
    TypeOrmModule.forRoot(typeOrmConfig.options),
    // EmailModule,
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        return {
          // or transport: config.get("MAIL_TRANSPORT"),
          transport: {
            service: 'Gmail',
            auth: {
              user: config.get<string>('EMAIL_FROM'),
              pass: config.get<string>('EMAIL_FROM_PASSWORD'),
            },
          },
          defaults: {
            from: `"No Reply" <${config.get<string>('EMAIL_FROM')}>`,
          },
          // preview: true,
          template: {
            dir: join(__dirname, 'templates'), // or process.cwd() + '/template/'
            adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'swagger-static'),
      serveRoot: process.env.NODE_ENV === 'development' ? '/' : '/',
    }),
    EmailModuleLocal,
    BlogsModule,
    PostsModule,
    AuthModule,
    UsersModule,
    TestingModule,
    CommentsModule,
    LimitsModule,
    SecurityModule,
    PasswordRecoveryModule,
    LikesModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
