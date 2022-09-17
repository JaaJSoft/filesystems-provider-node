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

import {FileSystems, Path} from "@filesystems/core/file";
import {LocalFileSystemProvider} from "../../../../src";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import os from "os";

FileSystemProviders.register(new LocalFileSystemProvider());


test("LocalFileSystem", async () => {
    const fileSystem = await FileSystems.getFileSystem(new URL("file://"));
    expect(fileSystem.isReadOnly()).toBeFalsy();
    expect(fileSystem.isOpen()).toBeTruthy();
});

test("LocalFileSystemFileStore", async () => {
    const fileSystem = await FileSystems.getFileSystem(new URL("file://"));
    expect(await fileSystem.getFileStores()).toBeDefined();
});

test("LocalFileSystemGetRootDirectories", async () => {
    const fileSystem = await FileSystems.getFileSystem(new URL("file://"));
    const rootPaths: Path[] = [...await fileSystem.getRootDirectories()];
    if (os.platform() == "win32") {
        expect(rootPaths.length).toBeGreaterThan(1);
    } else {
        expect(rootPaths.length).toBe(1);
    }
});
