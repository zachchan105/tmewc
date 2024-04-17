// List of environment variables used by the monitoring package.
const {
  ENVIRONMENT,
  ETHEREUM_URL,
  ELECTRUM_URL,
  LARGE_DEPOSIT_THRESHOLD_SAT,
  LARGE_REDEMPTION_THRESHOLD_SAT,
  DATA_DIR_PATH,
  SENTRY_DSN,
  DISCORD_WEBHOOK_URL,
} = process.env

export enum Environment {
  Mainnet = "mainnet",
  Testnet = "testnet",
}

const resolveEnvironment = () => {
  switch (ENVIRONMENT) {
    case Environment.Mainnet: {
      return Environment.Mainnet
    }
    case Environment.Testnet: {
      return Environment.Testnet
    }
    default: {
      throw new Error(
        "unknown environment; ENVIRONMENT env variable must be either " +
          `[${Environment.Mainnet}] or [${Environment.Testnet}]`
      )
    }
  }
}

const resolveEthereumUrl = () => {
  if (!ETHEREUM_URL) {
    throw new Error("ETHEREUM_URL env variable not set")
  }

  return ETHEREUM_URL
}

const resolveElectrumUrl = () => {
  if (!ELECTRUM_URL) {
    throw new Error("ELECTRUM_URL env variable not set")
  }

  return ELECTRUM_URL
}

export const context = {
  environment: resolveEnvironment(),
  ethereumUrl: resolveEthereumUrl(),
  electrumUrl: resolveElectrumUrl(),
  largeDepositThresholdSat: LARGE_DEPOSIT_THRESHOLD_SAT ?? 1000000000, // 10 MEWC by default
  largeRedemptionThresholdSat: LARGE_REDEMPTION_THRESHOLD_SAT ?? 1000000000, // 10 MEWC by default
  dataDirPath: DATA_DIR_PATH ?? "./data",
  sentryDsn: SENTRY_DSN,
  discordWebhookUrl: DISCORD_WEBHOOK_URL,
}
