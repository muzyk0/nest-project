import { MigrationInterface, QueryRunner } from 'typeorm';

export class initial1672046787396 implements MigrationInterface {
  name = 'initial1672046787396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "likes"
                                 (
                                     "createdAt"  TIMESTAMP                        NOT NULL DEFAULT now(),
                                     "updatedAt"  TIMESTAMP                        NOT NULL DEFAULT now(),
                                     "id"         uuid                             NOT NULL DEFAULT uuid_generate_v4(),
                                     "userId"     character varying                NOT NULL,
                                     "parentId"   character varying                NOT NULL,
                                     "parentType" "public"."likes_parenttype_enum" NOT NULL,
                                     "status"     integer                          NOT NULL,
                                     CONSTRAINT "PK_a9323de3f8bced7539a794b4a37" PRIMARY KEY ("id")
                                 )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "likes"`);
  }
}