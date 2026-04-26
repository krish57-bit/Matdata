module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  testMatch: ["**/src/**/*.test.js", "**/src/**/*.test.jsx"],
  setupFilesAfterFramework: [],
  collectCoverageFrom: ["src/services/**/*.js"],
};
