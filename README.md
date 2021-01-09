# QiWi Daemon

A QiWi Daemon to automate QiWi Payments.  
It uses Redis And node-qiwi-api to get stuff working.

# Setup

First of all, you need to clone this repo.  
Then you can start your app from here by just extending it.

```bash
# Clone it
git clone https://github.com/uwumouse/qiwi-daemon.git

cd qiwi-daemon

# Install dependencies
npm i
```

Then, you need to get QiWi's API Token.  
To get it just go to https://qiwi.com/api.

`Note`: You only need to give read permisson for your token.  
`Note 2`: This daemon uses Redis to manage sessions, dont forget to install and configure this as well.

Create an .qiwi.env file:

```bash
touch .qiwi.env
```

Then you need to pass required variables to get your daemon working:

```env
# Phone number you've registered for QiWi
PHONE_NUMBER="12345678910"
# You can get in on  https://qiwi.com/api
QIWI_TOKEN="MY_TOKEN"
# Amount counted in rubles
PAYMENT_AMOUNT="10"
```

`Note`: You can see other variables in `.example.qiwi.env` file.

# Usage

BTW it works only in typescript.  
Soon it'll be moved to npm package

```typescript
import { QiWiDaemon } from "./qiwiDaemon";

const daemon = new QiWiDaemon();

// Starts proccess of watching for new payments
daemon.watch();

// It's save to create payment session after daemon is ready
daemon.on("ready", () => {
    // Now daemon will wait for transaction with comment "customkeyword" and then notify you that "myuseridentifier" paid
    daemon.createPaymentSession("myuseridentifier", "customkeyword");
});

daemon.onPaymentConfirm((id) => {
    console.log(`Looks like ${id} just paid!`);
});
```
