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

import {FileStore} from "@filesystems/core/file";
import {FileStoreAttributeView} from "@filesystems/core/file/attribute/FileStoreAttributeView";
import {AttributeViewName} from "@filesystems/core/file/attribute";
import {UnsupportedOperationException} from "@filesystems/core/exception";
import {Drive} from "drivelist";

export class LocalFileStore implements FileStore {
    private readonly _name: string;
    private readonly _type: string;
    private readonly _blockSize: bigint;
    private readonly _totalSpace: bigint;
    private readonly _unallocatedSpace: bigint;
    private readonly _usableSpace: bigint;
    private readonly _readOnly: boolean;
    private readonly _removable: boolean;
    private readonly _isCdrom: boolean;
    private readonly _mountPoints: string[];
    private readonly _displayName: string;
    private readonly _system: boolean;

    constructor(name: string, type: string, blockSize: bigint, totalSpace: bigint, unallocatedSpace: bigint, usableSpace: bigint, readOnly: boolean, removable: boolean, isCdrom: boolean, mountPoints: string[], displayName: string, system: boolean) {
        this._name = name;
        this._type = type;
        this._blockSize = blockSize;
        this._totalSpace = totalSpace;
        this._unallocatedSpace = unallocatedSpace;
        this._usableSpace = usableSpace;
        this._readOnly = readOnly;
        this._removable = removable;
        this._isCdrom = isCdrom;
        this._mountPoints = mountPoints;
        this._displayName = displayName;
        this._system = system;
    }

    public static create(drive: Drive): LocalFileStore {
        return new LocalFileStore(drive.device, drive.busType, BigInt(drive.blockSize), drive.size ? BigInt(drive.size) : 0n, 0n, 0n, drive.isReadOnly, drive.isRemovable, false, drive.mountpoints.map(value => value.path), drive.description, drive.isSystem);
    }

    public name(): string {
        return this._name;
    }

    public type(): string {
        return this._type;
    }

    public getBlockSize(): bigint {
        return this._blockSize;
    }

    public getTotalSpace(): bigint {
        return this._totalSpace;
    }

    public getUnallocatedSpace(): bigint {
        return this._unallocatedSpace;
    }

    public getUsableSpace(): bigint {
        return this._usableSpace;
    }

    public isReadOnly(): boolean {
        return this._readOnly;
    }

    public isRemovable(): boolean {
        return this._removable;
    }

    public isCdRom(): boolean {
        return this._isCdrom;
    }

    public mountPoints(): string[] {
        return this._mountPoints;
    }

    public displayName(): string {
        return this._displayName;
    }

    public isSystem(): boolean {
        return this._system;
    }

    /**
     * If the attribute is one of the standard ones, return the value of the corresponding function, otherwise throw an
     * exception.
     * @param {string} attribute - The attribute to get.
     * @returns The attribute of the file system.
     */
    public getAttribute(attribute: string): unknown {
        // standard
        if (attribute === "totalSpace")
            return this.getTotalSpace();
        if (attribute === "usableSpace")
            return this.getUsableSpace();
        if (attribute === "unallocatedSpace")
            return this.getUnallocatedSpace();
        if (attribute === "bytesPerSector")
            return this.getBlockSize();
        if (attribute === "volume:isRemovable")
            return this.isRemovable();
        if (attribute === "volume:isCdrom")
            return this.isCdRom();
        if (attribute === "volume:isSystem")
            return this.isSystem();
        throw new UnsupportedOperationException("'" + attribute + "' not recognized");
    }

    public getFileStoreAttributeView(name: string): FileStoreAttributeView {
        return new class implements FileStoreAttributeView {
            public name(): AttributeViewName {
                return "TOTO";
            }

            public readAttributesByName(attributes: string[]): Promise<Map<string, unknown>> {
                return Promise.resolve(new Map<string, unknown>());
            }

            public setAttributeByName(attribute: string, value: unknown): Promise<void> {
                return Promise.resolve(undefined);
            }
        };
    }

    public supportsFileAttributeView(name: string): boolean {
        return false;
    }

    public toString(): string {
        return this._displayName;
    }
}

