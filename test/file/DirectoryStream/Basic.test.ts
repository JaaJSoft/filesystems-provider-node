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
import {DirectoryStream, Files, Path, Paths} from "@filesystems/core/file";
import {createTemporaryDirectory, removeAll} from "../TestUtil";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {IOException} from "@filesystems/core/exception";
import {AccessDeniedException, DirectoryIteratorException} from "@filesystems/core/file/exception";

let dir: Path;
let foo: Path;
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
    foo = await Paths.of("foo");
    await Files.createFile(dir.resolve(foo));
});

test("test that directory has only one file", async () => {
    let ds: DirectoryStream<Path> | undefined;
    try {
        ds = await Files.newDirectoryStream(dir);
        const it = ds[Symbol.asyncIterator]();
        expect((await it.next()).done).toBeFalsy();
        expect((await it.next()).done).toBeTruthy();
    } finally {
        if (ds) {
            ds.close();
        }
    }
});

test("iterate over directory and check there is one entry", async () => {
    let ds: DirectoryStream<Path> | undefined;
    try {
        ds = await Files.newDirectoryStream(dir);
        for await (const entry of ds) {
            expect(foo.equals(entry.getFileName())).toBeTruthy();
        }
    } finally {
        if (ds) {
            ds.close();
        }
    }
});

test("check filtering: f* should match foo", async () => {
    // let ds: DirectoryStream<Path> | undefined;
    // try {
    //     const matcher = dir.getFileSystem().getPathMatcher("glob:f*");
    //     ds = await Files.newDirectoryStream(dir, path => path ? matcher.matches(path.getFileName()) : false);
    //     for await (const entry of ds) {
    //         expect(foo.equals(entry.getFileName())).toBeTruthy();
    //     }
    // } finally {
    //     if (ds) {
    //         ds.close();
    //     }
    // }
});

test("check filtering: z* should not match any files", async () => {
    // let ds: DirectoryStream<Path> | undefined;
    // try {
    //     const matcher = dir.getFileSystem().getPathMatcher("glob:z*");
    //     ds = await Files.newDirectoryStream(dir, path => path ? matcher.matches(path.getFileName()) : false);
    //     for await (const entry of ds) {
    //         expect(foo.equals(entry.getFileName())).toBeTruthy();
    //     }
    // } finally {
    //     if (ds) {
    //         ds.close();
    //     }
    // }
});

test("check that an IOException thrown by a filter is propagated", async () => {
    let ds: DirectoryStream<Path> | undefined;
    try {
        ds = await Files.newDirectoryStream(dir, () => {
            throw new AccessDeniedException(dir.toString());
        });
        ds[Symbol.asyncIterator]().next();
    } catch (e) {
        expect(e instanceof DirectoryIteratorException).toBeTruthy();
        if (e instanceof DirectoryIteratorException) {
            expect(e.getCause() instanceof AccessDeniedException).toBeTruthy();
        }
    } finally {
        if (ds) {
            ds.close();
        }
    }
});


afterAll(async () => {
    await removeAll(dir);
});
