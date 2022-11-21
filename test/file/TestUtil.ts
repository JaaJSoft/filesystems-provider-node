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


import {Files, FileSystems, FileVisitor, FileVisitResult, Path} from "@filesystems/core/file";
import {IOException, UnsupportedOperationException} from "@filesystems/core/exception";
import {BasicFileAttributes} from "@filesystems/core/file/attribute";
import {Objects} from "@filesystems/core/utils";

export async function createTemporaryDirectoryAt(where: string): Promise<Path> {
    const dir = (await FileSystems.getDefault()).getPath(where);
    return Files.createTempDirectory(where + dir.getFileSystem().getSeparator() + "name");
}

export async function createTemporaryDirectory(): Promise<Path> {
    return Files.createTempDirectory("name");
}

export async function removeAll(dir: Path): Promise<void> {
    await Files.walkFileTree(dir, new class implements FileVisitor<Path> {
        public async preVisitDirectory(dir: Path, attrs?: BasicFileAttributes): Promise<FileVisitResult> {
            return FileVisitResult.CONTINUE;
        }

        public async visitFile(file: Path, attrs: BasicFileAttributes): Promise<FileVisitResult> {
            try {
                await Files.delete(file);
            } catch (x) {
                console.error("Unable to delete %s: %s\n", file, x);
            }
            return FileVisitResult.CONTINUE;
        }

        public async postVisitDirectory(dir: Path, exc?: IOException): Promise<FileVisitResult> {
            try {
                await Files.delete(dir);
            } catch (x) {
                console.error("Unable to delete %s: %s\n", dir, x);
            }
            return FileVisitResult.CONTINUE;
        }


        public async visitFileFailed(file: Path, exc: IOException): Promise<FileVisitResult> {
            console.error("Unable to visit %s: %s\n", file, exc);
            return FileVisitResult.CONTINUE;
        }

    });
}

export async function deleteUnchecked(file: Path) {
    try {
        await Files.delete(file);
    } catch (e) {
        console.error("Unable to delete %s: %s\n", file, e);
    }
}

export async function createDirectoryWithLongPath(dir: Path) {
    let name = "";
    for (let i = 0; i < 240; i++) {
        name = name.concat("A");
    }
    do {
        dir = Objects.requireNonNullUndefined(await (Objects.requireNonNullUndefined(await dir.resolveFromString(name))).resolveFromString("."));
        await Files.createDirectory(dir);
    } while (dir.toString().length < 2048);
    return dir;
}

export async function supportsLinks(dir: Path) {
    const link = Objects.requireNonNullUndefined(await dir.resolveFromString("testlink"));
    const target = Objects.requireNonNullUndefined(await dir.resolveFromString("testtarget"));
    try {
        await Files.createSymbolicLink(link, target);
        await Files.delete(link);
        return true;
    } catch (x) {
        if (x instanceof UnsupportedOperationException) {
            return false;
        } else if (x instanceof IOException) {
            return false;
        }
        throw x;
    }
}
