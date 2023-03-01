import { Injectable } from '@nestjs/common';

import { IBlogsRepository } from '../infrastructure/blogs.sql.repository';

import { BlogDto } from './dto/blog.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

export interface IBlogService {
  create(createBlogDto: Omit<CreateBlogDto, 'id'>): Promise<BlogDto>;

  findOne(id: string): Promise<BlogDto>;

  update(id: string, updateBlogDto: UpdateBlogDto): Promise<BlogDto>;

  remove(id: string): Promise<boolean>;
}

@Injectable()
export class BlogsService implements IBlogService {
  constructor(private blogsRepository: IBlogsRepository) {}

  async create(createBlogDto: CreateBlogDto) {
    const newBlog: CreateBlogDto = {
      name: createBlogDto.name,
      description: createBlogDto.description,
      websiteUrl: createBlogDto.websiteUrl,
      userId: createBlogDto.userId,
    };
    return this.blogsRepository.create(newBlog);
  }

  async findOne(id: string) {
    return this.blogsRepository.findOne(id);
  }

  async update(id: string, updateBlogDto: UpdateBlogDto) {
    return this.blogsRepository.update(id, updateBlogDto);
  }

  async remove(id: string) {
    return this.blogsRepository.remove(id);
  }
}