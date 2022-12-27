import {createTemporaryDirectory, supportsLinks} from "../TestUtil";
import {Files, Paths} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {IOException} from "@filesystems/core/exception";
import {FileAlreadyExistsException} from "@filesystems/core/file/exception";

beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
});
test("Test Files.createDirectories symbolic file with an existing directory", async () => {
    // create a temp dir as the "root" in which we will run our tests.
    const top = await createTemporaryDirectory();
    if (!await supportsLinks(top)) {
        console.log("Skipping tests since symbolic links isn't " +
            "supported under directory " + top);
        return;
    }
    console.log("Running tests under directory " + top.toAbsolutePath());
    const fooDir = await Files.createDirectory(top.resolveFromString("foo"));
    expect(await Files.isDirectory(fooDir)).toBeTruthy();
    // now create a symlink to the "foo" dir
    const symlink = await Files.createSymbolicLink(top.resolveFromString("symlinkToFoo"), fooDir.toAbsolutePath());
    expect(await Files.isSymbolicLink(symlink)).toBeTruthy();
    expect(await Files.isDirectory(symlink)).toBeTruthy();

    // now create a directory under the symlink (which effectively creates a directory under "foo")
    const barDir = await Files.createDirectory(symlink.resolveFromString("bar"));
    expect(await Files.isDirectory(barDir)).toBeTruthy();
    // ultimately, we now have this directory structure:
    // <root-dir>
    //   |--- foo
    //   |     |--- bar
    //   |
    //   |--- symlinkToFoo -> (links to) <absolute-path-to-root-dir>/foo


    // now call Files.createDirectories on each of these existing directory/symlink paths
    // and expect each one to succeed
    await Files.createDirectories(fooDir); // ./<root-dir>/foo
    await Files.createDirectories(symlink); // ./<root-dir>/symlinkToFoo
    await Files.createDirectories(barDir); // ./<root-dir>/symlinkToFoo/bar
});

test("Tests Files.createDirectories", async () => {
    const tmpdir = await createTemporaryDirectory();
    // a no-op
    await Files.createDirectories(tmpdir);

    // create one directory
    let subdir = tmpdir.resolveFromString("a");
    await Files.createDirectories(subdir);
    expect(await Files.isDirectory(subdir)).toBeTruthy();

    // create parents
    subdir = subdir.resolveFromString("b/c/d");
    await Files.createDirectories(subdir);
    expect(await Files.isDirectory(subdir)).toBeTruthy();

    // existing file is not a directory
    const file = await Files.createFile(tmpdir.resolveFromString("x"));
    try {
        await Files.createDirectories(file);
        throw new Error("failure expected");
    } catch (x) {
        expect(x instanceof FileAlreadyExistsException).toBeTruthy();
    }
    try {
        await Files.createDirectories(file.resolveFromString("y"));
        throw new Error("failure expected");
    } catch (x) {
        expect(x instanceof IOException).toBeTruthy();
    }

    // the root directory always exists
    const root = await Paths.of("/");
    await Files.createDirectories(root);
    await Files.createDirectories(root.toAbsolutePath());
});
