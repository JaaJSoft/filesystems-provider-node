/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2025 JaaJSoft
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

import {Files, Path, Paths} from "@filesystems/core/file";
import {FileSystemProviders, FileTypeDetectors} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../../src";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {SimpleFileTypeDetector} from "./SimpleFileTypeDetector";

interface ExType {
    extension: string;
    expectedTypes: string[];
}

async function createHTMLFile(): Promise<Path> {
    const file = await Files.createTempFile("foo", ".html");
    await Files.writeString(file, "<html><body>foo</body></html>");
    return file;
}

async function createGrapeFile(): Promise<Path> {
    return Files.createTempFile("red", ".grape");
}

beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    FileTypeDetectors.installedDetectors.push(new SimpleFileTypeDetector());
});
test("exercise default file type detector", async () => {
    const file = await createHTMLFile();
    try {
        const type = await Files.probeContentType(file);
        expect(type).toEqual("text/html");
    } finally {
        await Files.delete(file);
    }
});

test("exercise custom file type detector", async () => {
    const file = await createGrapeFile();
    try {
        const type = await Files.probeContentType(file);
        expect(type).toEqual("grape/unknown");
    } finally {
        await Files.delete(file);
    }
});

const exTypes: ExType[] = [
    // {extension: "adoc", expectedTypes: ["text/plain"]},
    {extension: "bz2", expectedTypes: ["application/bz2", "application/x-bzip2", "application/x-bzip"]},
    {extension: "css", expectedTypes: ["text/css"]},
    {extension: "csv", expectedTypes: ["text/csv"]},
    {extension: "doc", expectedTypes: ["application/msword"]},
    {extension: "docx", expectedTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]},
    {extension: "gz", expectedTypes: ["application/gzip", "application/x-gzip"]},
    {extension: "jar", expectedTypes: ["application/java-archive", "application/x-java-archive", "application/jar"]},
    {extension: "jpg", expectedTypes: ["image/jpeg"]},
    {extension: "js", expectedTypes: ["text/plain", "text/javascript", "application/javascript"]},
    {extension: "json", expectedTypes: ["application/json"]},
    {extension: "markdown", expectedTypes: ["text/markdown"]},
    {extension: "md", expectedTypes: ["text/markdown", "application/x-genesis-rom"]},
    {extension: "mp3", expectedTypes: ["audio/mpeg"]},
    {extension: "mp4", expectedTypes: ["video/mp4"]},
    {extension: "odp", expectedTypes: ["application/vnd.oasis.opendocument.presentation"]},
    {extension: "ods", expectedTypes: ["application/vnd.oasis.opendocument.spreadsheet"]},
    {extension: "odt", expectedTypes: ["application/vnd.oasis.opendocument.text"]},
    {extension: "pdf", expectedTypes: ["application/pdf"]},
    {extension: "php", expectedTypes: ["text/plain", "text/php", "application/x-php", "application/x-httpd-php"]},
    {extension: "png", expectedTypes: ["image/png"]},
    {extension: "ppt", expectedTypes: ["application/vnd.ms-powerpoint"]},
    {extension: "pptx", expectedTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"]},
    // {extension: "py", expectedTypes: ["text/plain", "text/x-python", "text/x-python-script"]},
    {
        extension: "rar",
        expectedTypes: ["application/rar", "application/vnd.rar", "application/x-rar", "application/x-rar-compressed"]
    },
    {extension: "rtf", expectedTypes: ["application/rtf", "text/rtf"]},
    {extension: "webm", expectedTypes: ["video/webm"]},
    {extension: "webp", expectedTypes: ["image/webp"]},
    {extension: "xls", expectedTypes: ["application/vnd.ms-excel"]},
    {extension: "xlsx", expectedTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]},
    {extension: "7z", expectedTypes: ["application/x-7z-compressed"]},
    {extension: "wasm", expectedTypes: ["application/wasm"]},
];

test("Verify that certain extensions are mapped to the correct type", async () => {
    for (const exType of exTypes) {
        const extension = exType.extension;
        const expectedTypes = exType.expectedTypes;
        const file = await Files.createTempFile("foo", "." + extension);
        try {
            const type = await Files.probeContentType(file);
            expect(expectedTypes.some(value => value === type)).toBeTruthy();
        } finally {
            await Files.delete(file);
        }
    }
});

test("Verify type is found when the extension is in a fragment component", async () => {
    const file = await Paths.of("SomePathWith#aFragement.png");
    const type = await Files.probeContentType(file);
    expect(type).toEqual("image/png");
});
