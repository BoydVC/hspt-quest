export default { testDir: "tests", testMatch: /.*\.spec\.mjs/, timeout: 60000, workers: 1,
  use: { baseURL: process.env.HQ_BASE || "http://127.0.0.1:4455",
         launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} } };
