// Main function
function main() {
    if (!app.documents.length) {
        alert("No document open.");
        return;
    }

    // Get the path of the current PSD document
    var docPath = app.activeDocument.path.fsName;

    // Locate the ranks.csv file in the same directory
    var csvFile = new File(docPath + "\\ranks.csv");
    if (!csvFile.exists) {
        alert("CSV file 'ranks.csv' not found in the same directory as the PSD file.");
        return;
    }

    // Read and parse the CSV data
    var csvData = readCSV(csvFile);
    if (csvData.length === 0) {
        alert("The CSV file is empty or invalid.");
        return;
    }

    // Create an output folder for the generated PNGs
    var outputFolder = new Folder(docPath + "\\cards");
    if (!outputFolder.exists) {
        outputFolder.create();
    }

    // Process each row in the CSV
    for (var i = 0; i < csvData.length; i++) {
        var row = csvData[i];

        // Update text layers
        updateTextLayer("PLAYERNAME", row["PLAYERNAME"]);
        updateTextLayer("PLAYERRANK", row["PLAYERRANK"]);
        updateTextLayer("PLAYERTAG", row["PLAYERTAG"]);
        updateTextLayer("PLAYERREGION", row["PLAYERREGION"]);
        updateTextLayer("PRONOUNS", row["PRONOUNS"]);
        var pronounsbg = app.activeDocument.artLayers.getByName("PRONOUNSBG");
        if(row["PRONOUNS"] !== "") {
            pronounsbg.visible = true;
        } else {
            pronounsbg.visible = false;
        }
        updateTextLayer("PHOTOCREDIT", row["PHOTOCREDIT"]);

        // Replace the contents of the PLAYERFLAG layer
        replaceContents("PLAYERFLAG", docPath + "\\assets\\flags\\" + sanitizeFileName(row["PLAYERFLAG"]) + ".png");

        // Replace the contents of the PLAYERPHOTO layer
        replaceContents("PLAYERPHOTO", docPath + "\\assets\\players\\" + sanitizeFileName(row["PLAYERTAG"]) + ".png");

        // Update the TWITTER folder
        var twitterUsername = extractUsername(row["TWITTERNAME"]);
        updateFolder("TWITTER", "TWITTERNAME", twitterUsername);

        // Update the TWITCH folder
        var twitchUsername = extractUsername(row["TWITCHNAME"]);
        updateFolder("TWITCH", "TWITCHNAME", twitchUsername);


        // Update ONEMAIN and TWOMAIN folders
        updateMainFolders(row);

        // Update BGChar
        replaceContents("BGCHAR", app.activeDocument.path.fsName + "\\assets\\bgchar\\" + sanitizeFileName(row["MAIN1"]) + ".png");

        // Update TEAM folders
        updateTeamFolders(row);

        // Update EVENT folders
        for (var eventNum = 1; eventNum <= 4; eventNum++) {
            updateEventFolder(eventNum, row);
        }

        // Save as PNG using the PLAYERRANK column
        savePng(outputFolder, row["PLAYERRANK"]);
        savePsd(outputFolder, row["PLAYERRANK"]);
    }

    alert("Export completed!");
}

// Function to update folder visibility and text layers
function updateFolder(folderName, textLayerName, textValue) {
    try {
        var folder = app.activeDocument.layerSets.getByName(folderName);

        if (textValue && textValue.replace(/^\s+|\s+$/g, "") !== "") {
            // Show folder and update the corresponding text layer
            folder.visible = true;
            updateTextLayer(textLayerName, textValue, folderName);
        } else {
            // Hide folder if no value is provided
            folder.visible = false;
        }
    } catch (e) {
        alert("Error updating folder " + folderName + ": " + e.message);
    }
}

function updateMainFolders(row) {
    try {
        var twoMainFolder = app.activeDocument.layerSets.getByName("TWOMAIN");
        var oneMainFolder = app.activeDocument.layerSets.getByName("ONEMAIN");

        // Check for MAIN1 and MAIN2 values in the CSV
        var main1 = row["MAIN1"];
        var main2 = row["MAIN2"];
        var secondary1 = row["SECONDARY1"];
        var secondary2 = row["SECONDARY2"];

        if (main1 && main1.replace(/^\s+|\s+$/g, "") !== "") {
            if (main2 && main2.replace(/^\s+|\s+$/g, "") !== "") {
                // If two mains are provided, show TWOMAIN and hide ONEMAIN
                twoMainFolder.visible = true;
                oneMainFolder.visible = false;

                // Update MAIN1 and MAIN2 in TWOMAIN
                replaceContents("MAIN1", app.activeDocument.path.fsName + "\\assets\\mains\\" + sanitizeFileName(main1) + ".png", "TWOMAIN");
                replaceContents("MAIN2", app.activeDocument.path.fsName + "\\assets\\mains\\" + sanitizeFileName(main2) + ".png", "TWOMAIN");
            } else {
                // If only one main is provided, show ONEMAIN and hide TWOMAIN
                twoMainFolder.visible = false;
                oneMainFolder.visible = true;

                // Update MAIN1 in ONEMAIN
                replaceContents("MAIN1", app.activeDocument.path.fsName + "\\assets\\mains\\" + sanitizeFileName(main1) + ".png", "ONEMAIN");
            }
        } else {
            // Hide both folders if no main is provided
            twoMainFolder.visible = false;
            oneMainFolder.visible = false;
        }

        // Handle SECONDARY1 and SECONDARY2 in both folders
        updateSecondary(twoMainFolder, "SECONDARY1", secondary1);
        updateSecondary(twoMainFolder, "SECONDARY2", secondary2);
        updateSecondary(oneMainFolder, "SECONDARY1", secondary1);
        updateSecondary(oneMainFolder, "SECONDARY2", secondary2);
    } catch (e) {
        alert("Error updating ONEMAIN or TWOMAIN folders: " + e.message);
    }
}

// Function to update secondary layers based on CSV data
function updateSecondary(folder, layerName, value) {
    try {
        var layer = folder.artLayers.getByName(layerName);
        var layerbg = folder.artLayers.getByName(layerName+'BG');
        if (value && value.replace(/^\s+|\s+$/g, "") !== "") {
            layer.visible = true;
            layerbg.visible = true;
            replaceContents(layerName, app.activeDocument.path.fsName + "\\assets\\secondaries\\" + sanitizeFileName(value) + ".png", folder.name);
        } else {
            layer.visible = false;
            layerbg.visible = false;
        }
    } catch (e) {
        // It's okay to skip missing secondaries
    }
}


// Function to read CSV file and parse it into an array of objects
function readCSV(file) {
    file.open("r");
    var content = file.read(); // Read the entire file as a string
    file.close();

    if (!content || content.replace(/^\s+|\s+$/g, "") === "") { // Trim using regex
        alert("CSV file is empty.");
        return [];
    }

    var lines = content.split(/\r?\n/); // Split content into lines
    if (lines.length < 2) {
        alert("CSV file must contain headers and at least one data row.");
        return [];
    }

    // Extract and trim headers
    var headersLine = splitAndTrim(lines[0]);
    var headers = [];
    for (var h = 0; h < headersLine.length; h++) {
        headers.push(headersLine[h].toUpperCase());
    }

    var data = [];

    // Process each row of data
    var ROWSTART = 1;
    var ROWSTOP = 102;
    for (var i = ROWSTART; i < ROWSTOP; i++) {
        if (lines[i].replace(/^\s+|\s+$/g, "") === "") continue; // Skip empty rows
        var valuesLine = splitAndTrim(lines[i]);
        var row = {};
        for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = (valuesLine[j] || "").toUpperCase(); // Convert values to uppercase
        }
        data.push(row);
    }
    return data;
}

// Helper function to split a line by commas and trim values
function splitAndTrim(line) {
    var parts = line.split(",");
    for (var i = 0; i < parts.length; i++) {
        parts[i] = parts[i].replace(/^\s+|\s+$/g, ""); // Trim leading/trailing spaces using regex
    }
    return parts;
}

// Function to update a text layer's contents, optionally within a folder
function updateTextLayer(layerName, textValue, folderName) {
    try {
        var layer;

        if (folderName) {
            // Access the folder (layer set) first
            var folder = app.activeDocument.layerSets.getByName(folderName);
            layer = folder.artLayers.getByName(layerName);
        } else {
            // Access the layer directly if no folder is specified
            layer = app.activeDocument.artLayers.getByName(layerName);
        }

        if (layer.kind === LayerKind.TEXT) {
            layer.textItem.contents = textValue;
        } else {
            alert("Layer is not a text layer: " + layerName);
        }
    } catch (e) {
        alert("Layer not found or not a text layer: " + layerName + " in folder " + folderName);
    }
}


// Function to replace the contents of a smart object layer
function replaceContents(layerName, filePath, folderName) {
    try {
        var layer;
        if (folderName) {
            var folder = app.activeDocument.layerSets.getByName(folderName);
            layer = folder.artLayers.getByName(layerName);
        } else {
            layer = app.activeDocument.artLayers.getByName(layerName);
        }

        if (layer.kind !== LayerKind.SMARTOBJECT) {
            alert("Layer is not a smart object: " + layerName);
            return;
        }

        var file = new File(filePath);
        if (!file.exists) {
            alert("File not found: " + filePath);
            return;
        }

        app.activeDocument.activeLayer = layer;
        var idplacedLayerReplaceContents = stringIDToTypeID("placedLayerReplaceContents");
        var desc = new ActionDescriptor();
        desc.putPath(charIDToTypeID("null"), file);
        desc.putBoolean(charIDToTypeID("Lnkd"), true);
        executeAction(idplacedLayerReplaceContents, desc, DialogModes.NO);
    } catch (e) {
        alert("Error replacing contents for layer: " + layerName + " in folder " + folderName + "\n" + e.message);
    }
}

// Function to update TEAM folders based on result data in the CSV
function updateTeamFolders(row) {
    try {
        var teamFolderName = "TEAM1";
        var teamFolder = app.activeDocument.layerSets.getByName(teamFolderName);

        var teamNameLayer = "TEAMNAME";
        var teamLogoLayer = "TEAMLOGO";
        
        var teamName = row[teamFolderName];

        if (teamName && teamName.replace(/^\s+|\s+$/g, "") !== "") {
            teamFolder.visible = true;
            updateTextLayer(teamNameLayer, teamName, teamFolderName);
            adjustFontSize(teamNameLayer, teamName, teamFolderName, 45, 38, 21)
            replaceContents(teamLogoLayer, app.activeDocument.path.fsName + "\\assets\\teams\\" + sanitizeFileName(teamName) + ".png", teamFolderName)
        } else {
            teamFolder.visible = false;
        }
    } catch (e) {
        alert("Error updating folder " + teamFolderName + ": " + e.message);
    }

    try {
        var teamFolderName = "TEAM2";
        var teamFolder = app.activeDocument.layerSets.getByName(teamFolderName);

        var teamNameLayer = "TEAMNAME";
        var teamLogoLayer = "TEAMLOGO";
        
        var teamName = row[teamFolderName];

        if (teamName && teamName.replace(/^\s+|\s+$/g, "") !== "") {
            teamFolder.visible = true;
            updateTextLayer(teamNameLayer, teamName, teamFolderName);
            replaceContents(teamLogoLayer, app.activeDocument.path.fsName + "\\assets\\teams\\" + sanitizeFileName(teamName) + ".png", teamFolderName)
        } else {
            teamFolder.visible = false;
        }
    } catch (e) {
        alert("Error updating folder " + teamFolderName + ": " + e.message);
    }
}

// Function to adjust font size based on character length
function adjustFontSize(layerName, text, folderName, defaultFontSize, reducedFontSize, charLimit) {
    try {
        var layer;
        
        // Get the layer, optionally within a specified folder
        if (folderName) {
            var folder = app.activeDocument.layerSets.getByName(folderName);
            layer = folder.artLayers.getByName(layerName);
        } else {
            layer = app.activeDocument.artLayers.getByName(layerName);
        }
        
        if (layer && layer.kind === LayerKind.TEXT) {
            var textItem = layer.textItem;

            // Set the text content
            textItem.contents = text;

            // Adjust font size and baseline shift based on character count
            if (text.length > charLimit) {
                textItem.size = reducedFontSize;
                textItem.baselineShift = -5; // Adjust baseline shift for longer text
            } else {
                textItem.size = defaultFontSize;
                textItem.baselineShift = 0; // Reset baseline shift for shorter text
            }
        } else {
            throw new Error("Layer not found or not a text layer");
        }
    } catch (e) {
        alert("Error adjusting font size for layer: " + layerName + "\n" + e.message);
    }
}

// Function to update the EVENT folders based on result data in the CSV
function updateEventFolder(eventNumber, row) {
    try {
        var eventFolderName = "EVENT" + eventNumber;
        var eventFolder = app.activeDocument.layerSets.getByName(eventFolderName);

        var resultNameKey = "RESULT" + eventNumber + "NAME";
        var resultPlaceKey = "RESULT" + eventNumber + "PLACE";

        var resultName = row[resultNameKey];
        var resultPlace = row[resultPlaceKey];

        if (resultName && resultName.replace(/^\s+|\s+$/g, "") !== "") {
            // Show the event folder
            eventFolder.visible = true;

            // Update PLACEMENT
            updateTextLayer("PLACEMENT", resultPlace, eventFolderName);

            // Update SUFFIX based on placement
            var suffix = getPlacementSuffix(resultPlace);
            updateTextLayer("SUFFIX", suffix, eventFolderName);

            // Update NAME
            updateTextLayer("NAME", resultName, eventFolderName);
            adjustFontSize("NAME", resultName, eventFolderName, 65, 54, 21);

            // Replace LOGO contents
            replaceContents("LOGO", app.activeDocument.path.fsName + "\\assets\\events\\" + sanitizeFileName(resultName) + ".png", eventFolderName);
        } else {
            // Hide the event folder if no result name is provided
            eventFolder.visible = false;
        }
    } catch (e) {
        alert("Error updating event folder " + eventFolderName + ": " + e.message);
    }
}

// Function to extract username from a social media URL
function extractUsername(url) {
    if (!url || url.replace(/^\s+|\s+$/g, "") === "") {
        return ""; // Return empty if the URL is blank
    }
    // Match and extract username after specific domain patterns
    var match = url.match(/(?:twitch\.tv\/|x\.com\/|twitter\.com\/)([\w\d_]+)/i);
    return match ? match[1] : url; // Return the username or the original string if no match
}


// Function to get the suffix for a placement number
function getPlacementSuffix(place) {
    var num = parseInt(place, 10);
    if (isNaN(num)) return "";

    var lastDigit = num % 10;
    var lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return "th"; // Special case for 11th, 12th, 13th
    }

    switch (lastDigit) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}


// Function to save the current document as a PNG file
function savePng(outputFolder, fileName) {
    var sanitizedFileName = sanitizeFileName(fileName) + ".png";
    var file = new File(outputFolder.fsName + "\\" + sanitizedFileName);

    var pngOptions = new PNGSaveOptions();
    pngOptions.compression = 9;
    pngOptions.interlaced = false;

    app.activeDocument.saveAs(file, pngOptions, true, Extension.LOWERCASE);
}

// Function to save the current document as a PSD file
function savePsd(outputFolder, fileName) {
    // Ensure the "PSD" subfolder exists
    var psdFolder = new Folder(outputFolder.fsName + "\\PSD");
    if (!psdFolder.exists) {
        psdFolder.create();
    }

    // Sanitize the file name and append the .psd extension
    var sanitizedFileName = sanitizeFileName(fileName) + ".psd";
    var file = new File(psdFolder.fsName + "\\" + sanitizedFileName);

    // Save as PSD
    var psdOptions = new PhotoshopSaveOptions();
    psdOptions.alphaChannels = true; // Include alpha channels
    psdOptions.annotations = true; // Include annotations
    psdOptions.embedColorProfile = true; // Embed color profile
    psdOptions.layers = true; // Preserve layers
    psdOptions.spotColors = true; // Include spot colors

    app.activeDocument.saveAs(file, psdOptions, true, Extension.LOWERCASE);
}

// Helper function to sanitize file names
function sanitizeFileName(name) {
    return name.replace(/[\\\/\:\*\?\"\<\>\|\'\%]/g, "_");
}

// Run the main function
main();
