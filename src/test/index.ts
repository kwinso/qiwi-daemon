import { QiWiDaemon } from "../qiwiDaemon";

const daemon = new QiWiDaemon();


daemon.listen("ready", () => {
    console.log("Daemon is ready")
})