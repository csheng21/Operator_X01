/*
Date 27/1/2025
By: Heng CS
Log: 1. Add Save Page
*/

import { SingleFile } from 'single-file-core';

// Export SingleFile functionality
window.singlefile = {
    async getPageData() {
        const options = {
            removeHiddenElements: true,
            removeUnusedStyles: true,
            removeUnusedFonts: true,
            removeFrames: false,
            compressHTML: true,
            compressCSS: true,
            loadDeferredImages: true,
            removeAlternativeFonts: true,
            removeAlternativeMedias: true,
            removeAlternativeImages: true
        };

        const singleFile = new SingleFile(options);
        return await singleFile.getPageData();
    }
};