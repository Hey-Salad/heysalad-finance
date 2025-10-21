import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/index.ts'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.ts']
};

export default config;
