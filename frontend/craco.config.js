module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Отключаем fork-ts-checker-webpack-plugin
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );
      
      // Отключаем TypeScript loader
      webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.oneOf) {
          rule.oneOf = rule.oneOf.map(oneOfRule => {
            if (oneOfRule.test && oneOfRule.test.toString().includes('tsx')) {
              // Заменяем TypeScript loader на JavaScript loader
              return {
                ...oneOfRule,
                test: /\.(js|mjs|jsx)$/,
                exclude: /node_modules/,
                use: [
                  {
                    loader: require.resolve('babel-loader'),
                    options: {
                      presets: ['@babel/preset-react'],
                      plugins: ['@babel/plugin-proposal-class-properties']
                    }
                  }
                ]
              };
            }
            return oneOfRule;
          });
        }
        return rule;
      });
      
      return webpackConfig;
    }
  }
}; 