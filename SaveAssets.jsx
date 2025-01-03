// Main function
function main() {
    // Ensure there's an open document
    if (!app.documents.length) {
        alert("No document open.");
        return;
    }

    var doc = app.activeDocument;

    // Get the directory of the current file
    var docPath = doc.path.fsName;
    var outputFolder = new Folder(docPath + "/" + doc.name.replace(/\.[^\.]+$/, "")); // Create folder using filename without extension

    if (!outputFolder.exists) {
        outputFolder.create();
    }

    // Loop through all layers
    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        
        // Ignore hidden or background layers
        if (layer.isBackgroundLayer) continue;

        // Save current visibility state
        var visibilityState = layer.visible;

        // Hide all layers
        toggleVisibility(doc, false);

        // Show the current layer
        layer.visible = true;

        // Save the image
        savePng(outputFolder, layer.name);

        // Restore visibility state
        layer.visible = visibilityState;
    }

    alert("Export completed!");
}

// Helper function to toggle visibility for all layers
function toggleVisibility(doc, visibility) {
    for (var i = 0; i < doc.layers.length; i++) {
        doc.layers[i].visible = visibility;
    }
}

// Helper function to save PNG
function savePng(outputFolder, layerName) {
    var fileName = sanitizeFileName(layerName) + ".png";
    var file = new File(outputFolder.fsName + "/" + fileName);

    var pngOptions = new PNGSaveOptions();
    pngOptions.compression = 9;
    pngOptions.interlaced = false;

    app.activeDocument.saveAs(file, pngOptions, true, Extension.LOWERCASE);
}

// Helper function to sanitize file names
function sanitizeFileName(name) {
    return name.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_");
}

// Run the script
main();
