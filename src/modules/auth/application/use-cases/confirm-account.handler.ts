import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { isAfter } from 'date-fns';

import { User } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/infrastructure/users.repository.sql';

export class ConfirmAccountCommand {
  constructor(public readonly code: string) {}
}

@CommandHandler(ConfirmAccountCommand)
export class ConfirmAccountHandler
  implements ICommandHandler<ConfirmAccountCommand>
{
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ code }: ConfirmAccountCommand): Promise<boolean> {
    const user = await this.usersRepository.findOneByConfirmationCode(code);

    if (!this.isAvailableConfirmAccount(user, code)) {
      return false;
    }

    return this.usersRepository.setIsConfirmedById(user.id);
  }

  private isAvailableConfirmAccount(user: User, code: string) {
    if (!user || this.isConfirmed(user)) {
      return false;
    }

    if (this.isExpired(user)) {
      return false;
    }

    if (!this.isValidConfirmationCode(user, code)) {
      return false;
    }

    return true;
  }

  private isConfirmed(user: User) {
    return user.isConfirmed;
  }

  private isExpired(user: User) {
    return isAfter(new Date(), user.expirationDate);
  }

  private isValidConfirmationCode(user: User, code: string) {
    return code === user.confirmationCode;
  }
}