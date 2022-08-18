import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IsInt, IsOptional } from 'class-validator';
import { Model } from 'mongoose';

import { Blogger, BloggerDocument } from '../bloggers/schemas/bloggers.schema';
import { PageOptionsDto } from '../common/paginator/page-options.dto';
import { PageDto } from '../common/paginator/page.dto';

import { CreatePostDbDto } from './dto/create-post-db.dto';
import { PostDto } from './dto/post.dto';
import { UpdatePostDbDto } from './dto/update-post-db.dto';
import { Post, PostDocument } from './schemas/posts.schema';

export class FindAllPostsOptions extends PageOptionsDto {
  @IsInt()
  @IsOptional()
  bloggerId?: string;
}

@Injectable()
export class PostsRepository {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Blogger.name) private bloggerModel: Model<BloggerDocument>,
  ) {}

  async create(createPostDto: CreatePostDbDto) {
    const blogger = await this.bloggerModel.findOne({
      id: createPostDto.bloggerId,
    });

    if (!blogger) {
      return null;
    }

    const post = await this.postModel.create(createPostDto);

    return this.postModel.findOne({ id: post.id }, { _id: false, __v: false });
  }

  async findAll(options: FindAllPostsOptions) {
    const filter = {
      ...(options?.SearchNameTerm
        ? { title: { $regex: options.SearchNameTerm } }
        : {}),
      ...(options?.bloggerId ? { bloggerId: options.bloggerId } : {}),
    };

    const itemsCount = await this.postModel.countDocuments(filter);

    const items = await this.postModel
      .find(filter, {
        projection: { _id: false, __v: false },
      })
      .skip(options.skip)
      .limit(options.PageSize);

    return new PageDto({
      items,
      itemsCount,
      pageOptionsDto: options,
    });
  }

  async findOne(id: string) {
    return this.postModel.findOne(
      { id },
      { projection: { _id: false, __v: false } },
    );
  }

  async update(
    id: string,
    updatePostDbDto: UpdatePostDbDto,
  ): Promise<PostDto | null> {
    const post = await this.findOne(id);

    if (!post) {
      return null;
    }

    const modifyPost = await this.postModel.findOneAndUpdate(
      { id: id },
      {
        $set: updatePostDbDto,
      },
      { returnDocument: 'after', projection: { _id: false, __v: false } },
    );

    return modifyPost;
  }

  async remove(id: string) {
    const result = await this.postModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
