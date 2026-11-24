-- CreateEnum
CREATE TYPE "CountryRegion" AS ENUM ('EUROPE', 'ASIA', 'AFRICA', 'AMERICAS', 'OCEANIA');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('DAILY', 'FREEPLAY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'WON', 'GAVE_UP');

-- CreateTable
CREATE TABLE "countries" (
    "iso2" CHAR(2) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "capital" VARCHAR(120),
    "region" "CountryRegion" NOT NULL,
    "subregion" VARCHAR(80) NOT NULL,
    "population" INTEGER NOT NULL,
    "area_km2" DOUBLE PRECISION NOT NULL,
    "is_landlocked" BOOLEAN NOT NULL,
    "avg_temp_c" DOUBLE PRECISION NOT NULL,
    "flag_emoji" VARCHAR(16) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

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

    CONSTRAINT "country_neighbors_pkey" PRIMARY KEY ("country_iso2","neighbor_iso2")
);

-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" SERIAL NOT NULL,
    "challenge_number" INTEGER NOT NULL,
    "challenge_date" DATE NOT NULL,
    "secret_country_iso2" CHAR(2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "mode" "GameMode" NOT NULL,
    "daily_challenge_id" INTEGER,
    "secret_country_iso2" CHAR(2) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "guess_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geodle_guesses" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "guess_order" INTEGER NOT NULL,
    "guessed_country_iso2" CHAR(2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geodle_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "country_aliases_alias_normalized_idx" ON "country_aliases"("alias_normalized");

-- CreateIndex
CREATE INDEX "country_aliases_country_iso2_idx" ON "country_aliases"("country_iso2");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_challenge_number_key" ON "daily_challenges"("challenge_number");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_challenge_date_key" ON "daily_challenges"("challenge_date");

-- CreateIndex
CREATE INDEX "game_sessions_guest_id_idx" ON "game_sessions"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_guest_id_daily_challenge_id_key" ON "game_sessions"("guest_id", "daily_challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "geodle_guesses_session_id_guessed_country_iso2_key" ON "geodle_guesses"("session_id", "guessed_country_iso2");

-- CreateIndex
CREATE UNIQUE INDEX "geodle_guesses_session_id_guess_order_key" ON "geodle_guesses"("session_id", "guess_order");

-- AddForeignKey
ALTER TABLE "country_aliases" ADD CONSTRAINT "country_aliases_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_neighbor_iso2_fkey" FOREIGN KEY ("neighbor_iso2") REFERENCES "countries"("iso2") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_secret_country_iso2_fkey" FOREIGN KEY ("secret_country_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_daily_challenge_id_fkey" FOREIGN KEY ("daily_challenge_id") REFERENCES "daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_secret_country_iso2_fkey" FOREIGN KEY ("secret_country_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geodle_guesses" ADD CONSTRAINT "geodle_guesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geodle_guesses" ADD CONSTRAINT "geodle_guesses_guessed_country_iso2_fkey" FOREIGN KEY ("guessed_country_iso2") REFERENCES "countries"("iso2") ON DELETE RESTRICT ON UPDATE CASCADE;
