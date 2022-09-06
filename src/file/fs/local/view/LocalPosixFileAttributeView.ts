import {convertPermissionsToPosix, convertPosixPermissions, getPathStats} from "../Helper";
import fs from "fs";
import {LocalGroupPrincipal} from "../LocalGroupPrincipal";
import {AbstractBasicFileAttributeView, AttributesBuilder} from "@filesystems/core/file/fs/abstract";
import {
    AttributeViewName,
    BasicFileAttributes,
    FileTime,
    GroupPrincipal,
    PosixFileAttributes,
    PosixFileAttributeView,
    PosixFilePermission,
    UserPrincipal,
} from "@filesystems/core/file/attribute";
import {LocalFileOwnerAttributeView} from "./LocalFileOwnerAttributeView";
import {LocalBasicFileAttributesView} from "./LocalBasicFileAttributesView";
import {LocalPath} from "../LocalPath";
import {UnsupportedOperationException} from "@filesystems/core/exception";

export class LocalPosixFileAttributeView extends AbstractBasicFileAttributeView implements PosixFileAttributeView {
    private static readonly PERMISSIONS_NAME: string = "permissions";
    private static readonly OWNER_NAME: string = "owner";
    private static readonly GROUP_NAME: string = "group";
    private static readonly posixAttributeNames: Set<string> = new Set<string>([
        LocalPosixFileAttributeView.PERMISSIONS_NAME,
        LocalPosixFileAttributeView.OWNER_NAME,
        LocalPosixFileAttributeView.GROUP_NAME,
        ...this.basicAttributeNames,
    ]);

    private fileOwnerView: LocalFileOwnerAttributeView;
    private basicAttributesView: LocalBasicFileAttributesView;

    private readonly path: LocalPath;
    private readonly followsLinks: boolean;

    constructor(path: LocalPath, followsLinks: boolean) {
        super();
        this.path = path;
        this.followsLinks = followsLinks;
        this.fileOwnerView = new LocalFileOwnerAttributeView(path, followsLinks);
        this.basicAttributesView = new LocalBasicFileAttributesView(path, followsLinks);
    }

    public name(): AttributeViewName {
        return "posix";
    }

    public buildGroupPrincipal(stats: fs.Stats): GroupPrincipal {
        return new LocalGroupPrincipal(stats.gid, null);
    }

    public readAttributes(): PosixFileAttributes {
        const stats = getPathStats(this.path, this.followsLinks);
        const basicFileAttributes: BasicFileAttributes = this.basicAttributesView.buildAttributes(stats);
        const owner: UserPrincipal = this.fileOwnerView.buildOwnerUserPrincipal(stats);
        const group: GroupPrincipal = this.buildGroupPrincipal(stats);
        return new class implements PosixFileAttributes {
            public creationTime(): FileTime {
                return basicFileAttributes.creationTime();
            }

            public fileKey(): Object {
                return basicFileAttributes.fileKey();
            }

            public group(): GroupPrincipal {
                return group;
            }

            public isDirectory(): boolean {
                return basicFileAttributes.isDirectory();
            }

            public isOther(): boolean {
                return basicFileAttributes.isOther();
            }

            public isRegularFile(): boolean {
                return basicFileAttributes.isRegularFile();
            }

            public isSymbolicLink(): boolean {
                return basicFileAttributes.isSymbolicLink();
            }

            public lastAccessTime(): FileTime {
                return basicFileAttributes.lastAccessTime();
            }

            public lastModifiedTime(): FileTime {
                return basicFileAttributes.lastModifiedTime();
            }

            public owner(): UserPrincipal {
                return owner;
            }

            public permissions(): Set<PosixFilePermission> {
                return new Set<PosixFilePermission>(convertPosixPermissions(stats.mode));
            }

            public size(): bigint {
                return basicFileAttributes.size();
            }
        };
    }

    public getOwner(): UserPrincipal {
        return this.fileOwnerView.getOwner();
    }

    public setOwner(owner: UserPrincipal): void {
        this.path.getFileSystem().provider().checkAccess(this.path);
        this.fileOwnerView.setOwner(owner);
    }

    public setGroup(group: GroupPrincipal): void {
        if (!(group instanceof LocalGroupPrincipal)) {
            throw new UnsupportedOperationException("the type of group must be LocalGroupPrincipal");
        }
        const pathLike = this.path.toString();
        const stats = getPathStats(this.path, this.followsLinks);
        if (this.followsLinks) {
            fs.chownSync(pathLike, stats.uid, group.getGid());
        } else {
            fs.lchownSync(pathLike, stats.uid, group.getGid());
        }
    }

    public setPermissions(perms: Set<PosixFilePermission>): void {
        this.path.getFileSystem().provider().checkAccess(this.path);
        fs.chmodSync(this.path.toString(), convertPermissionsToPosix(perms));
    }

    public setTimes(lastModifiedTime?: FileTime, lastAccessTime?: FileTime, createTime?: FileTime): void {
        this.basicAttributesView.setTimes(lastModifiedTime, lastAccessTime, createTime);
    }


    public readAttributesByName(attributes: string[]): Map<string, Object> {
        const builder = AttributesBuilder.create(LocalPosixFileAttributeView.posixAttributeNames, attributes);
        const posixFileAttributes: PosixFileAttributes = this.readAttributes();
        this.addRequestedBasicAttributes(posixFileAttributes, builder);
        if (builder.match(LocalPosixFileAttributeView.PERMISSIONS_NAME))
            builder.add(LocalPosixFileAttributeView.PERMISSIONS_NAME, posixFileAttributes.permissions());
        if (builder.match(LocalPosixFileAttributeView.OWNER_NAME))
            builder.add(LocalPosixFileAttributeView.OWNER_NAME, posixFileAttributes.owner());
        if (builder.match(LocalPosixFileAttributeView.GROUP_NAME))
            builder.add(LocalPosixFileAttributeView.GROUP_NAME, posixFileAttributes.group());
        return builder.build();
    }

    public setAttributeByName(attribute: string, value: Object): void {
        super.setAttributeByName(attribute, value);
    }
}
