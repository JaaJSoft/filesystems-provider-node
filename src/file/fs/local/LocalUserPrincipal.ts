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

import {UserPrincipal} from "@filesystems/core/file/attribute";
import {Principal} from "@filesystems/core";


export class LocalUserPrincipal implements UserPrincipal {
    private readonly accountName: string | null;
    private readonly uid: number;

    constructor(uid: number, accountName: string | null) {
        this.accountName = accountName;
        this.uid = uid;
    }

    public equals(other: Principal): boolean {
        if (!(other instanceof LocalUserPrincipal)) {
            return false;
        }
        return this.getUid() === other.getUid();
    }

    public getName(): string {
        return this.accountName ? this.accountName : this.uid.toString();
    }


    public getUid(): number {
        return this.uid;
    }
}
