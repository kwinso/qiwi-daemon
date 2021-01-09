import path from "path";
import fs from "fs";

/**
 * @param name - name of the file
 * @returns full path to the relative file by name */
export function fileLocation(name: string) {
    return path.join(process.cwd(), name);
}

/**
 * @param filename -  Name of the file relative to the directory when programm was started
 */
export async function fileExists(filename: string) {
    return fs.existsSync(fileLocation(filename));
}