import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../../../../shared/base-entity/base.entity';
import { Blog } from '../../../blogs/domain/entities/blog.entity';

@Entity('posts')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  shortDescription: string;

  @Column()
  content: string;

  @ManyToOne(() => Blog, (blog) => blog.posts)
  blog: Blog;

  @Column()
  blogId: string;
}