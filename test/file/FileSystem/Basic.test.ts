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

import {FileSystem, FileSystems} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {UnsupportedOperationException} from "@filesystems/core/exception";

beforeAll(() => {
    FileSystemProviders.register(new LocalFileSystemProvider());
});

async function checkFileStores(fs: FileSystem): Promise<void> {
    const fileStores = [...(await fs.getFileStores())];
    console.log(fileStores);
    expect(fileStores.length).toBeGreaterThanOrEqual(1);
}

function checkSupported(fs: FileSystem, views: string[]): void {
    for (const view of views) {
        expect(fs.supportedFileAttributeViews().has(view)).toBeTruthy();
    }
}


test("close should throw UOE", async () => {
    const fs = await FileSystems.getDefault();
    try {
        await fs.close();
        throw new Error("fail");
    } catch (e) {
        expect(e instanceof UnsupportedOperationException).toBeTruthy();
    }
});

test("should be open", async () => {
    const fs = await FileSystems.getDefault();
    expect(fs.isOpen()).toBeTruthy();
});

test("should provide read-write access", async () => {
    const fs = await FileSystems.getDefault();
    expect(fs.isReadOnly()).toBeFalsy();
});

test("should use 'file' scheme", async () => {
    const fs = await FileSystems.getDefault();
    expect(fs.provider().getScheme()).toBe("file");
});

test("sanity check FileStores", async () => {
    const fs = await FileSystems.getDefault();
    await checkFileStores(fs);
});

test("sanity check supportedFileAttributeViews", async () => {
    const fs = await FileSystems.getDefault();
    checkSupported(fs, ["basic", "owner", "posix"]);
});

