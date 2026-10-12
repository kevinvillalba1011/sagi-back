import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791330781695 implements MigrationInterface {
    name = 'InitialSchema1791330781695'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(80) NOT NULL, "description" character varying(200) NOT NULL, "module" character varying(40) NOT NULL, CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(60) NOT NULL, "description" character varying(255), "is_super_admin" boolean NOT NULL DEFAULT false, "is_system" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "username" character varying(50) NOT NULL, "email" character varying(160) NOT NULL, "full_name" character varying(120) NOT NULL, "password_hash" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "must_change_password" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP WITH TIME ZONE, "role_id" uuid NOT NULL, "created_by_id" uuid, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "ip" character varying(64), "user_agent" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(80) NOT NULL, "description" character varying(255), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(160) NOT NULL, "description" character varying(500), "category_id" uuid NOT NULL, "stock" integer NOT NULL DEFAULT '0', "min_stock" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_by_id" uuid, "updated_by_id" uuid, CONSTRAINT "CHK_a7cfa9f8fd9c17cc412e0b5470" CHECK ("min_stock" >= 0), CONSTRAINT "CHK_aea3ee263e1d44e36e5f5b5783" CHECK ("stock" >= 0), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7cfc24d6c24f0ec91294003d6b" ON "products" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_4c9fb58de893725258746385e1" ON "products" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_4dcd2cd0cf988da1681469a0f4" ON "products" ("is_active") `);
        await queryRunner.query(`CREATE TYPE "public"."movement_type" AS ENUM('IN', 'OUT')`);
        await queryRunner.query(`CREATE TABLE "inventory_movements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "product_id" uuid NOT NULL, "type" "public"."movement_type" NOT NULL, "quantity" integer NOT NULL, "balance_after" integer NOT NULL, "reason" character varying(40) NOT NULL, "observation" character varying(255), "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(), "seq" BIGSERIAL NOT NULL, CONSTRAINT "CHK_02cccccb2207c7d6c370819c0b" CHECK ("quantity" > 0), CONSTRAINT "PK_d7597827c1dcffae889db3ab873" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2e45e55a610ca2b66f0b43741a" ON "inventory_movements" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_d6c0007a291b66477a0562d8d1" ON "inventory_movements" ("product_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("roles_id" uuid NOT NULL, "permissions_id" uuid NOT NULL, CONSTRAINT "PK_3a2404462ad8373a26704fb1f1c" PRIMARY KEY ("roles_id", "permissions_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ad074b0f95ff0488162868be2c" ON "role_permissions" ("roles_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bae04782e4d2b4d4c978528970" ON "role_permissions" ("permissions_id") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_5c3bec1682252c36fa161587738" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_63cca4adcd28b6fe19bc4ceb22f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_ad074b0f95ff0488162868be2c7" FOREIGN KEY ("roles_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_bae04782e4d2b4d4c978528970c" FOREIGN KEY ("permissions_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_bae04782e4d2b4d4c978528970c"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_ad074b0f95ff0488162868be2c7"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_63cca4adcd28b6fe19bc4ceb22f"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_5c3bec1682252c36fa161587738"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bae04782e4d2b4d4c978528970"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad074b0f95ff0488162868be2c"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d6c0007a291b66477a0562d8d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2e45e55a610ca2b66f0b43741a"`);
        await queryRunner.query(`DROP TABLE "inventory_movements"`);
        await queryRunner.query(`DROP TYPE "public"."movement_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dcd2cd0cf988da1681469a0f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c9fb58de893725258746385e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7cfc24d6c24f0ec91294003d6b"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
