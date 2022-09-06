import {LocalPath} from "./LocalPath";
import fs from "fs";
import {PosixFilePermission} from "@filesystems/core/file/attribute";

export function getPathStats(path: LocalPath, followLinks: boolean): fs.Stats {
    return (followLinks ? fs.statSync(path.toString()) : fs.lstatSync(path.toString()));
}

export function convertPermissionsToPosix(perms: Iterable<PosixFilePermission>): number {
    let owner = 0;
    let group = 0;
    let others = 0;
    for (let perm of perms) {
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
