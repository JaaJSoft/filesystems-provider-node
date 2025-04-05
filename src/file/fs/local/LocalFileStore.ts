/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2025 JaaJSoft
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
import {UnsupportedOperationException} from "@filesystems/core/exception";
import {LocalPath} from "./LocalPath";

/* It represents a drive on the local file system */
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
    private readonly _mountPoints: LocalPath[];
    private readonly _displayName: string;
    private readonly _system: boolean;
    private readonly _fsType: string;

    constructor(
        name: string,
        type: string,
        blockSize: bigint,
        totalSpace: bigint,
        unallocatedSpace: bigint,
        usableSpace: bigint,
        readOnly: boolean,
        removable: boolean,
        isCdrom: boolean,
        mountPoints: LocalPath[],
        displayName: string,
        system: boolean,
        fsType: string,
    ) {
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
        this._fsType = fsType;
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

    public mountPoints(): LocalPath[] {
        return this._mountPoints;
    }

    public displayName(): string {
        return this._displayName;
    }

    public isSystem(): boolean {
        return this._system;
    }

    public getFsType(): string {
        return this._fsType;
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
        if (attribute === "fsType")
            return this.getFsType();
        throw new UnsupportedOperationException("'" + attribute + "' not recognized");
    }

    public getFileStoreAttributeView(name: string): FileStoreAttributeView {
        throw new UnsupportedOperationException("no view supported"); // TODO View ?
    }

    /**
     * If the name is basic, owner, or posix, return true, otherwise return false.
     * @param {string} name - The name of the file attribute view.
     * @returns A boolean value.
     */
    public supportsFileAttributeView(name: string): boolean {
        switch (name) {
            case "basic":
            case "owner":
            case "posix":
                return true;
            default:
                return false;
        }
    }

    public toString(): string {
        return this._displayName;
    }
}

