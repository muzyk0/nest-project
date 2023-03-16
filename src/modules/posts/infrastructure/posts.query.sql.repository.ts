import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IsInt, IsOptional } from 'class-validator';
import { DataSource } from 'typeorm';
import { v4 } from 'uuid';

import { PageOptionsDto } from '../../../shared/paginator/page-options.dto';
import { PageDto } from '../../../shared/paginator/page.dto';
import {
  LikeStatus,
  LikeStringStatus,
} from '../../likes/application/interfaces/like-status.enum';
import { getStringLikeStatus } from '../../likes/utils/formatters';
import { PostWithBlogNameDto } from '../application/dto/post-with-blog-name.dto';
import { PostViewDto } from '../application/dto/post.view.dto';

export abstract class IPostsQueryRepository {
  abstract findAll(
    pageOptionsDto: PageOptionsDto,
    options?: FindAllPostsOptions,
  ): Promise<PageDto<PostViewDto>>;

  abstract findOne(id: string, userId?: string): Promise<PostViewDto>;
}

export class FindAllPostsOptions {
  @IsInt()
  @IsOptional()
  blogId?: string;

  @IsInt()
  @IsOptional()
  userId?: string;
}

@Injectable()
export class PostsQueryRepository implements IPostsQueryRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(
    pageOptionsDto: PageOptionsDto,
    { userId, blogId }: FindAllPostsOptions,
  ) {
    const query = `
        WITH posts AS
                 (SELECT p.*,
                         u.login as "userLogin",
                         b.name  as "blogName",
                         (select row_to_json(row) as "extendedLikesInfo"
                          from (select *
                                from (SELECT count(*) as "likesCount"
                                      FROM likes l
                                      WHERE l."postId" = p.id
                                        AND l.status = '1'::likes_status_enum) as "likesCount",
                                     (SELECT count(*) as "dislikesCount"
                                      FROM likes l
                                      WHERE l."postId" = p.id
                                        AND l.status = '0'::likes_status_enum) as "dislikesCount",

                                     -- if like doesn't exist with postId and userId return -1 like status enum
                                     COALESCE((SELECT status as "myStatus"
                                               FROM likes l
                                               WHERE l."postId" = p.id
                                                 AND l."userId" = cast($5 as UUID)),
                                              '-1'::likes_status_enum) as "myStatus",

                                     (select array_to_json(array_agg(row_to_json(t))) as "newestLikes"
                                      from (select l3."userId", l3."updatedAt" as "addedAt", u.login
                                            from likes as l3
                                                     left join users as u on l3."userId" = u.id
                                                     left join bans ub on l3."userId" = ub."userId"
                                            where l3.status = '1'::likes_status_enum
                                              and l3."postId" = p.id
                                              and ub.banned is null
                                            order by l3."createdAt" desc
                                            limit 3) t) as "newestLikes") as row)
                  FROM posts as p
                           lEFT JOIN users as u ON u.id = cast($5 as UUID)
                           LEFT JOIN bans AS bans on u.id = bans."userId"
                           lEFT JOIN blogs as b ON p."blogId" = b.id
                  where true
                    AND case
                            when cast($4 as TEXT) IS NOT NULL THEN p.title ILIKE '%' || $4 || '%'
                            ELSE true END
                    AND case
                            when cast($5 as UUID) IS NOT NULL THEN u.id = $5
                            ELSE true END
                    AND case
                            when cast($5 as UUID) IS NOT NULL THEN bans.banned is null
                            ELSE true END
                    AND case
                            when cast($6 as UUID) IS NOT NULL THEN b.banned is null
                            ELSE true END)


        select row_to_json(t1) as data
        from (select c.total,
                     jsonb_agg(row_to_json(sub)) filter (where sub.id is not null) as "items"
              from (table posts
                  order by
                      case when $1 = 'desc' then "${pageOptionsDto.sortBy}" end desc,
                      case when $1 = 'asc' then "${pageOptionsDto.sortBy}" end asc
                  limit $2
                  offset $3) sub
                       right join (select count(*) from posts) c(total) on true
              group by c.total) t1;
    `;

    const posts: { total: number; items?: PostViewDto[] } =
      await this.dataSource
        .query(query, [
          pageOptionsDto.sortDirection,
          pageOptionsDto.pageSize,
          pageOptionsDto.skip,
          pageOptionsDto.searchNameTerm,
          userId,
          blogId,
        ])
        .then((res) => res[0]?.data);

    return new PageDto({
      items: (posts.items ?? []).map(this.mapToDtoForRowSqlMapper),
      itemsCount: posts.total,
      pageOptionsDto,
    });
  }

  // TODO: userId for count likes
  async findOne(id: string, userId?: string): Promise<PostViewDto | null> {
    const [post]: [PostViewDto] = await this.dataSource.query(
      `
          SELECT p.*,
                 b.name as "blogName",
                 (select row_to_json(row) as "extendedLikesInfo"
                  from (select *
                        from (SELECT count(*) as "likesCount"
                              FROM likes l
                              WHERE l."postId" = p.id
                                AND l.status = '1'::likes_status_enum) as "likesCount",
                             (SELECT count(*) as "dislikesCount"
                              FROM likes l
                              WHERE l."postId" = p.id
                                AND l.status = '0'::likes_status_enum) as "dislikesCount",

                             -- if like doesn't exist with postId and userId return -1 like status enum
                             COALESCE((SELECT status as "myStatus"
                                       FROM likes l
                                       WHERE l."postId" = p.id
                                         AND l."userId" = $2), '-1') as "myStatus",

                             (select array_to_json(array_agg(row_to_json(t))) as "newestLikes"
                              from (select l3."userId", l3."updatedAt" as "addedAt", u.login
                                    from likes as l3
                                             left join users as u on l3."userId" = u.id
                                             left join bans ub on l3."userId" = ub."userId"
                                    where l3.status = '1'::likes_status_enum
                                      and l3."postId" = p.id
                                      and ub.banned is null
                                    order by l3."createdAt" desc
                                    limit 3) t) as "newestLikes") as row)
          FROM posts as p
                   join blogs as b on p."blogId" = b.id
          where p.id::text = $1
            and b.banned is null;
      `,
      [id, userId],
    );

    if (!post) {
      return null;
    }

    return this.mapToDtoForRowSqlMapper(post);
  }

  mapToDtoIterator(post: PostWithBlogNameDto): PostViewDto {
    return {
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName: post.blogName,
      createdAt: post.createdAt.toISOString(),
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: LikeStringStatus.NONE,
        newestLikes: [],
      },
    };
  }

  mapToDtoForRowSqlMapper(post: PostViewDto): PostViewDto {
    return {
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName: post.blogName,
      createdAt: new Date(post.createdAt).toISOString(),
      extendedLikesInfo: {
        likesCount: post.extendedLikesInfo.likesCount,
        dislikesCount: post.extendedLikesInfo.dislikesCount,
        myStatus: getStringLikeStatus(
          post.extendedLikesInfo.myStatus as unknown as LikeStatus,
        ),
        newestLikes: (post.extendedLikesInfo.newestLikes ?? []).map((nl) => ({
          ...nl,
          addedAt: new Date(nl.addedAt).toISOString(),
        })),
      },
    };
  }
}
