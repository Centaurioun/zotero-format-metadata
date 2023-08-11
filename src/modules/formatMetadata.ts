import { callingLoggerForMethod, progressWindow } from "../utils/logger";
import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import { getString } from "../utils/locale";
import { updateJournalAbbr } from "./rules/field-journalAbbr";
import { updateDate } from "./rules/field-date";
import { updateMetadataByIdentifier } from "./rules/field-retrive";
import { updateLanguage } from "./rules/field-language";
import { capitalizeName } from "./rules/field-creators";
import { updateUniversityPlace } from "./rules/field-place";
import { updateDOI } from "./rules/field-misc";
import { setHtmlTag, titleCase2SentenceCase } from "./rules/field-title";
import { waitUtilAsync } from "../utils/wait";
import { isDuplicate } from "./rules/item-no-duplicate";

export { FormatMetadata, updateOnItemAdd, runInBatch };

export default class FormatMetadata {
    @callingLoggerForMethod
    static unimplemented() {
        window.alert(getString("unimplemented"));
    }

    static updateMetadataByIdentifier = updateMetadataByIdentifier;
    static updateLanguage = updateLanguage;
    static capitalizeName = capitalizeName;
    static updateJournalAbbr = updateJournalAbbr;
    static updateUniversityPlace = updateUniversityPlace;
    static updateDate = updateDate;
    static updateDOI = updateDOI;
    static titleCase2SentenceCase = titleCase2SentenceCase;
    static setHtmlTag = setHtmlTag;

    static checkDuplication = isDuplicate;

    /**
     * 标准格式化流程
     * @param item
     */
    @callingLoggerForMethod
    static async updateStdFlow(item: Zotero.Item) {
        // 作者、期刊、年、期、卷、页 -> 判断语言 -> 作者大小写 -> 匹配缩写 -> 匹配地点 -> 格式化日期 -> 格式化DOI
        getPref("isEnableOtherFields") ? await this.updateMetadataByIdentifier(item) : "skip";
        getPref("isEnableLang") ? await this.updateLanguage(item) : "skip";
        getPref("isEnableCreators") ? await this.capitalizeName(item) : "skip";
        getPref("isEnableAbbr") ? await this.updateJournalAbbr(item) : "skip";
        getPref("isEnablePlace") ? await this.updateUniversityPlace(item) : "skip";
        getPref("isEnableDateISO") && !getPref("isEnableOtherFields") ? await this.updateDate(item) : "skip";
        getPref("isEnableDOI") ? await this.updateUniversityPlace(item) : "skip";
    }

    /**
     * 设置某字段的值
     * @param item 待处理的条目
     * @param field 待处理的条目字段
     * @param value 待处理的条目字段值
     */
    public static async setFieldValue(item: Zotero.Item, field: Zotero.Item.ItemField, value: any) {
        if (value == undefined) {
            return;
        } else {
            item.setField(field, value);
            await item.saveTx();
        }
    }
}

function updateOnItemAdd(items: Zotero.Item[]) {
    const regularItems = items.filter(
        (item) =>
            item.isRegularItem() &&
            // @ts-ignore item has no isFeedItem
            !item.isFeedItem &&
            // @ts-ignore libraryID is got from item, so get() will never return false
            (getPref("updateOnAddedForGroup") ? true : Zotero.Libraries.get(item.libraryID)._libraryType == "user"),
    );
    if (regularItems.length !== 0) {
        addon.hooks.onUpdateInBatch("checkDuplication", regularItems);
        getPref("add.update") ? addon.hooks.onUpdateInBatch("std", regularItems) : "";
        return;
    }
}

async function run(
    item: Zotero.Item,
    task: {
        processor: (...args: any[]) => Promise<void> | void;
        args: any[];
        // this?: any;)
    },
) {
    const args = [item, ...task.args];
    // await task.processor.apply(task.this, args);
    await task.processor(...args);
}

async function runInBatch(
    items: Zotero.Item[],
    task: {
        processor: (...args: any[]) => Promise<void> | void;
        args: any[];
    },
) {
    ztoolkit.log("batch task begin");
    const progress = new ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: false,
        closeTime: -1,
    })
        .createLine({
            type: "default",
            text: getString("info-batch-init"),
            progress: 0,
            idx: 0,
        })
        .createLine({ text: getString("info-batch-break"), idx: 1 })
        .show();

    await waitUtilAsync(() =>
        // @ts-ignore lines可以被访问到
        Boolean(progress.lines && progress.lines[1]._itemText),
    );
    // @ts-ignore lines可以被访问到
    progress.lines[1]._hbox.addEventListener("click", async (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
        state = false;
        progress.changeLine({ text: getString("info-batch-stop-next"), idx: 1 });
    });

    if (items.length == 0) {
        progress.createLine({
            type: "fail",
            text: getString("info-batch-no-selected"),
        });
        return;
    }

    const total = items.length;
    let current = 0,
        errNum = 0,
        state = true;
    progress.changeLine({
        type: "default",
        text: `[${current}/${total}] ${getString("info-batch-running")}`,
        progress: 0,
        idx: 0,
    });

    for (const item of items) {
        if (!state) break;
        try {
            // await Zotero.Promise.delay(3000);
            await run(item, task);
            current++;
            progress.changeLine({
                text: `[${current}/${total}] ${getString("info-batch-running")}`,
                progress: (current / total) * 100,
                idx: 0,
            });
        } catch (err) {
            progress.createLine({
                type: "fail",
                text: getString("info-batch-has-error"),
            });
            ztoolkit.log(err, item);
            errNum++;
        }
    }

    progress.changeLine({
        // type: "default",
        text: `[✔️${current} ${errNum ? ", ❌" + errNum : ""}] ${getString("info-batch-finish")}`,
        progress: 100,
        idx: 0,
    });
    progress.startCloseTimer(5000);
    ztoolkit.log("batch tasks done");
}
