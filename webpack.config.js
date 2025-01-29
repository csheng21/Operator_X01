const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    sidepanel: './src/sidepanel.js',
    'service-worker': './src/service-worker.js',
    offscreen: './src/offscreen.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
  { from: "src/*.html", to: "[name][ext]" },
  { from: "src/manifest.json", to: "manifest.json" },
  {
    from: "src/images",
    to: "images",
    noErrorOnMissing: true
  }
],
    }),
    new Dotenv()
  ],
};