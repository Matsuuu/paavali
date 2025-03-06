import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import XLSX from "xlsx";
import { Readable } from "stream";

const MUNICIPALITY_INFO_EXCEL_URL = "https://media.graphassets.com/DICwBPn5Q8uifsM6dwow";
const ZIP_CODE_INFO_EXCEL_URL = "https://stat.fi/media/uploads/tup/paavo/alueryhmittely_posnro_2025_fi.xlsx";

const DOWNLOADS_DIR = "downloads";

const FILE_MAPPINGS = {
    MUNICIPALITY_EXCEL: "munis.xlsx",
    ZIP_CODE_EXCEL: "zips.xlsx",
    MUNICIPALITY_CSV: "munis.csv",
    ZIP_CODE_CSV: "zips.csv",
};

/**
 * @param {string | URL | Request} url
 * @param {import("fs").PathOrFileDescriptor} name
 */
async function downloadFile(url, name) {
    const response = await fetch(url);
    const fileStream = createWriteStream(DOWNLOADS_DIR + "/" + name);
    Readable.fromWeb(response.body).pipe(fileStream);
    console.log("Downloaded ", DOWNLOADS_DIR + "/" + name);
}

async function filesToCSV() {
    const handle = (from, to) => {
        console.log("Reading xlsx file");
        const workBook = XLSX.readFile(from);
        console.log("Writing xlsx entity to csv");
        XLSX.writeFile(workBook, to, { bookType: "csv" });
    };

    console.log("Transforming Municipality Excel to CSV");
    handle(
        DOWNLOADS_DIR + "/" + FILE_MAPPINGS.MUNICIPALITY_EXCEL,
        DOWNLOADS_DIR + "/" + FILE_MAPPINGS.MUNICIPALITY_CSV,
    );

    console.log("Transforming Zip Code Excel to CSV");
    handle(DOWNLOADS_DIR + "/" + FILE_MAPPINGS.ZIP_CODE_EXCEL, DOWNLOADS_DIR + "/" + FILE_MAPPINGS.ZIP_CODE_CSV);
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

    await downloadFile(MUNICIPALITY_INFO_EXCEL_URL, FILE_MAPPINGS.MUNICIPALITY_EXCEL);
    await downloadFile(ZIP_CODE_INFO_EXCEL_URL, FILE_MAPPINGS.ZIP_CODE_EXCEL);
}

function processFiles() {
    const municipalityData = readDownload(FILE_MAPPINGS.MUNICIPALITY_CSV);
    const municipalityRows = municipalityData.split("\n");
    municipalityRows.shift(); // Remove trash row

    const headers = municipalityRows.shift().split(",");
    console.log(headers);

    const regionFiIndex = headers.findIndex(col => col.trim() === "Maakunta");
    const regionSvIndex = headers.findIndex(col => col === "Maakunnan nimi ruotsiksi");
    const regionEnIndex = headers.findIndex(col => col === "Maakunnan nimi englanniksi");
    const regionNumberIndex = headers.findIndex(col => col === "Maakunnan koodi");

    const munFiIndex = headers.findIndex(col => col === "Kunta");
    const munEnIndex = headers.findIndex(col => col === "Kunnan nimi englanniksi");
    const munSvIndex = headers.findIndex(col => col === "Kunnan nimi ruotsiksi");
    const munNumberIndex = headers.findIndex(col => col === "Kunnan numero");

    const regions = {};
    for (const rowString of municipalityRows) {
        const row = rowString.split(",");
        const regionNumber = row[regionNumberIndex];
        if (!regions[regionNumber]) {
            regions[regionNumber] = {
                name_fi: row[regionFiIndex],
                name_sv: row[regionSvIndex],
                name_en: row[regionEnIndex],
                number: row[regionNumberIndex],
                municipalities: [],
            };
        }
        regions[regionNumber].municipalities.push({
            name_fi: row[munFiIndex].trim(),
            name_en: row[munEnIndex].trim(),
            name_sv: row[munSvIndex].trim(),
            number: row[munNumberIndex].trim(),
        });
    }

    if (!existsSync("output")) {
        mkdirSync("output");
    }

    writeFileSync("output/output.json", JSON.stringify(regions, null, 4));
}

// await getFiles();
// await filesToCSV();
processFiles();
