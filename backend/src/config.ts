import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://warroom:warroom@localhost:5432/warroom",
  acledApiKey: process.env.ACLED_API_KEY || "",
  acledEmail: process.env.ACLED_EMAIL || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
};
