var debug = process.env.NODE_ENV !== "production";

module.exports = {
  context: __dirname,
  devtool: debug ? "inline-sourcemap" : false,
  entry: "./js/neo4jd3.js",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      }
    ]
  },
  output: {
    path: __dirname + "/dist/",
    filename: "neo4jd3.min.js",
    libraryTarget: "umd"
  },
};
