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

import {Files, LinkOption, Path} from "@filesystems/core/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../../src";
import {BasicFileAttributes, BasicFileAttributeView} from "@filesystems/core/file/attribute";
import {createTemporaryDirectory, removeAll} from "../../TestUtil";


let dir: Path;
let file: Path;
let link: Path | null;
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
    file = dir.resolveFromString("foo");
    await Files.writeString(file, "this is not an empty file");
    try {
        link = await Files.createSymbolicLink(dir.resolveFromString("link"), file);
    } catch (e) {
        link = null;// not supported
    }
});

afterAll(async () => {
    await removeAll(dir);
});

test("check Attributes Of Directory", async () => {
    const attrs = await Files.readAttributesByName(dir, "basic") as BasicFileAttributes;
    expect(attrs.isDirectory()).toBeTruthy();

    expect(attrs.isRegularFile()).toBeFalsy();
    expect(attrs.isSymbolicLink()).toBeFalsy();
    expect(attrs.isOther()).toBeFalsy();
});
test("check Attributes Of File", async () => {
    let attrs = await Files.readAttributesByName(file, "basic") as BasicFileAttributes;
    expect(attrs.isRegularFile()).toBeTruthy();

    expect(attrs.isDirectory()).toBeFalsy();
    expect(attrs.isSymbolicLink()).toBeFalsy();
    expect(attrs.isOther()).toBeFalsy();

    const view = await Files.getFileAttributeView(file, "basic") as BasicFileAttributeView;
    const dirAttrs = await Files.readAttributesByName(dir, "basic") as BasicFileAttributes;
    await view.setTimes(dirAttrs.lastModifiedTime());

    attrs = await view.readAttributes();
    expect(attrs.lastModifiedTime().toSeconds()).toEqual(dirAttrs.lastModifiedTime().toSeconds());
});

test("check Attributes Of Link", async () => {
    if (link) {
        const attrs = await Files.readAttributesByName(link, "basic", [LinkOption.NOFOLLOW_LINKS]) as BasicFileAttributes;
        expect(attrs.isSymbolicLink()).toBeTruthy();

        expect(attrs.isDirectory()).toBeFalsy();
        expect(attrs.isRegularFile()).toBeFalsy();
        expect(attrs.isOther()).toBeFalsy();
    } else {
        console.warn("links not supported ?");
    }
});
