module.exports = {
  preset: "react-native",
  transform: {
    "^.+\\.(js|ts|tsx)$": "babel-jest",
  },
  //   testRegex: "/__tests__/.*\\.(test|spec)\\.(ts|tsx|js)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  globals: {
    "ts-jest": {
      babelConfig: true,
    },
  },
  //   setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
};
