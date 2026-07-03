# Verifo Mobile

The Verifo companion mobile app, built with Expo and React Native. It gives contributors a way to monitor their nodes and rewards, and gives task submitters a way to manage AI task submissions, from a phone.

## Stack

- Expo and Expo Router
- React Native
- TypeScript

## Requirements

- Node.js 18 or newer
- Expo CLI (installed automatically through `npx expo`)
- The Expo Go app on a physical device, or an Android/iOS simulator, for local testing

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Start the development server:

   ```
   npm run dev
   ```

3. Scan the QR code with Expo Go, or press `a` or `i` in the terminal to open an Android or iOS simulator.

## Scripts

- `npm run dev`, starts the Expo development server.
- `npm run build`, produces export bundles and manifests for a deployment target. Requires the `EXPO_PUBLIC_DOMAIN` environment variable to be set to the domain the app will be served from.
- `npm run serve`, serves a built export locally.
- `npm run typecheck`, runs the TypeScript compiler in check only mode.

## Project layout

- `app/`, screens and navigation, using Expo Router's file based routing.
- `components/`, shared UI components.
- `hooks/`, shared React hooks.
- `vendor/api-client-react/`, a vendored copy of the shared API client library used to talk to the Verifo API.
- `scripts/build.js`, the export and bundling script used for deployments.
- `server/`, a small static file server used to serve export output.
