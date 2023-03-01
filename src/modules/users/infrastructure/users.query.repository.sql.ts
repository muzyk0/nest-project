import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { FilterQuery } from 'mongoose';
import { DataSource } from 'typeorm';

import {
  PageOptionsForUserDto,
  UserBanStatus,
} from '../../../shared/paginator/page-options.dto';
import { PageDto } from '../../../shared/paginator/page.dto';
import { Ban } from '../../bans/domain/entity/ban.entity';
import { BansRepositorySql } from '../../bans/infrastructure/bans.repository.sql';
import { User } from '../domain/entities/user.entity';

import { UserWithBannedInfoForBlogView } from './dto/user-with-banned-info-for-blog.view';
import { UserBloggerViewModel, UserViewModel } from './dto/user.view';

export abstract class IUsersQueryRepository {
  abstract findOne(id: string): Promise<UserViewModel>;

  abstract findAll(
    pageOptionsDto: PageOptionsForUserDto,
  ): Promise<PageDto<UserViewModel>>;

  abstract mapToDto(users: User): UserViewModel;

  abstract mapToBloggerViewDto(users: User, ban: Ban): UserBloggerViewModel;

  abstract getBannedUsersForBlog(
    pageOptionsDto: PageOptionsForUserDto,
    blogId: string,
  ): Promise<PageDto<unknown>>;
}

@Injectable()
export class UsersQueryRepository implements IUsersQueryRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly bansRepositorySql: BansRepositorySql,
  ) {}

  async findOne(id: string): Promise<UserViewModel> {
    const users: User[] = await this.dataSource.query(
      `
          SELECT *
          FROM "users"
          WHERE id = $1
      `,
      [id],
    );
    return this.mapToDto(users[0]);
  }

  async findAll(
    pageOptionsDto: PageOptionsForUserDto,
  ): Promise<PageDto<UserViewModel>> {
    const query = `
        WITH users AS
                 (SELECT *
                  FROM "users"
--              where (lower("banned") like '%' || lower($1) || '%')
                  WHERE (${
                    pageOptionsDto?.banStatus &&
                    pageOptionsDto.banStatus !== UserBanStatus.ALL
                      ? `
                          ${
                            pageOptionsDto.banStatus === UserBanStatus.BANNED
                              ? `banned IS nOt NULL`
                              : `banned IS NULL`
                          }
                        `
                      : 'banned IS NULL OR banned IS NOT NULL'
                  }) ${
      pageOptionsDto.searchLoginTerm || pageOptionsDto.searchEmailTerm
        ? `AND (${
            pageOptionsDto.searchLoginTerm
              ? `LOWER("login") LIKE '%' || LOWER('${pageOptionsDto.searchLoginTerm}') || '%'`
              : ''
          } ${
            pageOptionsDto.searchEmailTerm
              ? `OR LOWER("email") LIKE '%' || LOWER('${pageOptionsDto.searchEmailTerm}') || '%'`
              : ''
          })`
        : ''
    })


        select row_to_json(t1) as data
        from (select c.total,
                     jsonb_agg(row_to_json(sub)) filter (where sub.id is not null) as "items"
              from (table users
                  order by
                      case when $1 = 'desc' then "${
                        pageOptionsDto.sortBy
                      }" end desc,
                      case when $1 = 'asc' then "${
                        pageOptionsDto.sortBy
                      }" end asc
                  limit $2
                  offset $3) sub
                       right join (select count(*) from users) c(total) on true
              group by c.total) t1
    `;

    const queryParams = [
      pageOptionsDto.sortDirection,
      pageOptionsDto.pageSize,
      pageOptionsDto.skip,
    ];

    const users: { total: number; items?: User[] } = await this.dataSource
      .query(query, queryParams)
      .then((res) => res[0]?.data);

    return new PageDto({
      items: users.items?.map(this.mapToDto) ?? [],
      itemsCount: users.total,
      pageOptionsDto,
    });
  }

  mapToDto(user: User): UserViewModel {
    return {
      id: user.id,
      login: user.login,
      email: user.email,
      createdAt: new Date(user.createdAt).toISOString(),
      banInfo: {
        isBanned: Boolean(user.banned),
        banDate: user.banned ? new Date(user.banned).toISOString() : null,
        banReason: user.banReason,
      },
    };
  }

  mapToBloggerViewDto(
    user: UserWithBannedInfoForBlogView,
  ): UserBloggerViewModel {
    return {
      id: user.id,
      login: user.login,
      banInfo: {
        isBanned: user.isBannedForBlog,
        banDate: new Date(user.updatedAtForBlog).toISOString(),
        banReason: user.banReasonForBlog,
      },
    };
  }

  async getBannedUsersForBlog(
    pageOptionsDto: PageOptionsForUserDto,
    blogId: string,
  ) {
    const query = `
        WITH users AS
                 (SELECT u.*,
                         b2."isBanned"  as "isBannedForBlog",
                         b2."banReason" as "banReasonForBlog",
                         b2."updatedAt" as "updatedAtForBlog"
                  FROM users as u
                           LEFT JOIN bans as b2 ON b2."parentId" = $5
                  where u.id = b2."userId"
                    AND b2."isBanned" = true
                    AND case
                            when cast(null as TEXT) IS NOT NULL THEN u.login ILIKE '%' || $4 || '%'
                            ELSE true END)

        select row_to_json(t1) as data
        from (select c.total, jsonb_agg(row_to_json(sub)) filter (where sub.id is not null) as "items"
              from (table users
                  order by
                      case when $1 = 'desc' then "${pageOptionsDto.sortBy}" end desc,
                      case when $1 = 'asc' then "${pageOptionsDto.sortBy}" end asc
                  limit $2
                  offset $3) sub
                       right join (select count(*) from users) c (total) on true
              group by c.total) t1;
    `;

    const posts: { total: number; items?: User[] } = await this.dataSource
      .query(query, [
        pageOptionsDto.sortDirection,
        pageOptionsDto.pageSize,
        pageOptionsDto.skip,
        pageOptionsDto.searchNameTerm,
        blogId,
      ])
      .then((res) => res[0]?.data);

    return new PageDto({
      items: (posts.items ?? []).map(this.mapToBloggerViewDto),
      itemsCount: posts.total,
      pageOptionsDto,
    });
  }
}