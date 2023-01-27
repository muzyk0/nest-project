import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IsInt, IsOptional } from 'class-validator';
import { Model } from 'mongoose';

import { BASE_PROJECTION } from '../../../common/mongoose/constants';
import { PageOptionsDto } from '../../../common/paginator/page-options.dto';
import { PageDto } from '../../../common/paginator/page.dto';
import { LikeParentTypeEnum } from '../../likes/application/interfaces/like-parent-type.enum';
import { Like } from '../../likes/domain/entity/like.entity';
import { LikesRepositorySql } from '../../likes/infrastructure/likes.repository.sql';
import { getStringLikeStatus } from '../../likes/utils/formatters';
import { Post, PostDocument } from '../../posts/domain/schemas/posts.schema';
import { UsersRepository } from '../../users/infrastructure/users.repository';
import { CommentViewDto } from '../application/dto/comment.view.dto';
import { Comment, CommentDocument } from '../domain/schemas/comments.schema';

const projectionFields = { ...BASE_PROJECTION, postId: 0 };

export class FindAllCommentsOptions extends PageOptionsDto {
  constructor(postId: string) {
    super();
    this.postId = postId;
  }

  @IsInt()
  @IsOptional()
  postId?: string;
}

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
    private readonly likesRepositorySql: LikesRepositorySql,
    private readonly usersRepository: UsersRepository,
  ) {}

  async findOne(id: string, userId?: string): Promise<CommentViewDto> {
    const comment = await this.commentModel.findOne({ id }, projectionFields);

    const user = await this.usersRepository.findOneById(comment.userId);
    if (Boolean(user.accountData.banned)) {
      return;
    }

    if (!comment) {
      return;
    }

    return await this.getLikesInfo(comment, userId);
  }

  async findPostComments(
    findAllCommentsOptions: FindAllCommentsOptions,
    { userId }: { userId: string },
  ): Promise<PageDto<CommentViewDto>> {
    const filter = { postId: findAllCommentsOptions.postId };

    const itemsCount = await this.commentModel.countDocuments(filter);

    const comments = await this.commentModel
      .find(filter, projectionFields)
      .skip(findAllCommentsOptions.skip)
      .sort({
        [findAllCommentsOptions.sortBy]: findAllCommentsOptions.sortDirection,
      })
      .limit(findAllCommentsOptions.pageSize)
      .lean();

    const commentsWithLikesInfo: CommentViewDto[] = await Promise.all(
      comments.map(async (comment) => {
        return this.getLikesInfo(comment, userId);
      }),
    );

    return new PageDto({
      items: commentsWithLikesInfo,
      itemsCount,
      pageOptionsDto: findAllCommentsOptions,
    });
  }

  private async getLikesInfo(comment: Comment, userId: string) {
    const { likesCount, dislikesCount } =
      await this.likesRepositorySql.countLikeAndDislikeByCommentId({
        parentId: comment.id,
      });

    const myStatus = await this.likesRepositorySql.getLikeOrDislike({
      parentId: comment.id,
      parentType: LikeParentTypeEnum.COMMENT,
      userId: userId,
    });

    return this.mapToDto(comment, likesCount, dislikesCount, myStatus);
  }

  private mapToDto(
    comment: Comment,
    likesCount,
    dislikesCount,
    myStatus: Like,
  ): CommentViewDto {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userLogin: comment.userLogin,
      postId: comment.postId,
      createdAt: comment.createdAt,
      likesInfo: {
        likesCount,
        dislikesCount,
        myStatus: getStringLikeStatus(myStatus),
      },
    };
  }
}
