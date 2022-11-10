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
import {Objects} from "@filesystems/core/utils";


class PathOps {
    private _path: Path | undefined | null;
    private exc: unknown | undefined | null;

    public static async init(first: string, more?: [string]): Promise<PathOps> {
        console.log();
        const pathOps = new PathOps();
        try {
            pathOps._path = (await FileSystems.getDefault()).getPath(first, more);
            console.log("%s -> %s", first, pathOps._path.toString());
        } catch (e) {
            pathOps.exc = e;
            console.log("%s -> %s", first, e);
        }
        return pathOps;
    }

    path(): Path {
        return this._path;
    }

    checkPath(): void {
        expect(this._path).toBeDefined();
    }

    check(result: Path | null | undefined, expected: string) {
        if (Objects.isNullUndefined(result)) {
            if (Objects.isNullUndefined(expected)) {
                return;
            }
        } else {
            expect(Objects.nonNullUndefined(expected)).toBeTruthy();
            expect(Objects.nonNullUndefined(result)).toBeTruthy();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(result.toString() === expected.toString());
        }

    }

    root(expected: string): PathOps {
        this.checkPath();
        this.check(this._path.getRoot(), expected);
        return this;
    }

    hasRoot(): PathOps {
        this.checkPath();
        expect(Objects.nonNullUndefined(this.path().getRoot())).toBeTruthy();
        return this;
    }

    parent(expected: string): PathOps {
        this.checkPath();
        this.check(this.path().getParent(), expected);
        return this;
    }

    name(expected: string): PathOps {
        this.checkPath();
        this.check(this.path().getFileName(), expected);
        return this;
    }

    element(index: number, expected: string): PathOps {
        this.checkPath();
        this.check(this.path().getName(index), expected);
        return this;
    }

    starts(startIndex: number, endIndex: number, expected: string): PathOps {
        this.checkPath();
        this.check(this.path().subpath(startIndex, endIndex), expected);
        return this;
    }
}

describe("windows", async () => {
    const pathOps: PathOps = await PathOps.init("AAA");
    pathOps.hasRoot();
});
