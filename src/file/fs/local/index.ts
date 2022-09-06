import {LocalFileSystemProvider} from "./LocalFileSystemProvider";
import {FileSystemProviders} from "@filesystems/core/file/spi";

export * from "./LocalFileSystem";
export * from "./LocalFileSystemProvider";
export * from "./LocalPath";
export * from "./LocalPathType";
export * from "./LocalDirectoryStream";
export * as view from "./view";
export * from "./LocalUserPrincipal";
export * from "./LocalGroupPrincipal";
/* Registering the LocalFileSystemProvider with the FileSystemProviders class. */
FileSystemProviders.addProvider(new LocalFileSystemProvider());
