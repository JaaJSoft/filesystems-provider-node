import {Files, Path} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {createTemporaryDirectory, removeAll, supportsLinks} from "../TestUtil";
import {FileTime} from "@filesystems/core/file/attribute";

let testDir: Path;

beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    testDir = await createTemporaryDirectory();
});

afterAll(async () => {
    await removeAll(testDir);
});

async function testLastModifiedTime(path: Path) {
    const now = await Files.getLastModifiedTime(path);
    const zero = FileTime.fromMillis(0);

    let result = await Files.setLastModifiedTime(path, zero);
    expect(result === path).toBeTruthy();
    expect((await Files.getLastModifiedTime(path)).toMillis()).toEqual(zero.toMillis());

    result = await Files.setLastModifiedTime(path, now);
    expect(result === path);
    expect(Math.trunc((await Files.getLastModifiedTime(path)).toMillis() / 1000)).toEqual(Math.trunc(now.toMillis() / 1000));
}

test("regular file", async () => {
    const file = await Files.createFile(testDir.resolveFromString("file"));
    await testLastModifiedTime(file);
});

test("directory", async () => {
    const file = await Files.createDirectory(testDir.resolveFromString("dir"));
    await testLastModifiedTime(file);
});

test("symbolic link", async () => {
    if (await supportsLinks(testDir)) { // TODO symlink
        // const target = await Files.createFile(testDir.resolveFromString("target"));
        // const link = testDir.resolveFromString("link");
        // await Files.createSymbolicLink(link, target);
        // await testLastModifiedTime(link);
    }
});

