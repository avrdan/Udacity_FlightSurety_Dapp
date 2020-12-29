const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
const StartServerPlugin = require('start-server-nestjs-webpack-plugin') // https://www.gitmemory.com/issue/nestjs/nest/5706/728959530

module.exports = {
    entry: [
        'webpack/hot/poll?1000',
        './src/server/index'
    ],
    watch: true,
    target: 'node',
    mode: 'development',
    externals: [nodeExternals({
        allowlist: ['webpack/hot/poll?1000']
    })],
    module: {
        rules: [{
            test: /\.js?$/,
            use: 'babel-loader',
            exclude: /node_modules/
        }]
    },
    plugins: [
        new StartServerPlugin({entryName: 'server.js'}),
        //new webpack.NamedModulesPlugin(), // no longer needed according to: https://www.gitmemory.com/issue/webpack/webpack/11637/706718119
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                "BUILD_TARGET": JSON.stringify('server')
            }
        }),
        /*new webpack.ProvidePlugin({
            process: 'process/browser',
          }),*/
    ],
    output: {
        path: path.join(__dirname, 'prod/server'),
        filename: 'server.js'
    }
}