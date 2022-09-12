/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2022 JaaJSoft
 *
 * this program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {GroupPrincipal} from "@filesystems/core/file/attribute";
import {Principal} from "@filesystems/core";


export class LocalGroupPrincipal implements GroupPrincipal {
    private readonly groupName: string | null;
    private readonly gid: number;

    constructor(uid: number, groupName: string | null) {
        this.groupName = groupName;
        this.gid = uid;
    }

    public equals(other: Principal): boolean {
        if (!(other instanceof LocalGroupPrincipal)) {
            return false;
        }
        return this.getGid() === other.getGid();
    }

    public getName(): string {
        return this.groupName ? this.groupName : this.gid.toString();
    }


    public getGid(): number {
        return this.gid;
    }

}
