import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {createTemporaryDirectory, removeAll} from "../TestUtil";
import {Files, Path} from "@filesystems/core/file";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import {
    BasicFileAttributes,
    FileTime,
    PosixFileAttributes,
    PosixFilePermission
} from "@filesystems/core/file/attribute";
import os from "os";

let dir: Path;
let file: Path;
let attrs: BasicFileAttributes
let posix: PosixFileAttributes
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
    file = dir.resolveFromString("foo");
    await Files.createFile(file);
    attrs = await Files.readAttributesByName(file, "basic");
    posix = await Files.readAttributesByName(file, "posix") as PosixFileAttributes;
});

afterAll(async () => {
    await removeAll(dir);
});


test("Exercise getAttribute on basic attributes", async () => {
    expect(attrs.size()).toEqual(await Files.getAttribute(file, "size"));
    expect(attrs.lastModifiedTime()).toEqual(await Files.getAttribute(file, "basic:lastModifiedTime"));
    expect(attrs.lastAccessTime()).toEqual(await Files.getAttribute(file, "lastAccessTime"));
    expect(attrs.creationTime()).toEqual(await Files.getAttribute(file, "basic:creationTime"));
    expect(await Files.getAttribute(file, "isRegularFile") as boolean).toBeTruthy();
    expect(await Files.getAttribute(file, "basic:isDirectory") as boolean).toBeFalsy();
    expect(await Files.getAttribute(file, "isSymbolicLink") as boolean).toBeFalsy();
    expect(await Files.getAttribute(file, "basic:isOther") as boolean).toBeFalsy();
    expect(attrs.fileKey()).toEqual(await Files.getAttribute(file, "basic:fileKey"));
});
test("Exercise setAttribute on basic attributes", async () => {
    const modTime = attrs.lastModifiedTime();
    await Files.setAttribute(file, "basic:lastModifiedTime", FileTime.fromMillis(0));
    expect(await Files.getLastModifiedTime(file)).toEqual(FileTime.fromMillis(0));
    await Files.setAttribute(file, "lastModifiedTime", modTime);
    expect(Math.trunc((await Files.getLastModifiedTime(file)).toMillis() / 1000)).toEqual(Math.trunc(modTime.toMillis() / 1000));
});
test("Exercise readAttributes on basic attributes", async () => {
    let map: Map<string, unknown>;
    map = await Files.readAttributes(file, "*");
    expect(map.size).toBeGreaterThanOrEqual(9);
    expect(attrs.isRegularFile()).toEqual(map.get("isRegularFile")); // check one

    map = await Files.readAttributes(file, "basic:*");
    expect(map.size).toBeGreaterThanOrEqual(9);
    expect(attrs.lastAccessTime()).toEqual(map.get("lastAccessTime")); // check one

    map = await Files.readAttributes(file, "size,lastModifiedTime");
    expect(map.size).toEqual(2);
    expect(attrs.size()).toEqual(map.get("size"));
    expect(attrs.lastModifiedTime()).toEqual(map.get("lastModifiedTime"));
});
test("Exercise getAttribute on posix attributes", async () => {
    expect(posix.permissions()).toEqual(await Files.getAttribute(file, "posix:permissions"));
    expect(posix.owner()).toEqual(await Files.getAttribute(file, "posix:owner"));
    expect(posix.group()).toEqual(await Files.getAttribute(file, "posix:group"));
});

test("Exercise setAttribute on posix attributes", async () => {
    const orig: Set<PosixFilePermission> = posix.permissions();
    const newPerms: Set<PosixFilePermission> = new Set<PosixFilePermission>(orig);
    newPerms.delete(PosixFilePermission.OTHERS_READ);
    newPerms.delete(PosixFilePermission.OTHERS_WRITE);
    newPerms.delete(PosixFilePermission.OTHERS_EXECUTE);
    await Files.setAttribute(file, "posix:permissions", newPerms);
    if (os.platform() !== "win32") {
        expect([...await Files.getPosixFilePermissions(file)]).toEqual([...newPerms]);
        await Files.setAttribute(file, "posix:permissions", orig);
        expect([...await Files.getPosixFilePermissions(file)]).toEqual([...orig]);
    }
    await Files.setAttribute(file, "posix:owner", posix.owner());
    await Files.setAttribute(file, "posix:group", posix.group());
});
test("Exercise readAttributes on posix attributes", async () => {
    let map: Map<string, unknown>;
    map = await Files.readAttributes(file, "posix:*");
    expect(map.size).toBeGreaterThanOrEqual(12);
    expect(posix.permissions()).toEqual(map.get("permissions")); // check one

    map = await Files.readAttributes(file, "posix:size,owner");
    expect(map.size).toEqual(2);
    expect(posix.size()).toEqual(map.get("size"));
    expect(posix.owner()).toEqual(map.get("owner"));
});

test("unsupported views", async () => {
    try {
        await Files.setAttribute(file, "foo:bar", 0);
        throw new Error("UnsupportedOperationException expected");
    } catch (e) {
        expect(e instanceof UnsupportedOperationException).toBeTruthy();
    }
    try {
        await Files.getAttribute(file, "foo:bar");
        throw new Error("UnsupportedOperationException expected");
    } catch (e) {
        expect(e instanceof UnsupportedOperationException).toBeTruthy();
    }
    try {
        await Files.readAttributes(file, "foo:*");
        throw new Error("UnsupportedOperationException expected");
    } catch (e) {
        expect(e instanceof UnsupportedOperationException).toBeTruthy();
    }
});

async function checkBadSet(file: Path, attribute: string, value: unknown) {
    try {
        await Files.setAttribute(file, attribute, value);
        throw new Error("IllegalArgumentException expected");
    } catch (e) {
        expect(e instanceof IllegalArgumentException).toBeTruthy();
    }
}

async function checkBadGet(file: Path, attribute: string) {
    try {
        await Files.getAttribute(file, attribute);
        throw new Error("IllegalArgumentException expected");
    } catch (e) {
        expect(e instanceof IllegalArgumentException).toBeTruthy();
    }
}

async function checkBadRead(file: Path, attribute: string) {
    try {
        await Files.readAttributes(file, attribute);
        throw new Error("IllegalArgumentException expected");
    } catch (e) {
        expect(e instanceof IllegalArgumentException).toBeTruthy();
    }
}

test("bad args", async () => {
    await checkBadSet(file, "", 0);
    await checkBadSet(file, "basic:", 0);
    await checkBadSet(file, "basic:foobar", 0);
    await checkBadGet(file, "");
    await checkBadGet(file, "basic:");
    await checkBadGet(file, "basic:foobar");
    await checkBadGet(file, "basic:size,lastModifiedTime");
    await checkBadGet(file, "basic:*");
    await checkBadRead(file, "");
    await checkBadRead(file, "basic:");
    await checkBadRead(file, "basic:foobar");
    await checkBadRead(file, "basic:size,foobar");
});
