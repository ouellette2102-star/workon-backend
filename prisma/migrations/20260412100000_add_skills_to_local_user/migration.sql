-- AlterTable
ALTER TABLE "local_users" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
