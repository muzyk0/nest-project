import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Query,
} from '@nestjs/common';

import { BaseAuthGuard } from '../auth/guards/base-auth-guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwtPayload.type';
import { BloggersService } from '../bloggers/bloggers.service';
import { CommentsService } from '../comments/comments.service';
import { CommentInput } from '../comments/dto/comment.input';
import { GetCurrentJwtContext } from '../common/decorators/get-current-user.decorator';
import { PageOptionsDto } from '../common/paginator/page-options.dto';

import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly bloggersService: BloggersService,
    private readonly commentsService: CommentsService,
  ) {}

  @UseGuards(BaseAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto) {
    const blogger = await this.bloggersService.findOne(createPostDto.blogId);

    if (!blogger) {
      throw new BadRequestException();
    }

    return this.postsService.create(createPostDto);
  }

  @Get()
  async findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.postsService.findAll(pageOptionsDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.postsService.findOne(id);

    if (!post) {
      throw new NotFoundException();
    }

    return post;
  }

  @UseGuards(BaseAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    const blogger = await this.bloggersService.findOne(updatePostDto.blogId);

    if (!blogger) {
      throw new BadRequestException();
    }

    const post = await this.postsService.update(id, updatePostDto);

    if (!post) {
      throw new NotFoundException();
    }

    return;
  }

  @UseGuards(BaseAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const isDeleted = await this.postsService.remove(id);

    if (!isDeleted) {
      throw new NotFoundException();
    }

    return;
  }

  @Get(':id/comments')
  async findPostComments(
    @Param('id') id: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    const post = await this.postsService.findOne(id);

    if (!post) {
      throw new NotFoundException({
        field: '',
        message: "Post doesn't exist",
      });
    }

    const comments = await this.commentsService.findPostComments({
      ...pageOptionsDto,
      postId: id,
    });

    return comments;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createPostComment(
    @Param('id') id: string,
    @Body() createCommentDto: CommentInput,
    @GetCurrentJwtContext() ctx: JwtPayload,
  ) {
    const { id: userId, login: userLogin } = ctx.user;

    const post = await this.postsService.findOne(id);

    if (!post) {
      throw new NotFoundException();
    }

    const comment = await this.commentsService.create({
      postId: id,
      content: createCommentDto.content,
      userId,
      userLogin,
    });

    if (!comment) {
      throw new BadRequestException({
        field: '',
        message: "Comment doesn't created",
      });
    }

    return comment;
  }
}
