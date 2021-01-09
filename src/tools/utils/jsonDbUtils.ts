import fs from "fs";
import { Session } from "../../types";
import { logger } from "../logger";
import { fileLocation } from "./fileUtils";

function getSessionsFromDB(filename: string) {
    const data = fs.readFileSync(fileLocation(filename));
    return JSON.parse(data.toString()) as Session[];
}

export async function createDatabaseFile(filename: string) {
    fs.writeFileSync(fileLocation(filename), JSON.stringify([]));
}

/** Saves new session to db, ingores if new is already exists */
export async function saveSession(session: { keyword: string; id: string }, filename: string) {
    let sessions = getSessionsFromDB(filename);

    if (sessions.find((s) => s.keyword == session.keyword)) {
        logger.warn(`Rewriting session ${session.id}. ID: ${session.id}`);
        sessions = sessions.filter((s) => s.keyword != session.keyword);
    }

    sessions.push(session);

    fs.writeFileSync(fileLocation(filename), JSON.stringify(sessions), {
        flag: "w+",
    });
}

export function deleteSession(keyword: string, filename: string) {
    let sessions = getSessionsFromDB(filename);

    sessions = sessions.filter((s) => s.keyword != keyword);

    fs.writeFileSync(fileLocation(filename), JSON.stringify(sessions), {
        flag: "w+",
    });
}

export function getSession(keyword: string, filename: string): Session | null {
    let sessions = getSessionsFromDB(filename);

    const s = sessions.find((s) => s.keyword == keyword);
    if (s) return s;
    else return null;
}
