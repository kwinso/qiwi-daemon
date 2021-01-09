import { logger, paymentsLogger } from "./tools/logger";
// @ts-ignore <fuck node-qiwi-api>
import { asyncApi as asyncQiWi } from "node-qiwi-api";
import { env, envCheck } from "./tools/env";
import { redisClient, redisGet, redisSet } from "./tools/redis";
import { getKeyword } from "./tools/wordlist";
import { FileUtils, JsonDBUtils } from "./utils";
import { Session } from "./types";

type DaemonEvents = "ready" | "confirm_payment" | "watch_start" | "stop";
interface Payment {
    person: any;
    comment: string;
    date: Date;
}

interface DaemonConfig {
    /** Where to store temporary payment sessions */
    database: "redis" | "json";
    /** Timeout between each wallet history check */
    updateTimout: number;
    /** JSON Database name */
    jsonName: string;
}

class QiWiDaemon {
    private readonly config: DaemonConfig = {
        updateTimout: 30,
        database: "redis",
        jsonName: "qiwi-daemon.db.json",
    };
    private readonly wallet;
    private listeners: { cb: Function; event: DaemonEvents }[] = [];

    constructor(config?: Partial<DaemonConfig>) {
        // If config passed, combining all values the default config values
        if (config) this.config = { ...this.config, ...config };

        envCheck();

        this.wallet = new asyncQiWi(env("QIWI_TOKEN"));
    }

    private connectDatabase(): Promise<boolean> {
        return new Promise(async (res) => {
            const { database: databaseType, jsonName } = this.config;

            if (databaseType == "redis") {
                redisClient.on("connect", () => {
                    logger.debug("Redis connected...");
                    res(true);
                });
            } else if (databaseType == "json") {
                const databaseFileName = jsonName;

                const exists = await FileUtils.fileExists(databaseFileName);

                if (!exists) {
                    await JsonDBUtils.createDatabaseFile(databaseFileName);
                    logger.info(`Created ${this.config.jsonName}`);
                }

                res(true);
            }
        });
    }

    /** This function start bot to check history */
    async start() {
        await this.connectDatabase();

        this.watch();
        this.emit("ready");
    }

    onPaymentConfirm(listener: (id: string) => void) {
        this.listeners.push({ event: "confirm_payment", cb: listener });
    }

    /**
     *  Add listener to the event
     * @param event - name for event to be listenned
     * @param listener - callback function to listen on event
     */
    listen(event: DaemonEvents, listener: Function) {
        this.listeners.push({ cb: listener, event });
    }

    private emit(event: DaemonEvents, data?: any) {
        this.listeners.filter((e) => e.event == event).forEach((e) => e.cb(data));
    }

    /**
     *  Creates new session for user
     * @param id - any string that could be considered as user identifier
     * @param customKeyword - custom keyword (if you want use your way to generate keywords)
     * @returns Generated keyword
     *
     * You have to be sure that redis is connected.
     * Note: to be sure it's will be set, use it in on("ready") callback
     */
    async createPaymentSession(id: string, customKeyword?: string): Promise<string> {
        let keyword;
        if (!customKeyword) {
            while (true) {
                const potentialKeyword = getKeyword();
                if (!(await redisGet(potentialKeyword))) {
                    keyword = potentialKeyword;
                    break;
                }
            }
        } else keyword = customKeyword;

        logger.debug(`Created new payment for ${id} with keyword: ${keyword}`);

        await this.saveSession({ keyword, id });
        return keyword;
    }

    private async saveSession(s: Session) {
        if (this.config.database == "redis") await redisSet(s.keyword, s.id);
        else if (this.config.database == "json") {
            JsonDBUtils.saveSession(s, this.config.jsonName);
        }
    }

    private async getSessionId(comment: string): Promise<string | null> {
        if (this.config.database == "redis") return await redisGet(comment);
        else if (this.config.database == "json") {
            const session = JsonDBUtils.getSession(comment, this.config.jsonName);
            if (session) return session.id;
            else return null;
        } else {
            return null;
        }
    }

    private async delSession(keyword: string): Promise<void> {
        // Creating promise to make sure code can await deletion
        return new Promise((res) => {
            // I don't know what is 2nd argument for, so just throw the same keyword
            if (this.config.database == "redis") {
                redisClient.del(keyword, keyword, () => {
                    res();
                });
            } else if (this.config.database == "json") {
                JsonDBUtils.deleteSession(keyword, this.config.jsonName);
            }
        });
    }

    /**
     * Starts process of watching for new payments
     */
    private watch() {
        logger.info("QiWiDaemon Started");
        this.emit("watch_start");

        const checkTimeout = setTimeout(async () => {
            // Comments that are already checked and user has been confirmed. Used to avoit double checking
            const confirmedComments: string[] = [];
            let transactions;

            try {
                transactions = await this.wallet.getOperationHistory(env("PHONE_NUMBER"), { rows: 50, operation: "IN" });
            } catch {
                logger.error("Failed to get your transactions history. Probably, you have set bad credentials.");
                logger.warn("Stopping Daemon.");
                this.emit("stop");
                clearTimeout(checkTimeout);
                return;
            }

            if (transactions.data) {
                let payments: Payment[] = transactions.data
                    .filter((tnx: any) => tnx.sum.amount >= Number(env("PAYMENT_AMOUNT")) && tnx.comment)
                    .map((tnx: any) => {
                        return {
                            person: tnx.account,
                            comment: tnx.comment,
                            date: tnx.date,
                        };
                    });
                for (let payment of payments) {
                    if (confirmedComments.includes(payment.comment)) continue;

                    const sessionId = await this.getSessionId(payment.comment);

                    if (sessionId) {
                        confirmedComments.push(payment.comment);
                        this.emit("confirm_payment", sessionId);
                        this.delSession(payment.comment);
                        paymentsLogger.log("info", `Payment for ${sessionId} has confirmed.`);
                    }
                }
            }
        }, this.config.updateTimout * 1000);
    }
}

export { QiWiDaemon };
