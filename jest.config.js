module.exports = {
  preset: "react-native",
  transform: {
    "^.+\\.(js|ts|tsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  globals: {
    "ts-jest": {
      babelConfig: true,
    },
  },
};
