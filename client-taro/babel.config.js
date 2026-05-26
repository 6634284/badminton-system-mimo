module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { browsers: ['last 3 versions', 'Android >= 4.1', 'iOS >= 8'] },
    }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [],
};
