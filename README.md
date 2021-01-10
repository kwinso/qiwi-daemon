# QiWi Daemon

`qiwi-daemon` is a package that helps you work with qiwi transtactions.

# How does it work?

Daemon gets your transactions data and if it finds a transaction with comment, daemon will try to find
a session in configured storage.  
This means you can register sessions in storage and than wait for notification from daemon.  
It can be usefull when you trying to create automatic payments with QiWi with your own wallet.

# Installation

Install repo from NPM.

```bash
npm i qiwi-daemon
```

# Using in your code

```typescript
import { QiWiDaemon } from "qiwi-daemon";

// This will force daemon to use JSON file to store sessions.
// This file will be localted in /home/user/.qiwi/qiwi.json
const daemon = new QiWiDaemon({ database: "json", jsonName: "qiwi.json", jsonFileDir: "/home/user/.qiwi" });

// This function will be called when daemon is stated.
daemon.listen("start", () => {
    console.log("Looks like somebody's watchin' my transactions!");

    // Manually creating session
    daemon.createPaymentSession("kwinso");

    // With your own keyword "bob_is_cool"
    daemon.createPaymentSession("bob", "bob_is_cool");
});

// Fires up when payement has confirmed
daemon.listen("confirm_transaction", (id: string) => {
    console.log(`${id} just paid!`);
});

// Does the same, but less code
daemon.onTransactionConfirm((id) => {
    console.log(`Did I tell you that ${id} just paid?`);

    // Let's exit!
    // Note: You can pass everthing that can be usefull for you.
    // Default messages passed to listeners are strings
    daemon.stop({ message: "STOP ENGINES" });
});

daemon.listen("stop", (data) => {
    console.log("Oops, daemon stopped!", "Message: ", data.message);
});

// Start listenning
daemon.start();
```

# Configuration

### Enviroment variables

`qiwi-daemon` uses `.qiwi.env` file to process the most of dameon's configuration data.  
Values in this file contain sensitive information, so It's likely you store it in file rather than in code.  
Here are all positions in this file.

**Required**:

-   **PHONE_NUMBER** - Phone number that you have used to create a QiWi Account
-   **QIWI_TOKEN** - A QiWi API token (Get it [here](https://qiwi.com/api))
    > QiWi token must allow app to see transactions history. Other permissions are not required.
-   **PAYMENT_AMOUNT** - Amount of your currency to process this payment

**Not required**:

-   **NO_LOGS** - Don't show logs from daemon (Pass `true` to turn this on)
    > Daemon also logs every transaction it has processed, it'll be turned off with this option set to `true`
-   **DEBUG** - Enable debug log
-   **REDIS_PREFIX** - Prefix for entiries in Redis Storage
    > `REDIS_PREFIX` is usefull only if you've set storage type to "redis"
    > Example for `.qiwi.env` you can find in this repository

### In-code config

Daemon could accept config object, as you could see in example earlier.  
All options are not required, since there are default values used.

| Syntax            | Description                                                        | Type     | Default                 |
| ----------------- | ------------------------------------------------------------------ | -------- | ----------------------- |
| **storage**       | Could be "redis" or "json". Defines how daemon will store sessions | `string` | `"json"`                |
| **updateTimeout** | Defines how often daemon will check for new transaction in seconds | `number` | `30`                    |
| **jsonName**      | Name of the file containing storage                                | `string` | `"qiwi-daemon.db.json"` |
| **jsonFileDir** | Path for directory where json storage file will be located | `string` | Current working directory |

> `jsonName` and `jsonFileDir` will be usefull only if you have set `storage` to `"json"`

> Example config:

```typescript
const config = {
    storage: "json",
    // Check for updates every 15 second
    updateTimeout: 15,
    jsonName: "mystorage.json",
    jsonFileDir: "/home/user/.qiwi"
};
```

# Events

You can set event listeners for your daemon, to get notified what's happening to it.
| Event name | Description | Callback Data |
| -----------| ----------- | ----------- |
| `start` | Daemon started and working | `undefined` |
| `confirm_transaction` | Transaction confirmation | `id: string` - value that identifies user for the session |
| `stop` | Daemon has stopped due to error or manually | `message: any` - message describes stopping reason |
| `watch_start` | Daemon started watching for updates in your wallet | `undefined` |


# Logging

`qiwi-daemon` uses [winston](https://www.npmjs.com/package/winston) to log data to the screen and files.  
If `NO_LOGS` is not set to `true`, only errros will be logged to the screen.
