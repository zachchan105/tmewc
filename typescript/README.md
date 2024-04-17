# tMEWC SDK

[![build](https://img.shields.io/github/actions/workflow/status/zachchan105/tmewc/typescript.yml?branch=main&event=push&label=build)](https://github.com/zachchan105/tmewc/actions/workflows/typescript.yml)
[![npm](https://img.shields.io/npm/v/%40zachchan105%2Ftmewc.ts)](https://www.npmjs.com/package/@zachchan105/tmewc.ts)
[![documentation](https://badgen.net/static/GitBook/Documentation/yellow)](https://docs.threshold.network/app-development/tmewc/tmewc-sdk)

tMEWC SDK is a TypeScript library that provides effortless access to the
fundamental features of the tMEWC Meowcoin bridge. The SDK allows developers
to integrate tMEWC into their own applications and offer the power of
trustless tokenized Meowcoin to their users.

**Table of contents:**

- [Quickstart](#quickstart)
  - [Installation](#installation)
  - [Usage](#usage)
- [Contributing](#contributing)
  - [Prerequisites](#prerequisites)
  - [Install dependencies](#install-dependencies)
  - [Build](#build)
  - [Test](#test)
  - [Format](#format)
  - [Auto-generated API reference](#auto-generated-api-reference)
- [Documentation](#documentation)

## Quickstart

Here you can find instructions explaining how to use the SDK in your own
project.

### Installation

To install the tMEWC SDK in your project using `yarn`, run:

```bash
yarn add @zachchan105/tmewc.ts
```

If you prefer to use `npm`, do:

```bash
npm i @zachchan105/tmewc.ts
```

Please note that you will also need to install the
[ethers v5](https://docs.ethers.org/v5) library to initialize
a signer or provider. To do so using `yarn`, invoke:

```bash
yarn add ethers@legacy-v5
```

To do the same using `npm`, run:

```bash
npm i ethers@legacy-v5
```

> The SDK depends on ethers v5. Proper support for newer ethers versions
> is not guaranteed right now.

### Usage

Here is a short example demonstrating SDK usage:

```typescript
// Import SDK entrypoint component.
import { TMEWC } from "@zachchan105/tmewc.ts"

// Create an instance of ethers signer.
const signer = (...)

// Initialize the SDK.
const sdk = await TMEWC.initializeMainnet(signer)

// Access SDK features.
sdk.deposits.(...)
sdk.redemptions.(...)

// Access tMEWC smart contracts directly.
sdk.tmewcContracts.(...)

// Access Meowcoin client directly.
sdk.bitcoinClient.(...)
```

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.
Please refer the repository-level
[CONTRIBUTING.adoc](https://github.com/zachchan105/tmewc/blob/main/CONTRIBUTING.adoc)
document for general contribution guidelines. Below, you can find how to set up
the SDK module for development.

### Prerequisites

Please make sure you have the following prerequisites installed on your machine:

- [node.js](https://nodejs.org) >=16
- [yarn](https://classic.yarnpkg.com) >=1.22 or [npm](https://github.com/npm/cli) >=8.11

> Although the below commands use `yarn` you can easily use `npm` instead.

### Install dependencies

To install dependencies, run:

```bash
yarn install
```

### Build

To build the library, invoke:

```bash
yarn build
```

A `dist` directory containing the resulting artifacts will be created.

### Test

To run unit tests, do:

```bash
yarn test
```

### Format

To format code automatically, invoke:

```bash
yarn format:fix
```

### Auto-generated API reference

There is an auto-generated API reference documentation that must be
re-generated in case of modifications in the source code. This can be
done automatically using a pre-commit hook or manually using:

```bash
yarn docs
```

Generated API reference in form of Markdown files is saved
to the [`api-reference`](./api-reference) directory.

## Documentation

This README provides just a basic guidance. Comprehensive documentation for
this SDK can be found on the
[Threshold Network Docs website](https://docs.threshold.network/app-development/tmewc/tmewc-sdk).
