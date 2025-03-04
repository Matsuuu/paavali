import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const POSTI_PCODE_FILE_URL = "https://www.posti.fi/webpcode/unzip/PCF_20250304.dat";
const PAAVO_POSTAL_CODE_MAPPING_URL =
    "https://pxdata.stat.fi/PXWeb/api/v1/{lang}/Postinumeroalueittainen_avoin_tieto/uusin/paavo_pxt_12ey.px";

const DOWNLOADS_DIR = "downloads";

const FILE_MAPPINGS = {
    POSTI: "posti.dat",
    PAAVO_FI: "paavo_fi.json",
    PAAVO_SV: "paavo_sv.json",
};

/**
 * @param {string | URL | Request} url
 * @param {import("fs").PathOrFileDescriptor} name
 */
async function downloadFile(url, name) {
    const response = await fetch(url);
    let data;

    if (response.headers.get("content-type") === "binary/octet-stream") {
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder("iso-8859-1");
        data = decoder.decode(buffer);
    } else {
        data = await response.text();
    }

    writeFileSync(DOWNLOADS_DIR + "/" + name, data, "utf8");
}

/**
 * @param {string} name
 */
function readDownload(name) {
    return readFileSync(DOWNLOADS_DIR + "/" + name, "utf8");
}

async function getFiles() {
    if (!existsSync(DOWNLOADS_DIR)) {
        mkdirSync(DOWNLOADS_DIR);
    }

    await downloadFile(POSTI_PCODE_FILE_URL, FILE_MAPPINGS.POSTI);
    await downloadFile(PAAVO_POSTAL_CODE_MAPPING_URL.replace("{lang}", "fi"), FILE_MAPPINGS.PAAVO_FI);
    await downloadFile(PAAVO_POSTAL_CODE_MAPPING_URL.replace("{lang}", "sv"), FILE_MAPPINGS.PAAVO_SV);
}

function processFiles() {
    const postiData = readDownload(FILE_MAPPINGS.POSTI);

    /**
     * @param {string} row
     */
    function handlePostiRow(row) {
        const regex =
            /[A-Z]+\d{8}(?<postal_code>\d{5})(?<city_fi>[A-Za-zÖÄÅöäå]*)\s*(?<city_sv>[A-Za-zÖÄÅöäå]*)\s*\d{8}.{6}(?<region_fi>.+?(?=\s))\s*(?<region_sv>.+?(?=\s))/;

        const result = regex.exec(row);
        if (!result) {
            console.log(row);
        }
        return {};
    }

    const postiResult = postiData.split("\n").map(handlePostiRow);

    console.log(postiResult);
}

// await getFiles();
processFiles();
