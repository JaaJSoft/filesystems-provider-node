/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2022 JaaJSoft
 *
 * this program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {LocalPath} from "./LocalPath";
import fs from "fs";
import fsAsync from "fs/promises";
import {PosixFilePermission} from "@filesystems/core/file/attribute";
import {CopyOption, LinkOption, OpenOption, StandardCopyOption, StandardOpenOption} from "@filesystems/core/file";

/**
 * It returns the stats of the file at the given path, following symbolic links if the second argument is true
 * @param {LocalPath} path - The path to the file or directory.
 * @param {boolean} followLinks - If true, then the function will follow symbolic links. If false, then the function will
 * not follow symbolic links.
 * @returns A promise that resolves to a fs.Stats object.
 */
export async function getPathStats(path: LocalPath, followLinks: boolean): Promise<fs.Stats> {
    return (followLinks ? fsAsync.stat(path.toURL()) : fsAsync.lstat(path.toURL()));
}

/**
 * It converts a set of permissions to posix number
 * @param perms - The permissions to convert.
 * @returns A number representing the permissions of a file.
 */
export function convertPermissionsToPosix(perms: Iterable<PosixFilePermission>): number {
    let owner = 0;
    let group = 0;
    let others = 0;
    for (const perm of perms) {
        if (perm === PosixFilePermission.OWNER_READ) {
            owner += 4;
        } else if (perm === PosixFilePermission.OWNER_WRITE) {
            owner += 2;
        } else if (perm === PosixFilePermission.OWNER_EXECUTE) {
            owner += 1;
        } else if (perm === PosixFilePermission.GROUP_READ) {
            group += 4;
        } else if (perm === PosixFilePermission.GROUP_WRITE) {
            group += 2;
        } else if (perm === PosixFilePermission.GROUP_EXECUTE) {
            group += 1;
        } else if (perm === PosixFilePermission.OTHERS_READ) {
            others += 4;
        } else if (perm === PosixFilePermission.OTHERS_WRITE) {
            others += 2;
        } else if (perm === PosixFilePermission.OTHERS_EXECUTE) {
            others += 1;
        }
    }
    return owner * 100 + group * 10 + others;
}

/**
 * It takes an array of OpenOption values and returns a number that can be passed to the fs.open() function
 * @param {OpenOption[]} options - OpenOption[] = [StandardOpenOption.READ]
 * @returns A number
 */
export function mapOpenOptionsToFlags(options: OpenOption[] = [StandardOpenOption.READ]): number {
    const flags: number[] = options.flatMap(value => {
        switch (value) {
            case StandardOpenOption.READ:
                return [fs.constants.O_RDONLY];
            case StandardOpenOption.WRITE:
                return [fs.constants.O_WRONLY];
            case StandardOpenOption.APPEND:
                return [fs.constants.O_APPEND];
            case StandardOpenOption.TRUNCATE_EXISTING:
                return [fs.constants.O_TRUNC];
            case StandardOpenOption.CREATE:
                return [fs.constants.O_CREAT];
            case StandardOpenOption.CREATE_NEW:
                return [fs.constants.O_CREAT, fs.constants.O_EXCL];
            case StandardOpenOption.SYNC:
                return [fs.constants.O_SYNC];
            case StandardOpenOption.DSYNC:
                return [fs.constants.O_DSYNC];
            case LinkOption.NOFOLLOW_LINKS:
                return [fs.constants.O_NOFOLLOW];
            default:
                return [];
        }
    });
    if (flags.length === 1) {
        return flags[0];
    }
    return flags.reduce((previousValue, currentValue) => previousValue | currentValue);
}

/**
 * It maps the options passed to the copy method to the flags that are passed to the fs.copyFile method
 * @param {CopyOption[]} options - CopyOption[] = [StandardCopyOption.COPY_ATTRIBUTES]
 * @returns a number.
 */
export function mapCopyOptionsToFlags(options: CopyOption[] = [StandardCopyOption.COPY_ATTRIBUTES]): number {
    const flags: number[] = [];
    if (!options.includes(StandardCopyOption.REPLACE_EXISTING)) {
        flags.push(fs.constants.COPYFILE_EXCL);
    }
    if (options.includes(StandardCopyOption.ATOMIC_MOVE)) {
        flags.push(fs.constants.COPYFILE_FICLONE);
    }
    if (flags.length === 1) {
        return flags[0];
    }
    return flags.reduce((previousValue, currentValue) => previousValue | currentValue);
}

/**
 * It converts a number representing a file's permissions into an array of strings representing the file's permissions
 * @param {number} perms - number - The permissions to convert.
 * @returns An array of PosixFilePermission
 */
export function convertPosixPermissions(perms: number): PosixFilePermission[] {
    const posixFilePermissions: Set<PosixFilePermission> = new Set<PosixFilePermission>();
    if (perms & fs.constants.S_IRUSR) posixFilePermissions.add(PosixFilePermission.OWNER_READ);
    if (perms & fs.constants.S_IWUSR) posixFilePermissions.add(PosixFilePermission.OWNER_WRITE);
    if (perms & fs.constants.S_IXUSR) posixFilePermissions.add(PosixFilePermission.OWNER_EXECUTE);
    if (perms & fs.constants.S_IRGRP) posixFilePermissions.add(PosixFilePermission.GROUP_READ);
    if (perms & fs.constants.S_IWGRP) posixFilePermissions.add(PosixFilePermission.GROUP_WRITE);
    if (perms & fs.constants.S_IXGRP) posixFilePermissions.add(PosixFilePermission.GROUP_EXECUTE);
    if (perms & fs.constants.S_IROTH) posixFilePermissions.add(PosixFilePermission.OTHERS_READ);
    if (perms & fs.constants.S_IWOTH) posixFilePermissions.add(PosixFilePermission.OTHERS_WRITE);
    if (perms & fs.constants.S_IXOTH) posixFilePermissions.add(PosixFilePermission.OTHERS_EXECUTE);
    return [...posixFilePermissions];
}
