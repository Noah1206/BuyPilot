const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './src/content/content.ts',
    background: './src/background/service-worker.ts',
    popup: './src/popup/popup.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/styles', to: 'styles' },
        { from: 'public', to: 'public' },
        { from: 'src/popup/popup.html', to: 'popup.html' }
      ]
    })
  ],
  mode: 'development',
  devtool: 'inline-source-map'
};
