#!/usr/bin/env node
'use strict';
const fs = require('fs');

const FILES = [
    { path: 'index.html', entry: './src/main.ts' },
    { path: 'admin.html', entry: './src/admin/index.ts' },
    { path: 'changelog.html', entry: './src/admin/changelog.ts' },
];

// Matches Vite-injected asset lines (modulepreload, crossorigin script, crossorigin stylesheet)
const VITE_LINE =
    /^[ \t]*<(?:link\s+rel="modulepreload"|script\s+type="module"\s+crossorigin|link\s+rel="stylesheet"\s+crossorigin)[^\n]*\n?$/;

let changed = 0;

for (const { path: filePath, entry } of FILES) {
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');
    const original = html;

    // Fix favicon + body logo: assets/logo-desc-*.png → media/logo-desc.png
    html = html.replace(/\.\/assets\/logo-desc-[^"']+\.png/g, './media/logo-desc.png');

    // Replace the Vite-injected asset block with the source entry script.
    // Works line-by-line so it handles any number of preload/stylesheet tags.
    const lines = html.split('\n');
    const out = [];
    let replaced = false;

    for (let i = 0; i < lines.length; i++) {
        if (!replaced && VITE_LINE.test(lines[i])) {
            // Consume all consecutive Vite asset lines
            const indent = (lines[i].match(/^([ \t]*)/) || ['', ''])[1];
            while (i < lines.length && VITE_LINE.test(lines[i])) i++;
            out.push(`${indent}<script type="module" src="${entry}"></script>`);
            replaced = true;
            i--; // re-evaluate current line (first non-Vite line)
        } else {
            out.push(lines[i]);
        }
    }

    html = out.join('\n');

    if (html !== original) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`  restored: ${filePath}`);
        changed++;
    }
}

if (changed === 0) {
    console.log('  HTML files already in source form.');
}
