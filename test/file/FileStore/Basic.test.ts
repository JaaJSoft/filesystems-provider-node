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

import {Files, FileStore, FileSystems, Path, Paths} from "@filesystems/core/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {createTemporaryDirectory, removeAll} from "../TestUtil";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import os from "os";
import {AccessDeniedException, FileSystemException, NoSuchFileException} from "@filesystems/core/file/exception";

const G: bigint = 1024n * 1024n * 1024n;

function abs(n: bigint): bigint {
    return (n < 0n) ? -n : n;
}

function checkWithin1GB(expected: bigint, actual: bigint) {
    const diff = abs(actual - expected);
    expect(diff > G).toBeFalsy();
}

function fileStoreEquals(fileStore1: FileStore, fileStore2: FileStore) {
    expect(fileStore1.name()).toEqual(fileStore2.name());
    expect(fileStore1.type()).toEqual(fileStore2.type());
    expect(fileStore1.isReadOnly()).toEqual(fileStore2.isReadOnly());
    expect(fileStore1.getBlockSize()).toEqual(fileStore2.getBlockSize());
    expect(fileStore1.getUsableSpace()).toEqual(fileStore2.getUsableSpace());
    expect(fileStore1.getTotalSpace()).toEqual(fileStore2.getTotalSpace());
}

let dir: Path;
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
});

test("Directory should be on FileStore that is writable", async () => {
    expect((await Files.getFileStore(dir)).isReadOnly()).toBeFalsy();
});

test("Two files should have the same FileStore", async () => {
    const file1 = await Files.createFile(dir.resolveFromString("foo"));
    const file2 = await Files.createFile(dir.resolveFromString("bar"));
    const store1 = await Files.getFileStore(file1);
    const store2 = await Files.getFileStore(file2);
    fileStoreEquals(store1, store2);
});
test("Windows: FileStore.equals() should not be case sensitive", async () => {
    if (os.platform() === "win32") {
        const upper = Files.getFileStore(await Paths.of("C:\\"));
        const lower = Files.getFileStore(await Paths.of("c:\\"));
        expect(upper).toEqual(lower);
    }
});

test("File and FileStore attributes", async () => {
    const file1 = await Files.createFile(dir.resolveFromString("foo"));
    const store1 = await Files.getFileStore(file1);

    expect(store1.supportsFileAttributeView("basic")).toBeTruthy();
    expect(store1.supportsFileAttributeView("posix")).toBeTruthy();
    expect(store1.supportsFileAttributeView("owner")).toBeTruthy();

    expect(store1.supportsFileAttributeView("user")).toBeFalsy();
    expect(store1.supportsFileAttributeView("acl")).toBeFalsy();
    expect(store1.supportsFileAttributeView("dos")).toBeFalsy();
});

test("Space attributes", async () => {
    const file1 = await Files.createFile(dir.resolveFromString("foo"));
    const store1 = await Files.getFileStore(file1);

    const total = store1.getTotalSpace();
    const usable = store1.getUsableSpace();

    // get values by name
    checkWithin1GB(total, store1.getAttribute("totalSpace") as bigint);
    checkWithin1GB(usable, store1.getAttribute("usableSpace") as bigint);
});

test("Enumerate all FileStores", async () => {
    let prev: FileStore | null = null;
    for (const store of await (await FileSystems.getDefault()).getFileStores()) {
        // check space attributes are accessible
        try {
            store.getTotalSpace();
            store.getUnallocatedSpace();
            store.getUsableSpace();
        } catch (e) {
            if (e instanceof NoSuchFileException) {
                //
            } else if (e instanceof AccessDeniedException) {
                //
            } else if (os.platform() !== "linux" || store.toString().indexOf("/run/user") == -1) {
                expect(e instanceof FileSystemException).toBeTruthy();
            } else {
                //
            }
        }
        // two distinct FileStores should not be equal
        expect(store).not.toEqual(prev);
        prev = store;
    }
});

afterAll(async () => {
    await removeAll(dir);
});
