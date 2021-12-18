module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  parserOptions: {
    "ecmaVersion": 2018
  },
  "extends": "eslint:recommended",
  "rules": {
    "no-unused-vars": [
      "warn",
      {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": false
      }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
  },
  overrides: [
    {
      files: [
        '**/tests/e2e/__*.js',
        '**/tests/integration/__*.js'
      ],
      env: {
        mocha: true
      }
    }
  ]
}
