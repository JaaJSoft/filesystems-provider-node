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

import * as os from "os";
import {DirectoryStream, Files, Path, Paths} from "@filesystems/core/file";
import {Objects} from "@filesystems/core/utils";
import {
    BasicFileAttributes,
    BasicFileAttributeView,
    FileTime,
    PosixFileAttributes,
    PosixFileAttributeView,
    PosixFilePermission,
} from "@filesystems/core/file/attribute";
import {ReadableStreamDefaultReadDoneResult, ReadableStreamDefaultReadValueResult, TextDecoderStream} from "stream/web";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../../src";
import {LocalFileStore} from "../../../../src/file/fs/local/LocalFileStore";

FileSystemProviders.register(new LocalFileSystemProvider());

const rootPath: Promise<Path> = Paths.of("/");
const cPath: Promise<Path> = Paths.of("C:/");
const currentPath: Promise<Path> = Paths.of(".");

test("LocalPathRoot", async () => {
    const myRoot = (await rootPath).getRoot();
    expect(myRoot?.equals(await rootPath)).toBeTruthy();
});

test("LocalPathRootWithURL", async () => {
    const root = Paths.ofURL(new URL(os.platform() === "win32" ? "file://c:/" : "file:///"));
    expect((await root).getRoot()?.equals(await root)).toBeTruthy();
});

test("LocalPathNotRootWithURL", async () => {
    if (os.platform() === "win32") {
        const path = await Paths.ofURL(new URL("file://D:/test.txt"));
        expect(path.getRoot()?.equals(await rootPath)).toBeFalsy();
    }
});

test("LocalPathExists", async () => {
    const nullPath = Paths.ofURL(new URL("file:///T:/"));
    expect(await Files.exists(await nullPath)).toBeFalsy();
});

test("LocalPathCurrentToAbsolutePath", async () => {
    const absolutePath = (await currentPath)?.toAbsolutePath();
    Objects.requireNonNullUndefined(absolutePath);
    expect(absolutePath?.isAbsolute()).toBeTruthy();
    expect(absolutePath?.getRoot()?.toURL().toString() === absolutePath?.toURL().toString()).toBeFalsy();
});

test("LocalPathCurrentGetRoot", async () => {
    expect((await currentPath).getRoot()).toBeNull();
    if (os.platform() == "win32") {
        expect((await currentPath).toAbsolutePath().getRoot()).toBeDefined();
    } else {
        expect((await currentPath).toAbsolutePath().getRoot()?.equals((await rootPath).toAbsolutePath())).toBeTruthy();
    }
});

test("LocalPathNewImputStream", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\inputstream.txt");

    } else {
        path = await Paths.of("/tmp/inputstream.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "aaaaBaFFfffGGGtgrZTff");
    const readableStream: ReadableStream<Uint8Array> = Files.newInputStream(path);
    const textDecoderStream = new TextDecoderStream();

    readableStream.pipeTo(textDecoderStream.writable);

    const reader: ReadableStreamDefaultReader<string> = textDecoderStream.readable.getReader();
    let done = false;
    let output = "";
    while (!done) {
        const v: ReadableStreamDefaultReadValueResult<string> | ReadableStreamDefaultReadDoneResult = await reader.read();
        done = v.done;
        if (!done) {
            output += v.value;
        }
    }
    await Files.deleteIfExists(path);
    expect(output).toBe("aaaaBaFFfffGGGtgrZTff");
});

test("LocalPathNewBufferedReader", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\bufferedRead.txt");
    } else {
        path = await Paths.of("/tmp/bufferedRead.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "aaaaBaFFfffGGGtgrZTff");
    const readableStream: ReadableStream<string> = await Files.newBufferedReader(path);
    const reader: ReadableStreamDefaultReader<string> = readableStream.getReader();
    let done = false;
    let output = "";
    while (!done) {
        const v: ReadableStreamDefaultReadValueResult<string> | ReadableStreamDefaultReadDoneResult = await reader.read();
        done = v.done;
        if (!done) {
            output += v.value;
        }
    }
    await Files.deleteIfExists(path);
    expect(output).toBe("aaaaBaFFfffGGGtgrZTff");
});

test("LocalPathReadAllBytes", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\bytes.txt");
    } else {
        path = await Paths.of("/tmp/bytes.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "aaaaBaFFfffGGGtgrZTff");
    expect((await Files.readAllBytes(path)).toString()).toEqual("97,97,97,97,66,97,70,70,102,102,102,71,71,71,116,103,114,90,84,102,102");
    await Files.deleteIfExists(path);
});

test("LocalPathReadString", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "aaaaBaFFfffGGGtgrZTff");
    expect((await Files.readString(path))).toEqual("aaaaBaFFfffGGGtgrZTff");
    await Files.deleteIfExists(path);
});

test("LocalPathReadAllString", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ2.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ2.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "aaaaBaFFfffGGGtgrZTff\ntest");
    const lines: string[] = await Files.readAllLines(path);
    expect(lines.length).toEqual(2);
    expect(lines[0]).toEqual("aaaaBaFFfffGGGtgrZTff");
    expect(lines[1]).toEqual("test");
    await Files.deleteIfExists(path);
});

test("LocalPathNewBufferedWriter", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ3.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ3.txt");
    }
    await Files.deleteIfExists(path);
    const writableStream: WritableStream<string> = await Files.newBufferedWriter(path);
    const writer: WritableStreamDefaultWriter<string> = writableStream.getWriter();
    await writer.write("test");
    await writer.releaseLock();
    await writableStream.close();
    expect(await Files.readString(path)).toEqual("test");
    await Files.deleteIfExists(path);
});

test("LocalPathWriteString", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ4.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ4.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeString(path, "test");
    expect(await Files.readString(path)).toEqual("test");
    await Files.deleteIfExists(path);
});

test("LocalPathWriteBytes", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ5.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ5.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeBytes(path, Uint8Array.of(1, 2, 3, 4));
    expect((await Files.readAllBytes(path)).toString()).toEqual("1,2,3,4");
    await Files.deleteIfExists(path);
});

test("LocalPathDirectoryStream", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("C:\\Users");
        const ds: DirectoryStream<Path> = await Files.newDirectoryStream(path, p => p ? p.toString().endsWith(".ini") : false);
        const files = [];
        for await (const d of ds) {
            files.push(d);
        }
        expect(files.length).toEqual(1);
    } else {
        path = await Paths.of("/tmp/");
        // TODO make a better test
    }
});

test("LocalPathReadBasicAttributes", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ6.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ6.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeBytes(path, Uint8Array.of(1, 2, 3, 4));
    const basicFileAttributeView: BasicFileAttributeView = await Files.getFileAttributeView(path, "basic") as BasicFileAttributeView;
    const basicFileAttributes: BasicFileAttributes = await basicFileAttributeView.readAttributes();
    expect(basicFileAttributes.size()).toEqual(4n);
    await basicFileAttributeView.setTimes(FileTime.fromMillis(0), FileTime.fromMillis(0), FileTime.fromMillis(0));
    expect((await basicFileAttributeView.readAttributes()).lastModifiedTime().toMillis()).toBe(0);
    await Files.deleteIfExists(path);
});

test("LocalPathSetBasicAttributes", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ7.txt");
    } else {
        path = await Paths.of("/tmp/JAAJ7.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeBytes(path, Uint8Array.of(1, 2, 3, 4));
    const attributes: Map<string, unknown> = await Files.readAttributes(path, "size");
    expect(attributes.get("size")).toEqual(4n);
    const basicAttributes: Map<string, unknown> = await Files.readAttributes(path, "basic:size");
    expect(basicAttributes.get("size")).toEqual(4n);
    const posixAttributes: Map<string, unknown> = await Files.readAttributes(path, "posix:size");
    expect(posixAttributes.get("size")).toEqual(4n);
    await Files.setAttribute(path, "posix:lastModifiedTime", FileTime.fromMillis(0));
    const posixAttributes2: Map<string, unknown> = await Files.readAttributes(path, "posix:lastModifiedTime");
    expect((posixAttributes2.get("lastModifiedTime") as FileTime).toMillis()).toEqual(0);
    await Files.deleteIfExists(path);
});

test("LocalPathReadPosixAttributes", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ7txt");
    } else {
        path = await Paths.of("/tmp/JAAJ7.txt");
    }
    await Files.deleteIfExists(path);
    await Files.writeBytes(path, Uint8Array.of(1, 2, 3, 4));
    const posixFileAttributeView: PosixFileAttributeView = await Files.getFileAttributeView(path, "posix") as PosixFileAttributeView;
    const posixFileAttributes: PosixFileAttributes = await posixFileAttributeView.readAttributes();
    expect(posixFileAttributes.size()).toEqual(4n);
    await posixFileAttributeView.setTimes(FileTime.fromMillis(0), FileTime.fromMillis(0), FileTime.fromMillis(0));
    expect((await posixFileAttributeView.readAttributes()).lastModifiedTime().toMillis()).toBe(0);
    if (os.platform() !== "win32") {
        const permissions = posixFileAttributes.permissions();
        expect(permissions).toContain(PosixFilePermission.OWNER_READ);
        expect(permissions).toContain(PosixFilePermission.OWNER_WRITE);
    }
    await Files.deleteIfExists(path);
});


test("path", async () => {
    expect((await Paths.of("")).toAbsolutePath().toString()).toBeDefined();
    expect((await Paths.of(".")).isAbsolute()).toBeFalsy();
    expect((await Paths.of(".")).toString()).toEqual(".");
    expect((await Paths.of(".")).toAbsolutePath().isAbsolute()).toBeTruthy();
    expect((await Paths.of("/")).toString()).toEqual("/");
    expect((await Paths.of("/")).toRealPath().isAbsolute()).toBeTruthy();
});

test("URL", async () => {
    if (os.platform() == "win32") {
        expect((await Paths.of("c:/")).toURL().toString()).toEqual((await Paths.of("c:/")).toURL().toString());
        expect((await Paths.of("c:/")).toURL().toString()).toEqual("file:///c:/");
        expect((await Paths.ofURL(new URL("file://D:/"))).toURL().toString()).toEqual("file:///D:/");
    } else {
        expect((await Paths.of("/")).toURL().toString()).toEqual("file:///");
        expect((await Paths.ofURL(new URL("file:///"))).toURL().toString()).toEqual("file:///");
    }
});

test("URL2", async () => {
    if (os.platform() == "win32") {
        const url: string = (await Paths.of("c:/")).toURL().toString();
        expect((await Paths.ofURL(new URL(url))).equals(await Paths.of("c:/")));
    }
});

test("LocalPathGetFileStore", async () => {
    let path: Path;
    if (os.platform() == "win32") {
        path = await Paths.of("D:\\JAAJ8txt");
    } else {
        path = await Paths.of("/tmp/JAAJ8.txt");
    }
    await Files.deleteIfExists(path);
    const roots: Path[] = [...await path.getFileSystem().getRootDirectories()];
    console.log(roots);
    if (roots.some(async value => value.toString() === "/" || value.toString().toUpperCase() === "C:/")) {
        const fileStore: LocalFileStore = (await Files.getFileStore(path)) as LocalFileStore;
        expect(fileStore.isReadOnly()).toBeFalsy();
        if (os.platform() == "win32") {
            const c: Path = await cPath;
            expect(fileStore.mountPoints().some(async path => c.equals(path))).toBeTruthy();
        } else {
            const root: Path = await rootPath;
            expect(fileStore.mountPoints().some(async path => root.equals(path))).toBeTruthy();
        }
    } else {
        console.warn("Does not have a root ?");
    }

});

test("LocalPathEquals", async () => {
    const tmpPath = await Paths.of("/tmp");
    expect((await rootPath).equals(await rootPath)).toBeTruthy();
    expect((await rootPath).equals(tmpPath)).toBeFalsy();
    expect((await rootPath).equals(await cPath)).toBeFalsy();
    expect((await rootPath).equals((await tmpPath).getParent())).toBeTruthy();
});
