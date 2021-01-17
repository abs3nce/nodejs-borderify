//IMPORT
const fs = require("fs").promises;
const gm = require("gm").subClass({ imageMagick: true });
const sizeOf = require("image-size");

//CONFIG
const BG_COLOR = "#ffffff"; //farba ramu
const SOURCE_FOLDER = "!src_with_test_photos"; //folder odkial sa cerpa fotka
const EXPORTS_FOLDER = "!export"; //folder kam sa uklada oramovana fotka
const TEXT_GREEN = "\x1b[32m";
const TEXT_RED = "\x1b[31m";
const TEXT_RESET = "\x1b[0m";

//vycistit konzolu
function clearConsoleAndScrollbackBuffer() {
    process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
    console.clear();
}

async function sourceFolderExists() {
    let sourceFolderExists = true;
    try {
        await fs.access(`./${SOURCE_FOLDER}`);
    } catch (e) {
        sourceFolderExists = false;
    }

    if (!sourceFolderExists) {
        await fs.mkdir(`./${SOURCE_FOLDER}`);
        process.exit();
    } else {
        console.log(`./> ${SOURCE_FOLDER} found.\n`);
    }
}

//funkcia ktora precita cely source folder a returne images array
async function readSourceFolder(SOURCE_FOLDER) {
    let images = [];
    const files = await fs.readdir(`./${SOURCE_FOLDER}`);
    if (files.length == 0) {
        console.log(`./> No photos in ${SOURCE_FOLDER}\n`);
        console.log(
            "================================================================\n"
        );
        process.exit();
    }
    files.forEach((file) => {
        images.push(file);
    });
    return images;
}

//funkcia na vytvorenie exports folderu
async function createExportsFolder() {
    let exportsFolderExists = true;
    try {
        await fs.access(`./${EXPORTS_FOLDER}`);
    } catch (e) {
        exportsFolderExists = false;
    }

    if (!exportsFolderExists) {
        await fs.mkdir(`./${EXPORTS_FOLDER}`);
        console.log(`${EXPORTS_FOLDER}> Folder created!\n`);
    } else {
        console.log(`${EXPORTS_FOLDER}> Folder already exists.\n`);
    }
}

//funkcia na nastavenie dopocitanie udajov o fotke a backgrounde
async function dataCalculation(image) {
    let imageData = {
        dimensions: {
            width: undefined,
            height: undefined,
        },
        position: {
            posX: undefined,
            posY: undefined,
        },
    };
    let backgroundData = {
        dimensions: {
            width: undefined,
            height: undefined,
        },
        color: BG_COLOR,
    };

    let imageDimensions = sizeOf(`./${SOURCE_FOLDER}/${image}`);
    imageData.dimensions.width = imageDimensions.width;
    imageData.dimensions.height = imageDimensions.height;

    //premena pomeru fotky 3:2 na 5:4 a nasledne nahranie do backgroundInfo
    if (imageData.dimensions.width > imageData.dimensions.height) {
        //na sirku
        backgroundData.dimensions.width = Math.round(
            imageData.dimensions.width
        );
        backgroundData.dimensions.height = Math.round(
            (imageData.dimensions.width / 5) * 4
        );
        //offset fotky o x pixelov na backgrounde
        imageData.position.posX = 0;
        imageData.position.posY = Math.round(
            ((imageData.dimensions.width / 5) * 4 -
                imageData.dimensions.height) /
                2
        );
    } else if (imageData.dimensions.width < imageData.dimensions.height) {
        //na vysku
        backgroundData.dimensions.height = Math.round(
            imageData.dimensions.height
        );
        backgroundData.dimensions.width = Math.round(
            (imageData.dimensions.height / 5) * 4
        );
        //offset fotky o x pixelov na backgrounde
        imageData.position.posX = Math.round(
            ((imageData.dimensions.height / 5) * 4 -
                imageData.dimensions.width) /
                2
        );
        imageData.position.posY = 0;
    } else if (imageData.dimensions.width == imageData.dimensions.height) {
        //stvorec
        backgroundData.dimensions.height = Math.round(
            imageData.dimensions.height
        );
        backgroundData.dimensions.width = Math.round(
            (imageData.dimensions.height * 5) / 4
        );
        //offset fotky o x pixelov na backgrounde
        imageData.position.posX = Math.round(
            ((imageData.dimensions.height * 5) / 4 -
                imageData.dimensions.width) /
                2
        );
        imageData.position.posY = 0;
    }

    return { imageData, backgroundData };
}

//funkcia na vytvorenie backgroundu pre danu fotku
async function createBackground(data) {
    return await new Promise((resolve, reject) => {
        gm(
            data.backgroundData.dimensions.width,
            data.backgroundData.dimensions.height,
            data.backgroundData.color
        ).write(`tmp.jpg`, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(
                    `./> Creating ${BG_COLOR} background with resolution of ${data.backgroundData.dimensions.width}x${data.backgroundData.dimensions.height}.jpg`
                );
                resolve();
            }
        });
    });
}

//funkcia na spojenie fotky s backgroundom
async function mergeImage(image, data) {
    return await new Promise((resolve, reject) => {
        let bgi = `tmp.jpg`;
        let fgi = `./${SOURCE_FOLDER}/${image}`;
        let resultImage = `export_${image}`;
        let xy = `+${data.imageData.position.posX}+${data.imageData.position.posY}`;
        gm(bgi)
            .composite(fgi)
            .geometry(xy)
            .colorspace("sRGB")
            .write(`./${EXPORTS_FOLDER}/${resultImage}`, (err) => {
                if (err) console.log(`./> Error during merging images: ${err}`);
                if (!err) {
                    console.log("./> Image merge successful!");
                    console.log(`./> Created ${resultImage}!\n`);
                    resolve();
                }
            });
    });
}

//funkcia na zaverecne vymazanie tmpbg.jpg
async function removeTmp() {
    return await new Promise((resolve, reject) => {
        fs.rm(`./tmp.jpg`, { force: true }, (err) => {
            if (err) {
                console.log(err);
            } else {
                resolve();
            }
        });
    });
}

//exec funkcia ktora caka medzi vykonavanim vsetkych async funkcii pred nou
async function executeProgram() {
    clearConsoleAndScrollbackBuffer();
    sourceFolderExists();
    console.log(
        "================================================================\n"
    );
    const images = await readSourceFolder(SOURCE_FOLDER);
    console.log(`${SOURCE_FOLDER}> ${images.length} images found: `);
    console.log(images, "\n");
    console.log(
        "================================================================\n"
    );
    await createExportsFolder();
    console.log(
        "================================================================\n"
    );
    for (const image of images) {
        const data = await dataCalculation(image);
        console.log(`./${SOURCE_FOLDER}/${image}>`, data, "\n");
        await createBackground(data);
        await mergeImage(image, data);
        console.log(
            "================================================================\n"
        );
    }
    removeTmp();
    console.log("ALL DONE\n");
    console.log(
        "================================================================\n"
    );
}

//exec funkcia
executeProgram();
