-- liquibase formatted sql

-- changeset liquibase:1
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'keys'
CREATE TABLE "public"."keys" (
    "identifier" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "creation_timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "is_shadow" BOOLEAN DEFAULT FALSE,
    "labels" TEXT [],
    "value" TEXT,
    "version" BIGINT NOT NULL,
    "parent_identifier" BIGINT,
    "user_identifier" BIGINT,
    CONSTRAINT "keys_pkey" PRIMARY KEY ("identifier")
);

-- changeset liquibase:2
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'mail_tokens'
CREATE TABLE "public"."mail_tokens" (
    "identifier" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "attempt_count" INTEGER DEFAULT 0,
    "code" TEXT,
    "last_attempt" TIMESTAMP WITHOUT TIME ZONE DEFAULT '1970-01-01 00:00:00',
    "mail" TEXT,
    "timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "version" BIGINT NOT NULL,
    "user_identifier" BIGINT,
    CONSTRAINT "mail_tokens_pkey" PRIMARY KEY ("identifier")
);

-- changeset liquibase:3
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'otp_params'
CREATE TABLE "public"."otp_params" (
    "id" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "creation_timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "scratch_codes" TEXT [],
    "shared_secret" TEXT,
    "user_identifier" BIGINT,
    CONSTRAINT "otp_params_pkey" PRIMARY KEY ("id")
);

-- changeset liquibase:4
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'otp_tokens'
CREATE TABLE "public"."otp_tokens" (
    "id" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "creation_timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "is_initial" BOOLEAN,
    "value" TEXT,
    "user_identifier" BIGINT,
    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- changeset liquibase:5
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'sessions'
CREATE TABLE "public"."sessions" (
    "identifier" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "client_version" TEXT,
    "ip_address" TEXT,
    "key" TEXT,
    "timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "user_agent" TEXT,
    "user_identifier" BIGINT,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("identifier")
);

-- changeset liquibase:6
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'users'
CREATE TABLE "public"."users" (
    "identifier" BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "hash" TEXT,
    "last_session" TIMESTAMP WITHOUT TIME ZONE,
    "mail" TEXT,
    "otp_shared_secret" TEXT,
    "otp_spare_attempts" INTEGER DEFAULT 0,
    "salt" TEXT,
    "state" INTEGER,
    "timestamp" TIMESTAMP WITHOUT TIME ZONE,
    "username" TEXT,
    "version" BIGINT NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("identifier")
);

-- changeset liquibase:7
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'otp_tokens' and constraint_name = 'ukepg9lkm4ggrlj2daic3l3i2vw'
ALTER TABLE "public"."otp_tokens"
    ADD CONSTRAINT "ukepg9lkm4ggrlj2daic3l3i2vw"
    UNIQUE ("user_identifier", "value");

-- changeset liquibase:8
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'users' and constraint_name = 'uk_r43af9ap4edm43mmtq01oddj6'
ALTER TABLE "public"."users"
    ADD CONSTRAINT "uk_r43af9ap4edm43mmtq01oddj6"
    UNIQUE ("username");

-- changeset liquibase:9
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'feature_prompts'
CREATE TABLE "public"."feature_prompts" (
    "fuzzy_search" BOOLEAN,
    "otp" BOOLEAN,
    "version" BIGINT NOT NULL,
    "user_identifier" BIGINT NOT NULL,
    CONSTRAINT "feature_prompts_pkey" PRIMARY KEY ("user_identifier")
);

-- changeset liquibase:10
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'otp_tokens' and constraint_name = 'fk1u2jwse5b3wdxuvhk37jwtaxp'
ALTER TABLE "public"."otp_tokens"
    ADD CONSTRAINT "fk1u2jwse5b3wdxuvhk37jwtaxp"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:11
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'mail_tokens' and constraint_name = 'fk4bho6q1wvhvj71c4mlboqc2we'
ALTER TABLE "public"."mail_tokens"
    ADD CONSTRAINT "fk4bho6q1wvhvj71c4mlboqc2we"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:12
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'otp_params' and constraint_name = 'fk4n8xrfcqrlgwfbmkxqw28e6u0'
ALTER TABLE "public"."otp_params"
    ADD CONSTRAINT "fk4n8xrfcqrlgwfbmkxqw28e6u0"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:13
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'keys' and constraint_name = 'fk9bpkeay3gjqgj6qsh1usbmkwe'
ALTER TABLE "public"."keys"
    ADD CONSTRAINT "fk9bpkeay3gjqgj6qsh1usbmkwe"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:14
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'sessions' and constraint_name = 'fkm4okt87wyku2rji43sd4yrkym'
ALTER TABLE "public"."sessions"
    ADD CONSTRAINT "fkm4okt87wyku2rji43sd4yrkym"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:15
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'keys' and constraint_name = 'fko76l9bbtm9ne8jkl824tx8oub'
ALTER TABLE "public"."keys"
    ADD CONSTRAINT "fko76l9bbtm9ne8jkl824tx8oub"
    FOREIGN KEY ("parent_identifier") REFERENCES "public"."keys" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:16
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.table_constraints where table_schema = 'public' and table_name = 'feature_prompts' and constraint_name = 'fkstt2d96538kdhgl2qhiouhep3'
ALTER TABLE "public"."feature_prompts"
    ADD CONSTRAINT "fkstt2d96538kdhgl2qhiouhep3"
    FOREIGN KEY ("user_identifier") REFERENCES "public"."users" ("identifier")
    ON UPDATE NO ACTION ON DELETE CASCADE;

-- changeset liquibase:17
-- comment Upgrades from `enum` to `UserState`.
UPDATE "public"."users" SET "state" = "state" + 1;

-- changeset liquibase:18
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'version'
ALTER TABLE "public"."sessions" ADD COLUMN "version" BIGINT;
UPDATE "public"."sessions" SET "version" = 1;
ALTER TABLE "public"."sessions" ALTER COLUMN "version" SET NOT NULL;

-- changeset liquibase:19
-- comment Defaults `SessionStage` to `SESSION_ACTIVATED`.
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'stage'
ALTER TABLE "public"."sessions" ADD COLUMN "stage" INTEGER;
UPDATE "public"."sessions" SET "stage" = 2;

-- changeset liquibase:20
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'last_stage_change'
ALTER TABLE "public"."sessions" ADD COLUMN "last_stage_change" TIMESTAMP WITHOUT TIME ZONE;
UPDATE "public"."sessions" SET "last_stage_change" = "timestamp";

-- changeset liquibase:21
-- comment Prepends key prefixes, `SESSION_INITIATED` ≡ 1, `SESSION_ACTIVATED` ≡ 2.
UPDATE "public"."sessions" SET "key" = concat('authn:', "key") WHERE "stage" = 1;
UPDATE "public"."sessions" SET "key" = concat('session:', "key") WHERE "stage" = 2;

-- changeset liquibase:22
CREATE INDEX IF NOT EXISTS "idx8uiomr1kpiydl6yyifyqlstw2" ON "public"."keys" ("user_identifier");

-- changeset liquibase:23
CREATE INDEX IF NOT EXISTS "idx81lj69y60lms7f7gvmn186acw" ON "public"."keys" ("parent_identifier");

-- changeset liquibase:24
CREATE INDEX IF NOT EXISTS "idx3t5hq5fvd7r5qqmqfggo8uu2m" ON "public"."mail_tokens" ("user_identifier");

-- changeset liquibase:25
CREATE INDEX IF NOT EXISTS "idxn3qd43ibuyr8s8k56fxv60quj" ON "public"."mail_tokens" ("mail");

-- changeset liquibase:26
CREATE INDEX IF NOT EXISTS "idxb9h4of0nvxfsur7tcsdyngm2y" ON "public"."otp_params" ("user_identifier");

-- changeset liquibase:27
CREATE INDEX IF NOT EXISTS "idxpuwlxukecumjygkgefdeob3ol" ON "public"."otp_tokens" ("user_identifier");

-- changeset liquibase:28
CREATE INDEX IF NOT EXISTS "idxndl4t14kpseeq8gi0x3h4034k" ON "public"."sessions" ("user_identifier");

-- changeset liquibase:29
-- comment Addresses may differ but ultimately refer to the same inbox.
DROP INDEX IF EXISTS "idxn3qd43ibuyr8s8k56fxv60quj";

-- changeset liquibase:30
-- comment Defaults `MailTokenState` to `MAIL_TOKEN_PENDING`.
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'mail_tokens' and column_name = 'state'
ALTER TABLE "public"."mail_tokens" ADD COLUMN "state" INTEGER;
UPDATE "public"."mail_tokens" SET "state" = 1;

-- changeset liquibase:31
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:1 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'feature_prompts' and column_name = 'fuzzy_search'
ALTER TABLE "public"."feature_prompts" DROP COLUMN "fuzzy_search";

-- changeset liquibase:32
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:1 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'feature_prompts' and column_name = 'otp'
ALTER TABLE "public"."feature_prompts" DROP COLUMN "otp";

-- changeset liquibase:33
-- preconditions onFail:MARK_RAN
-- precondition-sql-check expectedResult:0 select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'feature_prompts' and column_name = 'release'
ALTER TABLE "public"."feature_prompts" ADD COLUMN "release" BOOLEAN;
UPDATE "public"."feature_prompts" SET "release" = TRUE;
