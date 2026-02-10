const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js', // Punto de entrada de tu aplicación React
  output: {
    path: path.resolve(__dirname, 'dist'), // Carpeta donde se generará el bundle
    filename: 'bundle.js' // Nombre del archivo bundle generado
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // Aplica a archivos JS y JSX
        exclude: /node_modules/, // Excluye la carpeta node_modules
        use: {
          loader: 'babel-loader' // Usa babel-loader para transpilar
        }
      },
      {
        test: /\.css$/, // Aplica a archivos CSS
        use: ['style-loader', 'css-loader'] // Usa style-loader y css-loader
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i, // Para archivos de imágenes
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i, // Para archivos de fuentes
        type: 'asset/resource',
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html' // Archivo HTML base que Webpack usará como plantilla
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx'] // Permite importar archivos JS y JSX sin especificar la extensión
  },
  devServer: {
    static: './dist', // Sirve los archivos estáticos desde la carpeta 'dist'
  },
  mode: 'development' // Modo de desarrollo (para optimizaciones en producción usa 'production')
};