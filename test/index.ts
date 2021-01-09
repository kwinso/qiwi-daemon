import { QiWiDaemon } from "../src/qiwiDaemon";

const daemon = new QiWiDaemon({ database: 'json', updateTimout: 3 });

daemon.listen("ready", () => {
    console.log("[Test] Daemon is ready");
    daemon.createPaymentSession("undermouse");
});

daemon.listen("confirm_payment", (id: string) => {
    console.log(`[Test] ${id} just paid`);
})

daemon.start();