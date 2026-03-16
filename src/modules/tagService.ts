export type TagAction = "add" | "remove" | "set";

export interface TagToolArgs {
  itemKey?: string;
  itemKeys?: string[];
  tags: string[];
  libraryID?: number;
  tagType?: 0 | 1;
}

interface ItemResult {
  success: boolean;
  itemKey: string;
  libraryID?: number;
  itemType?: string;
  title?: string;
  beforeTags?: string[];
  afterTags?: string[];
  addedTags?: string[];
  removedTags?: string[];
  error?: string;
}

export class TagService {
  public async addTags(args: TagToolArgs) {
    return this.runAction("add", args);
  }

  public async removeTags(args: TagToolArgs) {
    return this.runAction("remove", args);
  }

  public async setTags(args: TagToolArgs) {
    return this.runAction("set", args);
  }

  private async runAction(action: TagAction, args: TagToolArgs) {
    const normalized = this.normalizeArgs(action, args);
    const results: ItemResult[] = [];

    for (const itemKey of normalized.itemKeys) {
      try {
        const item = this.findItem(itemKey, normalized.libraryID);
        if (!item) {
          throw new Error(`Item not found: ${itemKey}`);
        }

        const beforeTags = this.extractTags(item);
        const changed = this.applyAction(
          item,
          normalized.action,
          normalized.tags,
          normalized.tagType,
          beforeTags,
        );

        await item.saveTx();
        const afterTags = this.extractTags(item);

        results.push({
          success: true,
          itemKey,
          libraryID: item.libraryID,
          itemType: item.itemType,
          title: this.getItemTitle(item),
          beforeTags,
          afterTags,
          addedTags: changed.addedTags,
          removedTags: changed.removedTags,
        });
      } catch (error) {
        results.push({
          success: false,
          itemKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((item) => item.success).length;

    return {
      success: successCount === results.length,
      action: normalized.action,
      tagsRequested: normalized.tags,
      itemCount: results.length,
      successCount,
      failureCount: results.length - successCount,
      results,
      metadata: {
        extractedAt: new Date().toISOString(),
        message: `Processed ${results.length} item(s) with action ${normalized.action}`,
      },
    };
  }

  private normalizeArgs(action: TagAction, args: TagToolArgs) {
    const itemKeys = Array.from(
      new Set([
        ...(args.itemKey ? [args.itemKey] : []),
        ...(args.itemKeys || []),
      ]),
    ).filter((value) => typeof value === "string" && value.trim().length > 0);

    if (itemKeys.length === 0) {
      throw new Error("Provide itemKey or itemKeys");
    }

    const tags = Array.from(
      new Set((args.tags || []).map((tag) => tag.trim())),
    ).filter((tag) => tag.length > 0);

    if (tags.length === 0 && action !== "set") {
      throw new Error(
        "tags must contain at least one non-empty tag for add/remove",
      );
    }

    return {
      action,
      itemKeys,
      tags,
      libraryID:
        typeof args.libraryID === "number" && Number.isFinite(args.libraryID)
          ? args.libraryID
          : undefined,
      tagType: (args.tagType === 1 ? 1 : 0) as 0 | 1,
    };
  }

  private findItem(itemKey: string, libraryID?: number): any {
    if (libraryID !== undefined) {
      return Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
    }

    const libraries = (Zotero.Libraries.getAll() as any[])
      .map((library) => library.libraryID)
      .filter((value) => typeof value === "number");

    for (const nextLibraryID of libraries) {
      const item = Zotero.Items.getByLibraryAndKey(nextLibraryID, itemKey);
      if (item) {
        return item;
      }
    }

    return null;
  }

  private applyAction(
    item: any,
    action: TagAction,
    tags: string[],
    tagType: 0 | 1,
    beforeTags: string[],
  ) {
    const beforeTagSet = new Set(beforeTags);

    switch (action) {
      case "add":
        for (const tag of tags) {
          item.addTag(tag, tagType);
        }
        break;
      case "remove":
        for (const tag of tags) {
          item.removeTag(tag);
        }
        break;
      case "set":
        for (const existingTag of beforeTags) {
          item.removeTag(existingTag);
        }
        for (const tag of tags) {
          item.addTag(tag, tagType);
        }
        break;
    }

    const afterTags = this.extractTags(item);
    const afterTagSet = new Set(afterTags);

    return {
      addedTags: afterTags.filter((tag) => !beforeTagSet.has(tag)),
      removedTags: beforeTags.filter((tag) => !afterTagSet.has(tag)),
    };
  }

  private extractTags(item: any): string[] {
    return item.getTags().map((entry: { tag: string }) => entry.tag);
  }

  private getItemTitle(item: any): string {
    return (
      item.getDisplayTitle?.() ||
      item.getField?.("title") ||
      item.getField?.("note") ||
      `[${item.itemType || "item"}] ${item.key}`
    );
  }
}

export const tagService = new TagService();
