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

import {LocalPath} from "../LocalPath";
import fs from "fs";
import {LocalUserPrincipal} from "../LocalUserPrincipal";
import {getPathStats} from "../Helper";
import {AttributeViewName, FileOwnerAttributeView, UserPrincipal} from "@filesystems/core/file/attribute";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import fsAsync from "fs/promises";

/* It implements the FileOwnerAttributeView interface and provides a way to get and set the owner of a file */
export class LocalFileOwnerAttributeView implements FileOwnerAttributeView {

    private static readonly OWNER_NAME: string = "owner";

    private readonly path: LocalPath;
    private readonly followsLinks: boolean;

    constructor(path: LocalPath, followsLinks: boolean) {
        this.path = path;
        this.followsLinks = followsLinks;
    }

    public name(): AttributeViewName {
        return "owner";
    }

    public async getOwner(): Promise<UserPrincipal> {
        const stats = await getPathStats(this.path, this.followsLinks);
        return this.buildOwnerUserPrincipal(stats);
    }

    public buildOwnerUserPrincipal(stats: fs.Stats): UserPrincipal {
        return new LocalUserPrincipal(stats.uid, null);

    }

    public async setOwner(owner: UserPrincipal): Promise<void> {
        if (!(owner instanceof LocalUserPrincipal)) {
            throw new UnsupportedOperationException("the type of user must be LocalUserPrincipal");
        }
        await this.path.getFileSystem().provider().checkAccess(this.path);
        const pathLike = this.path.toString();
        const stats = await getPathStats(this.path, this.followsLinks);
        if (this.followsLinks) {
            await fsAsync.chown(pathLike, owner.getUid(), stats.gid);
        } else {
            await fsAsync.lchown(pathLike, owner.getUid(), stats.gid);
        }
    }

    public async readAttributesByName(attributes: string[]): Promise<Map<string, Object>> {
        const result = new Map<string, Object>();
        for (let attribute of attributes) {
            if (attribute === "*" || attribute === LocalFileOwnerAttributeView.OWNER_NAME) {
                result.set(LocalFileOwnerAttributeView.OWNER_NAME, this.getOwner());
            } else {
                throw new IllegalArgumentException("'" + this.name() + ":" + attribute + "' not recognized");
            }
        }
        return result;
    }

    public async setAttributeByName(attribute: string, value: Object): Promise<void> {
        if (attribute === LocalFileOwnerAttributeView.OWNER_NAME) {
            await this.setOwner(value as UserPrincipal);
        } else {
            throw new IllegalArgumentException("'" + this.name() + ":" + attribute + "' not recognized");
        }
    }


}
