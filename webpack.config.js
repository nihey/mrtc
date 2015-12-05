var path = require('path');

module.exports = {
  entry: path.resolve(path.join(__dirname, '.', 'index.js')),
  output: {
    path: path.resolve(path.join(__dirname, '.', 'dist')),
    library: 'module',
    libraryTarget: 'umd',
    filename: 'module.js'
  },
  module: {
    loaders: [{test: /\.js?$/, exclude: /(node_modules|bower_components)/, loader: 'babel'}]
  },
};
