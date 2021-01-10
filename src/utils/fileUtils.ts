import path from "path";
import fs from "fs";
import { logger } from "../tools/logger";

let storageFileDir = process.cwd();

export function setStorageDir(dir: string) {
    console.log(dir);
    const stat = fs.lstatSync(dir);

    console.log(stat.isDirectory());
    if (stat.isDirectory()) {
        storageFileDir = dir;
    } else {
        logger.error(`Failed to find directory with name ${dir}`);
        throw new Error("Failed to find storage directory.");
    }
}

/**
 * @param name - name of the file
 * @returns full path to the relative file by name */
export function fileLocation(name: string) {
    return path.join(storageFileDir, name);
}

/**
 * @param filename -  Name of the file relative to the directory when programm was started
 */
export async function fileExists(filename: string) {
    return fs.existsSync(fileLocation(filename));
}

export function validFilename(name: string) {
    return new RegExp(/^[-\w^&'@{}[\],$=!#().%+~ ]+$/).test(name);
}
