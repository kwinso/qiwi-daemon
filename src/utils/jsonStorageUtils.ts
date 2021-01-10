import JsonStorageUtils from "fs";
import { Session } from "../types";
import { fileLocation } from "./fileUtils";

let storageFilename = "qiwi-daemon.db.json";

export function setStorageFilename(filename:string) {
    storageFilename = filename;
}

function getSessionsFromDB() {
    const data = JsonStorageUtils.readFileSync(fileLocation(storageFilename));
    return JSON.parse(data.toString()) as Session[];
}

export async function createStorageFile() {
    JsonStorageUtils.writeFileSync(fileLocation(storageFilename), JSON.stringify([]));
}

/** Saves new session to db, ingores if new is already exists */
export async function saveSession(session: { keyword: string; id: string }) {
    let sessions = getSessionsFromDB();

    if (sessions.find((s) => s.keyword == session.keyword)) {
        sessions = sessions.filter((s) => s.keyword != session.keyword);
    }

    sessions.push(session);

    JsonStorageUtils.writeFileSync(fileLocation(storageFilename), JSON.stringify(sessions), {
        flag: "w+",
    });
}

export function deleteSession(keyword: string) {
    let sessions = getSessionsFromDB();

    sessions = sessions.filter((s) => s.keyword != keyword);

    JsonStorageUtils.writeFileSync(fileLocation(storageFilename), JSON.stringify(sessions), {
        flag: "w+",
    });
}

export function getSession(keyword: string): Session | null {
    let sessions = getSessionsFromDB();

    const s = sessions.find((s) => s.keyword == keyword);
    if (s) return s;
    else return null;
}
