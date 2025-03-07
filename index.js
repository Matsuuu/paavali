import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import XLSX from "xlsx";
import { Readable } from "stream";
import { parse } from "csv-parse/sync";
import { splitMultiNeighborhoods } from "./multi-part-identifier.js";

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
function downloadFile(url, name) {
    return new Promise(async resolve => {
        const response = await fetch(url);
        const fileStream = createWriteStream(DOWNLOADS_DIR + "/" + name);
        Readable.fromWeb(response.body)
            .pipe(fileStream)
            .on("finish", () => {
                console.log("Downloaded ", DOWNLOADS_DIR + "/" + name);
                resolve();
            });
    });
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

/**
 * @typedef Region
 * @property { string } name_fi
 * @property { string } name_sv
 * @property { string } name_en
 * @property { string } number
 * @property { Record<string, Municipality> } municipalities
 * */

/**
 * @typedef Municipality
 * @property { string } name_fi
 * @property { string } name_sv
 * @property { string } name_en
 * @property { string } number
 * @property { Neighborhood[] } neighborhoods
 * */

/**
 * @typedef Neighborhood
 * @property { string } name_fi
 * @property { string } name_sv
 * @property { string } zip
 * */

function processFiles() {
    let municipalityData = readDownload(FILE_MAPPINGS.MUNICIPALITY_CSV);
    const municipalityRows = municipalityData.split("\n");
    municipalityRows.shift(); // Remove trash row
    municipalityData = municipalityRows.join("\n");

    console.log("Processing municipality data");
    const munisCsv = parse(municipalityData, {
        from: 1,
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    /** @type { Record<string, Region> } */
    const regions = {};
    for (const row of munisCsv) {
        const regionNumber = row["Maakunnan koodi"];
        if (!regions[regionNumber]) {
            regions[regionNumber] = {
                name_fi: row["Maakunta"],
                name_sv: row["Maakunnan nimi ruotsiksi"],
                name_en: row["Maakunnan nimi englanniksi"],
                number: regionNumber,
                municipalities: {},
            };
        }

        const municipalityNumber = row["Kunnan numero"];

        regions[regionNumber].municipalities[municipalityNumber] = {
            name_fi: row["Kunta"].trim(),
            name_en: row["Kunnan nimi englanniksi"].trim(),
            name_sv: row["Kunnan nimi ruotsiksi"].trim(),
            number: municipalityNumber,
            neighborhoods: [],
        };
    }

    console.log("Processing Zip code data");
    const zipsData = readDownload(FILE_MAPPINGS.ZIP_CODE_CSV);

    const zipsCsv = parse(zipsData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });

    const regionsWithNeighborhoodSplit = structuredClone(regions);

    for (const row of zipsCsv) {
        const zip = row["posti_alue"];
        if (!zip) {
            break;
        }
        const regionNumber = row["maakunta"];
        const municipalityNumber = row["kunta"];

        const municipality = regions[regionNumber]?.municipalities?.[municipalityNumber];
        if (!municipality) {
            console.log(row);
            console.log("Can't find", { regionNumber, municipalityNumber });
            continue;
        }
        municipality.neighborhoods.push({
            name_fi: row["nimi"],
            name_sv: row["namn"],
            zip,
        });
    }

    console.log("Writing...");
    if (!existsSync("output")) {
        mkdirSync("output");
    }

    writeFileSync("output/by_zip.json", JSON.stringify(regions, null, 4));
    console.log("Wrote to output/by_zip.json");

    console.log("Splitting multi-parts...");

    for (const row of zipsCsv) {
        const zip = row["posti_alue"];
        if (!zip) {
            break;
        }
        const regionNumber = row["maakunta"];
        const municipalityNumber = row["kunta"];

        const municipality = regionsWithNeighborhoodSplit[regionNumber]?.municipalities?.[municipalityNumber];
        if (!municipality) {
            console.log(row);
            console.log("Can't find", { regionNumber, municipalityNumber });
            continue;
        }

        /** @type { Neighborhood } */
        const neighborhood = {
            name_fi: row["nimi"],
            name_sv: row["namn"],
            zip,
        };

        municipality.neighborhoods = [...municipality.neighborhoods, ...splitMultiNeighborhoods(neighborhood)];
    }

    writeFileSync("output/split_inside_zip.json", JSON.stringify(regionsWithNeighborhoodSplit, null, 4));
    console.log("Wrote to output/split_inside_zip.json");
}

// await getFiles();
// await filesToCSV();
processFiles();
