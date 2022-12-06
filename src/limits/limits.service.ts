import { Injectable } from '@nestjs/common';
import { addMilliseconds } from 'date-fns';

import { CreateLimitsDto } from './dto/create-limits.dto';
import { LimitsRepository } from './limits.repository';

export interface ILimitsService {
  checkLimits(
    requestAttempt: CreateLimitsDto,
    limitMs: number,
    maxRequest: number,
  ): Promise<boolean>;
}

@Injectable()
export class LimitsService implements ILimitsService {
  constructor(private limitsRepository: LimitsRepository) {}

  async checkLimits(
    { ip, login, url, deviceName }: CreateLimitsDto,
    limitMs: number,
    maxRequest: number,
  ) {
    const currentDate = new Date();
    const dateFrom = addMilliseconds(currentDate, -limitMs);
    const countRequestAttempts = await this.limitsRepository.getAttempts({
      ip,
      login,
      url,
      fromDate: dateFrom,
    });
    const limitObj: CreateLimitsDto = { ip, login, url, deviceName };

    await this.limitsRepository.addAttempt(limitObj);

    if (countRequestAttempts < maxRequest) {
      return true;
    }
    return false;
  }
}
