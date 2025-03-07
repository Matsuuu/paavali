# Paavali

Downloads the region, municipality and zip/neighborhood data from Tilastokeskus and bakes it into a smol json

`output/by_zip.json` contains regions -> cities -> neighborhoods by zip
`output/split_inside_zip.json` contains regions -> cities -> neighborhoods by zip, where one zip can belong to multiple neighborhoods

Sources:

https://stat.fi/fi/luokitukset/tupa - "Kunnat ja kuntapohjaiset aluejaot vuonna 2024 suomeksi, ruotsiksi ja englanniksi (xlsx)"

https://stat.fi/tup/paavo/tietosisalto.html - "Postinumero-kunta -avain 2025 (xlsx)"


## Reasoning

Nobody else provided this kind of data idk

## Usage

Take the data from `./output` or update it by running `npm install && npm start`

The data is downloaded from hardcoded addresses so if it updates, so will this repo's code
