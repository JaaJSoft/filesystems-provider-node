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

import {convertPermissionsToPosix, convertPosixPermissions, getPathStats} from "../Helper";
import fs from "fs";
import {LocalGroupPrincipal} from "../LocalGroupPrincipal";
import {AbstractPosixFileAttributeView} from "@filesystems/core/file/fs/abstract";
import {
    AttributeViewName,
    BasicFileAttributes,
    FileTime,
    GroupPrincipal,
    PosixFileAttributes,
    PosixFileAttributeView,
    PosixFilePermission,
    UserPrincipal,
} from "@filesystems/core/file/attribute";
import {LocalFileOwnerAttributeView} from "./LocalFileOwnerAttributeView";
import {LocalBasicFileAttributesView} from "./LocalBasicFileAttributesView";
import {LocalPath} from "../LocalPath";
import {UnsupportedOperationException} from "@filesystems/core/exception";
import fsAsync from "fs/promises";

export class LocalPosixFileAttributeView extends AbstractPosixFileAttributeView implements PosixFileAttributeView {

    private fileOwnerView: LocalFileOwnerAttributeView;
    private basicAttributesView: LocalBasicFileAttributesView;

    private readonly path: LocalPath;
    private readonly followsLinks: boolean;

    constructor(path: LocalPath, followsLinks: boolean) {
        super();
        this.path = path;
        this.followsLinks = followsLinks;
        this.fileOwnerView = new LocalFileOwnerAttributeView(path, followsLinks);
        this.basicAttributesView = new LocalBasicFileAttributesView(path, followsLinks);
    }

    public name(): AttributeViewName {
        return "posix";
    }

    public buildGroupPrincipal(stats: fs.Stats): GroupPrincipal {
        return new LocalGroupPrincipal(stats.gid, null);
    }

    public async readAttributes(): Promise<PosixFileAttributes> {
        const stats = await getPathStats(this.path, this.followsLinks);
        const basicFileAttributes: BasicFileAttributes = this.basicAttributesView.buildAttributes(stats);
        const owner: UserPrincipal = this.fileOwnerView.buildOwnerUserPrincipal(stats);
        const group: GroupPrincipal = this.buildGroupPrincipal(stats);
        return new class implements PosixFileAttributes {
            public creationTime(): FileTime {
                return basicFileAttributes.creationTime();
            }

            public fileKey(): unknown {
                return basicFileAttributes.fileKey();
            }

            public group(): GroupPrincipal {
                return group;
            }

            public isDirectory(): boolean {
                return basicFileAttributes.isDirectory();
            }

            public isOther(): boolean {
                return basicFileAttributes.isOther();
            }

            public isRegularFile(): boolean {
                return basicFileAttributes.isRegularFile();
            }

            public isSymbolicLink(): boolean {
                return basicFileAttributes.isSymbolicLink();
            }

            public lastAccessTime(): FileTime {
                return basicFileAttributes.lastAccessTime();
            }

            public lastModifiedTime(): FileTime {
                return basicFileAttributes.lastModifiedTime();
            }

            public owner(): UserPrincipal {
                return owner;
            }

            public permissions(): Set<PosixFilePermission> {
                return new Set<PosixFilePermission>(convertPosixPermissions(stats.mode));
            }

            public size(): bigint {
                return basicFileAttributes.size();
            }
        };
    }

    public async getOwner(): Promise<UserPrincipal> {
        return this.fileOwnerView.getOwner();
    }

    public async setOwner(owner: UserPrincipal): Promise<void> {
        await this.fileOwnerView.setOwner(owner);
    }

    public async setGroup(group: GroupPrincipal): Promise<void> {
        if (!(group instanceof LocalGroupPrincipal)) {
            throw new UnsupportedOperationException("the type of group must be LocalGroupPrincipal");
        }
        const pathLike = this.path.toString();
        const stats = await getPathStats(this.path, this.followsLinks);
        if (this.followsLinks) {
            await fsAsync.chown(pathLike, stats.uid, group.getGid());
        } else {
            await fsAsync.lchown(pathLike, stats.uid, group.getGid());
        }
    }

    public async setPermissions(perms: Set<PosixFilePermission>): Promise<void> {
        await this.path.getFileSystem().provider().checkAccess(this.path);
        const mode = convertPermissionsToPosix(perms);
        await fsAsync.chmod(this.path.toString(), mode);
    }

    public async setTimes(lastModifiedTime?: FileTime, lastAccessTime?: FileTime, createTime?: FileTime): Promise<void> {
        await this.basicAttributesView.setTimes(lastModifiedTime, lastAccessTime, createTime);
    }
}
