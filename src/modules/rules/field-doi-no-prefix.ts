import { RuleBase, RuleBaseOptions } from "./rule-base";

class RemoveDOIPrefixOptions implements RuleBaseOptions {}

export default class RemoveDOIPrefix extends RuleBase<RemoveDOIPrefixOptions> {
    constructor(options: RemoveDOIPrefixOptions) {
        super(options);
    }

    apply(item: Zotero.Item): Zotero.Item {
        const doi = item.getField("DOI");
        if (doi && typeof doi == "string") {
            const cleandDOI = Zotero.Utilities.cleanDOI(doi);
            if (cleandDOI) item.setField("DOI", cleandDOI);
        }
        return item;
    }
}
