/*
Date 27/1/2025
By: Heng CS
Log: 1. Add Save Page
*/

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: {
        sidepanel: './src/sidepanel.js',
        'service-worker': './src/service-worker.js',
        offscreen: './src/offscreen.js',
        'singlefile-lib': './src/singlefile-lib.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "src/*.html", to: "[name][ext]" },
                { from: "src/images", to: "images" },
                { from: "src/manifest.json", to: "manifest.json" },
            ],
        }),
        new Dotenv()
    ],
};