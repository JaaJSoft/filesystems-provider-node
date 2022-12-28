import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {Files, LinkOption, Path, Paths} from "@filesystems/core/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {createTemporaryDirectory, deleteUnchecked, supportsLinks} from "../TestUtil";
import os from "os";
import {IOException} from "@filesystems/core/exception";

let dir: Path;
let thisFile: Path;
let thatFile: Path;
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
    thisFile = dir.resolveFromString("thisFile");
    thatFile = dir.resolveFromString("thatFile");
});

test("isHidden", async () => {
    expect(await Files.isHidden(await Paths.of(""))).toBeFalsy();
    expect(await Files.isHidden(dir)).toBeFalsy();

    const file = dir.resolveFromString(".foo");
    if (os.platform() === "win32") {
        // TODO implements DOS view
    }
    expect(await Files.isHidden(file)).toBeTruthy();
});


test("isSameFile for self", async () => {
    expect(await Files.isSameFile(thisFile, thisFile)).toBeTruthy();
});

test("isSameFile Neither files exist", async () => {
    try {
        await Files.isSameFile(thisFile, thatFile);
        await Files.isSameFile(thatFile, thisFile);
        throw new Error("fail");
    } catch (e) {
        expect(e instanceof IOException).toBeTruthy();
    }
});

test("isSameFile One file exists", async () => {
    await Files.createFile(thisFile);
    try {
        await Files.isSameFile(thisFile, thatFile);
        await Files.isSameFile(thatFile, thisFile);
        throw new Error("fail");
    } catch (e) {
        expect(e instanceof IOException).toBeTruthy();
    } finally {
        await Files.deleteIfExists(thisFile);
    }
});

test("isSameFile Both file exists", async () => {
    await Files.createFile(thisFile);
    await Files.createFile(thatFile);
    try {
        expect(await Files.isSameFile(thisFile, thatFile)).toBeFalsy();
        expect(await Files.isSameFile(thatFile, thisFile)).toBeFalsy();
    } finally {
        await Files.deleteIfExists(thisFile);
        await Files.deleteIfExists(thatFile);
    }
});

test("isSameFile Symbolic links", async () => {
    await Files.createSymbolicLink(thatFile, thisFile);
    await Files.createFile(thatFile);
    try {
        expect(await Files.isSameFile(thisFile, thatFile)).toBeTruthy();
        expect(await Files.isSameFile(thatFile, thisFile)).toBeTruthy();
    } finally {
        await deleteUnchecked(thatFile);
        await deleteUnchecked(thisFile);
    }
});

test("Exercise isRegularFile, isDirectory, isSymbolicLink", async () => {
    expect(await Files.isRegularFile(dir)).toBeFalsy();
    expect(await Files.isRegularFile(dir, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
    expect(await Files.isDirectory(dir)).toBeTruthy();
    expect(await Files.isDirectory(dir, [LinkOption.NOFOLLOW_LINKS])).toBeTruthy();
    expect(await Files.isSymbolicLink(dir)).toBeFalsy();

    const file = await Files.createFile(dir.resolveFromString("foo"));
    try {
        expect(await Files.isRegularFile(file)).toBeTruthy();
        expect(await Files.isRegularFile(file, [LinkOption.NOFOLLOW_LINKS])).toBeTruthy();
        expect(await Files.isDirectory(file)).toBeFalsy();
        expect(await Files.isDirectory(file, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
        expect(await Files.isSymbolicLink(file)).toBeFalsy();

        if (await supportsLinks(dir)) {
            const link = dir.resolveFromString("link");

            await Files.createSymbolicLink(link, dir);
            try {
                expect(await Files.isRegularFile(link)).toBeFalsy();
                expect(await Files.isRegularFile(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
                expect(await Files.isDirectory(link)).toBeTruthy();
                expect(await Files.isDirectory(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
                expect(await Files.isSymbolicLink(link)).toBeTruthy();
            } finally {
                await Files.delete(link);
            }

            await Files.createSymbolicLink(link, file);
            try {
                expect(await Files.isRegularFile(link)).toBeTruthy();
                expect(await Files.isRegularFile(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
                expect(await Files.isDirectory(link)).toBeFalsy();
                expect(await Files.isDirectory(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
                expect(await Files.isSymbolicLink(link)).toBeTruthy();
            } finally {
                await Files.delete(link);
            }

            await Files.createLink(link, file);
            try {
                expect(await Files.isRegularFile(link)).toBeTruthy();
                expect(await Files.isRegularFile(link, [LinkOption.NOFOLLOW_LINKS])).toBeTruthy();
                expect(await Files.isDirectory(link)).toBeFalsy();
                expect(await Files.isDirectory(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
                expect(await Files.isSymbolicLink(link)).toBeFalsy();
            } finally {
                await Files.delete(link);
            }
        }

    } finally {
        await Files.delete(file);
    }
});

test("Exercise isReadbale, isWritable, isExecutable, exists, notExists", async () => {
    // should return false when file does not exist
    const doesNotExist = dir.resolveFromString("doesNotExist");
    expect(await Files.isReadable(doesNotExist)).toBeFalsy();
    expect(await Files.isWritable(doesNotExist)).toBeFalsy();
    expect(await Files.isExecutable(doesNotExist)).toBeFalsy();
    expect(await Files.exists(doesNotExist)).toBeFalsy();
    expect(await Files.notExists(doesNotExist)).toBeTruthy();

    const file = await Files.createFile(dir.resolveFromString("foo"));
    try {
        // files exist
        expect(await Files.isReadable(file)).toBeTruthy();
        expect(await Files.isWritable(file)).toBeTruthy();
        expect(await Files.exists(file)).toBeTruthy();
        expect(await Files.notExists(file)).toBeFalsy();
        expect(await Files.isReadable(dir)).toBeTruthy();
        expect(await Files.isWritable(dir)).toBeTruthy();
        expect(await Files.exists(dir)).toBeTruthy();
        expect(await Files.notExists(dir)).toBeFalsy();

        // sym link exists
        if (await supportsLinks(dir)) {
            const link = dir.resolveFromString("link");

            await Files.createSymbolicLink(link, file);
            try {
                expect(await Files.isReadable(link)).toBeTruthy();
                expect(await Files.isWritable(link)).toBeTruthy();
                expect(await Files.exists(link)).toBeTruthy();
                expect(await Files.notExists(link)).toBeFalsy();
            } finally {
                await Files.delete(link);
            }
            // TODO fix exists with symbolicLink
            // await Files.createSymbolicLink(link, doesNotExist);
            // try {
            //     expect(await Files.isReadable(link)).toBeFalsy();
            //     expect(await Files.isWritable(link)).toBeFalsy();
            //     expect(await Files.exists(link)).toBeFalsy();
            //     expect(await Files.exists(link, [LinkOption.NOFOLLOW_LINKS])).toBeTruthy();
            //     expect(await Files.notExists(link)).toBeTruthy();
            //     expect(await Files.notExists(link, [LinkOption.NOFOLLOW_LINKS])).toBeFalsy();
            // } finally {
            //     await Files.delete(link);
            // }
        }

        /**
         *  TODO Test: Edit ACL to deny WRITE and EXECUTE
         */
        /**
         * TODO Test: Windows DOS read-only attribute
         */

    } finally {
        await Files.delete(file);
    }
});
