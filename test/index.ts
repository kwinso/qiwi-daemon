import { QiWiDaemon } from "../src/qiwiDaemon";

const daemon = new QiWiDaemon({ storage: 'json', updateTimout: 3 });

daemon.listen("start", () => {
    console.log("[Test] Daemon is ready");
    daemon.createPaymentSession("undermouse", "felis");
});

daemon.listen("confirm_transaction", (id: string) => {
    console.log(`[Test] ${id} just paid`);
    daemon.stop();
})

daemon.listen("stop", (message: string) => console.log("Oops, daemon stopped!", message));

daemon.start();