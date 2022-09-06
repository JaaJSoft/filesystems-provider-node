import {LocalPath} from "../LocalPath";
import fs from "fs";
import {LocalUserPrincipal} from "../LocalUserPrincipal";
import {getPathStats} from "../Helper";
import {AttributeViewName, FileOwnerAttributeView, UserPrincipal} from "@filesystems/core/file/attribute";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";

/* It implements the FileOwnerAttributeView interface and provides a way to get and set the owner of a file */
export class LocalFileOwnerAttributeView implements FileOwnerAttributeView {

    private static readonly OWNER_NAME: string = "owner";

    private readonly path: LocalPath;
    private readonly followsLinks: boolean;

    constructor(path: LocalPath, followsLinks: boolean) {
        this.path = path;
        this.followsLinks = followsLinks;
    }

    public name(): AttributeViewName {
        return "owner";
    }

    public getOwner(): UserPrincipal {
        const stats = getPathStats(this.path, this.followsLinks);
        return this.buildOwnerUserPrincipal(stats);
    }

    public buildOwnerUserPrincipal(stats: fs.Stats): UserPrincipal {
        return new LocalUserPrincipal(stats.uid, null);

    }

    public setOwner(owner: UserPrincipal): void {
        if (!(owner instanceof LocalUserPrincipal)) {
            throw new UnsupportedOperationException("the type of user must be LocalUserPrincipal");
        }
        const pathLike = this.path.toString();
        const stats = getPathStats(this.path, this.followsLinks);
        if (this.followsLinks) {
            fs.chownSync(pathLike, owner.getUid(), stats.gid);
        } else {
            fs.lchownSync(pathLike, owner.getUid(), stats.gid);
        }
    }

    public readAttributesByName(attributes: string[]): Map<string, Object> {
        const result = new Map<string, Object>();
        for (let attribute of attributes) {
            if (attribute === "*" || attribute === LocalFileOwnerAttributeView.OWNER_NAME) {
                result.set(LocalFileOwnerAttributeView.OWNER_NAME, this.getOwner());
            } else {
                throw new IllegalArgumentException("'" + this.name() + ":" + attribute + "' not recognized");
            }
        }
        return result;
    }

    public setAttributeByName(attribute: string, value: Object): void {
        if (attribute === LocalFileOwnerAttributeView.OWNER_NAME) {
            this.setOwner(value as UserPrincipal);
        } else {
            throw new IllegalArgumentException("'" + this.name() + ":" + attribute + "' not recognized");
        }
    }


}
