import journalAbbrISO4 from "../data/journal-abbr/journal-abbr-iso4";
import universityPlace from "../data/university-list/university-place";
import iso6393To6391 from "../data/iso-693-3-to-1";

export interface dict {
    [key: string]: string;
}

/* 
    期刊缩写数据
    Key: 全称
    Value: ISO 4 with dot 缩写 
*/
export const journalAbbrlocalData: dict = journalAbbrISO4;

/* 
    高校所在地数据
    Key: 高校名称
    Value: 所在地
*/
export const universityPlaceLocalData: dict = universityPlace;

/* 
    ISO 639-3 code to ISO 639-1 code
    Key: ISO 639-3 code
    Value: ISO 639-1 code
*/
export const iso6393To6391Data: dict = iso6393To6391;
