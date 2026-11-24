-- CreateEnum
CREATE TYPE "CountryRegion" AS ENUM ('EUROPE', 'ASIA', 'AFRICA', 'AMERICAS', 'OCEANIA', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('LAND', 'BRIDGE_TUNNEL');

-- CreateEnum
CREATE TYPE "Direction8" AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');

-- CreateEnum
CREATE TYPE "HeatTier" AS ENUM ('FOUND', 'BURNING', 'HOT', 'WARM', 'COOL', 'COLD', 'FREEZING');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('TRUESIZE', 'GEOROUTE', 'TERRAHUNT');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('DAILY', 'FREEPLAY', 'BLITZ');

-- CreateEnum
CREATE TYPE "RegionFilter" AS ENUM ('WORLD', 'EUROPE', 'ASIA', 'AFRICA', 'AMERICAS', 'OCEANIA');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'WON', 'COMPLETED', 'LOST_TIMEOUT', 'ABANDONED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "countries" (
    "iso2" CHAR(2) NOT NULL,
    "iso3" CHAR(3) NOT NULL,
    "iso_numeric" CHAR(3),
    "name_en" VARCHAR(120) NOT NULL,
    "capital" VARCHAR(120),
    "region" "CountryRegion" NOT NULL,
    "area_km2" DOUBLE PRECISION NOT NULL,
    "population" BIGINT NOT NULL,
    "flag_emoji" VARCHAR(16) NOT NULL,
    "is_playable" BOOLEAN NOT NULL DEFAULT true,
    "is_microstate" BOOLEAN NOT NULL DEFAULT false,
    "has_polygon" BOOLEAN NOT NULL DEFAULT true,
    "label_lat" DOUBLE PRECISION NOT NULL,
    "label_lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("iso2")
);

-- CreateTable
CREATE TABLE "country_aliases" (
    "id" SERIAL NOT NULL,
    "country_iso2" CHAR(2) NOT NULL,
    "alias" VARCHAR(160) NOT NULL,
    "alias_normalized" VARCHAR(160) NOT NULL,

    CONSTRAINT "country_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_neighbors" (
    "country_iso2" CHAR(2) NOT NULL,
    "neighbor_iso2" CHAR(2) NOT NULL,
    "connection_type" "ConnectionType" NOT NULL DEFAULT 'LAND',

    CONSTRAINT "country_neighbors_pkey" PRIMARY KEY ("country_iso2","neighbor_iso2")
);

-- CreateTable
CREATE TABLE "country_distances" (
    "from_iso2" CHAR(2) NOT NULL,
    "to_iso2" CHAR(2) NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "bearing_deg" DOUBLE PRECISION,
    "direction" "Direction8",
    "is_neighbor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "country_distances_pkey" PRIMARY KEY ("from_iso2","to_iso2")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(24) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" SERIAL NOT NULL,
    "game_type" "GameType" NOT NULL,
    "challenge_number" INTEGER NOT NULL,
    "challenge_date" DATE NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" UUID,
    "is_migrated" BOOLEAN NOT NULL DEFAULT false,
    "game_type" "GameType" NOT NULL,
    "mode" "GameMode" NOT NULL,
    "region_filter" "RegionFilter" NOT NULL DEFAULT 'WORLD',
    "daily_challenge_id" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "step_count" INTEGER NOT NULL DEFAULT 0,
    "target_data" JSONB NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truesize_rounds" (
    "session_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "base_iso2" CHAR(2) NOT NULL,
    "target_iso2" CHAR(2) NOT NULL,
    "true_ratio" DOUBLE PRECISION NOT NULL,
    "guessed_ratio" DOUBLE PRECISION,
    "score" INTEGER,
    "answered_at" TIMESTAMPTZ(6),

    CONSTRAINT "truesize_rounds_pkey" PRIMARY KEY ("session_id","round_number")
);

-- CreateTable
CREATE TABLE "georoute_guesses" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "guess_order" INTEGER NOT NULL,
    "country_iso2" CHAR(2) NOT NULL,
    "is_on_optimal_path" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "georoute_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terrahunt_guesses" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "guess_order" INTEGER NOT NULL,
    "country_iso2" CHAR(2) NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "bearing_deg" DOUBLE PRECISION,
    "direction" "Direction8",
    "heat_tier" "HeatTier" NOT NULL,
    "is_neighbor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terrahunt_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_game_stats" (
    "user_id" UUID NOT NULL,
    "game_type" "GameType" NOT NULL,
    "daily_played" INTEGER NOT NULL DEFAULT 0,
    "daily_won" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "max_streak" INTEGER NOT NULL DEFAULT 0,
    "last_daily_date" DATE,
    "best_score" INTEGER,
    "best_blitz_ms" INTEGER,
    "total_played" INTEGER NOT NULL DEFAULT 0,
    "total_won" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_game_stats_pkey" PRIMARY KEY ("user_id","game_type")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso3_key" ON "countries"("iso3");

-- CreateIndex
CREATE INDEX "country_aliases_alias_normalized_idx" ON "country_aliases"("alias_normalized");

-- CreateIndex
CREATE INDEX "country_aliases_country_iso2_idx" ON "country_aliases"("country_iso2");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_family_id_idx" ON "refresh_tokens"("user_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_game_type_challenge_date_key" ON "daily_challenges"("game_type", "challenge_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_game_type_challenge_number_key" ON "daily_challenges"("game_type", "challenge_number");

-- CreateIndex
CREATE INDEX "game_sessions_game_type_mode_status_score_duration_ms_idx" ON "game_sessions"("game_type", "mode", "status", "score" DESC, "duration_ms" ASC);

-- CreateIndex
CREATE INDEX "game_sessions_guest_id_idx" ON "game_sessions"("guest_id");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_started_at_idx" ON "game_sessions"("user_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_user_id_daily_challenge_id_key" ON "game_sessions"("user_id", "daily_challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_guest_id_daily_challenge_id_key" ON "game_sessions"("guest_id", "daily_challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "georoute_guesses_session_id_country_iso2_key" ON "georoute_guesses"("session_id", "country_iso2");

-- CreateIndex
CREATE UNIQUE INDEX "georoute_guesses_session_id_guess_order_key" ON "georoute_guesses"("session_id", "guess_order");

-- CreateIndex
CREATE UNIQUE INDEX "terrahunt_guesses_session_id_country_iso2_key" ON "terrahunt_guesses"("session_id", "country_iso2");

-- CreateIndex
CREATE UNIQUE INDEX "terrahunt_guesses_session_id_guess_order_key" ON "terrahunt_guesses"("session_id", "guess_order");

-- AddForeignKey
ALTER TABLE "country_aliases" ADD CONSTRAINT "country_aliases_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_neighbor_iso2_fkey" FOREIGN KEY ("neighbor_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_distances" ADD CONSTRAINT "country_distances_from_iso2_fkey" FOREIGN KEY ("from_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_distances" ADD CONSTRAINT "country_distances_to_iso2_fkey" FOREIGN KEY ("to_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_daily_challenge_id_fkey" FOREIGN KEY ("daily_challenge_id") REFERENCES "daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truesize_rounds" ADD CONSTRAINT "truesize_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truesize_rounds" ADD CONSTRAINT "truesize_rounds_base_iso2_fkey" FOREIGN KEY ("base_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truesize_rounds" ADD CONSTRAINT "truesize_rounds_target_iso2_fkey" FOREIGN KEY ("target_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georoute_guesses" ADD CONSTRAINT "georoute_guesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georoute_guesses" ADD CONSTRAINT "georoute_guesses_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrahunt_guesses" ADD CONSTRAINT "terrahunt_guesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrahunt_guesses" ADD CONSTRAINT "terrahunt_guesses_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_game_stats" ADD CONSTRAINT "user_game_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
