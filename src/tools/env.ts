import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config({ path: ".qiwi.env" });

const isDebugMode = env("DEBUG", false) == "true";
const requiredVars = ["PAYMENT_AMOUNT", "QIWI_TOKEN", "PHONE_NUMBER"];

export function env(name: string, required = true): string {
    const value = process.env[name];

    if (!value) {
        if (!required) return "";

        logger.error(`Failed to find env variable '${name}'`);

        if (isDebugMode) {
            console.error(
                new Error(`Missing required env variable '${name}'.`)
            );
        }

        process.exit(1);
    }

    return value;
}

export function envCheck() {
    requiredVars.forEach((v) => env(v));
}
