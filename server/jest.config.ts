import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['apps/**/src/**/*.(t|j)s', 'libs/**/src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/libs', '<rootDir>/test'],
  moduleNameMapper: {
    '^@app/shared/(.*)$': '<rootDir>/libs/shared/src/$1',
    '^@app/infra/(.*)$': '<rootDir>/libs/infra/src/$1',
    '^@app/modules/(.*)$': '<rootDir>/libs/modules/src/$1',
  },
};

export default config;
