import fs from "fs";
import path from "path";

export type Visitor = (file) => Promise<void>;

export async function getFiles(dir, visitor: Visitor) {
    // Get this directory's contents
    const files = await fs.promises.readdir(dir);
    // Wait on all the files of the directory
    return Promise.all(files
        // Prepend the directory this file belongs to
        .map(f => path.join(dir, f))
        // Iterate the files and see if we need to recurse by type
        .map(async f => {
            // See what type of file this is
            const stats = await fs.promises.stat(f);
            // Recurse if it is a directory, otherwise return the filepath
            return stats.isDirectory() ? getFiles(f, visitor) : visitor(f);
        }));
}


export function gen_id(bookmark: string) {
    return `${bookmark}_${Math.floor(Math.random() * 10_000_000)}`
}

export function gen_path(d: Date) {
    return `${d.getUTCFullYear()}/${d.getUTCMonth()}/${d.getUTCDate()}/${d.getUTCHours()}/${d.getUTCMinutes()}`
}


