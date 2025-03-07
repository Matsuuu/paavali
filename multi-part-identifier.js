const MULTI_PART_PREFIXES = [
    //
    "Ala",
    "Ylä",
    "Yli",
    "Etu",
    "Keski",
    "Iso",

    "Itä",
    "Länsi",
    "Etelä",

    "Uusi",
    "Mäki",
    "Luoma",
    "ja",
];

const MULTI_PART_SUFFIXES = [
    //
    "aho",
    "Aho",
];

const JOINERS = ["ja", "och"];

/**
 * @param {string} name
 */
function getNamesArray(name) {
    const parts = name.split("-");
    const names = [];
    let skips = 0;
    for (let i = 0; i < parts.length; i++) {
        if (skips > 0) {
            skips -= 1;
            continue;
        }

        const part = parts[i].trim();
        const nextPart = parts[i + 1]?.trim();

        // e.g. Itä- ja Keski-Pasila
        if (nextPart && JOINERS.some(join => nextPart.startsWith(join))) {
            const nextNextPart = parts[i + 2]?.trim();
            names.push([part, nextPart, nextNextPart].join("-"));
            skips += 2;
            continue;
        }

        // e.g. Iso-heikkilä
        if (MULTI_PART_PREFIXES.some(pre => part === pre)) {
            names.push([part, nextPart].join("-"));
            skips += 1;
            continue;
        }

        // e.g. Kaura-Aho
        if (MULTI_PART_SUFFIXES.some(suf => nextPart === suf)) {
            names.push([part, nextPart].join("-"));
            skips += 1;
            continue;
        }

        // e.g. Sairaala-alue
        const nextPartStart = nextPart?.charAt(0);
        if (nextPartStart && nextPartStart?.toLowerCase() === nextPartStart) {
            names.push([part, nextPart].join("-"));
            skips += 1;
            continue;
        }

        // console.log(part);
        names.push(part);
    }

    return names;
}

/**
 * @param {import(".").Neighborhood} neighborhood
 *
 * @returns {import(".").Neighborhood[]}
 */
export function splitMultiNeighborhoods(neighborhood) {
    let name = neighborhood.name_fi;
    let nameSv = neighborhood.name_sv;
    if (!name.includes("-")) {
        return [neighborhood];
    }

    const names = getNamesArray(name);
    const namesSv = getNamesArray(nameSv);

    return names.map((name, i) => ({
        name_fi: name,
        name_sv: namesSv[i],
        zip: neighborhood.zip,
    }));
}

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Iso-Heikkilä",
//         name_sv: "Storheikkilä",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Punavuori - Bulevardi",
//         name_sv: "Rödbergen - Bulevarden",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Pitkämäki-Muhkuri",
//         name_sv: "Långbacka-Muhkuri",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Punavuori - Eira - Hernesaari",
//         name_sv: "Rödbergen - Eira - Ärtholmen",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Huhkola-Lauste-Vaala",
//         name_sv: "Huhkola-Lauste-Vaala",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Iso-Äiniö-Vähimaa",
//         name_sv: "Iso-Äiniö-Vähimaa",
//         zip: "20100",
//     }),
// );

// console.log(
//     splitMultiNeighborhoods({
//         name_fi: "Kaura-Aho",
//         name_sv: "Kaura-Aho",
//         zip: "20100",
//     }),
// );
