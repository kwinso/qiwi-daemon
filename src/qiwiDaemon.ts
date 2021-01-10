import { logger, transactionsLogger } from "./tools/logger";
import { env, envCheck } from "./tools/env";
import { QiwiDaemonRedis } from "./tools/redis";
import { getKeyword } from "./tools/wordlist";
import { FileUtils, JsonStorageUtils } from "./utils";
import { Session } from "./types";
import { QiWi } from "./tools/qiwi";

type DaemonEvent = "start" | "confirm_transaction" | "watch_start" | "stop";

interface Transaction {
    person: any;
    comment: string;
    date: Date;
}

interface DaemonConfig {
    /** Where to store temporary payment sessions */
    storage: "redis" | "json";
    /** Timeout between each wallet history check */
    updateTimout: number;
    /** JSON Storage name */
    jsonName: string;
    /** JSON Storage parent directory */
    jsonFileDir: string;
}

class QiWiDaemon {
    /* PUBLIC VARIABLES */

    /** Defines minimal value for transaction sum to be accepted by daemon */
    readonly transactionMinimal: number;

    /** Is Daemon active at the moment */
    public get isRunning() {
        return this.runningState;
    }

    /* PRIVATE VARIABLES */

    // Default config
    private readonly config: DaemonConfig = {
        jsonFileDir: process.cwd(),
        updateTimout: 30,
        storage: "json",
        jsonName: "qiwi-daemon.db.json",
    };

    // API Key for qiwi to get info about wallet
    private readonly walletApiKey;

    // Timeout that handles checking for updates in wallet
    private watchingProcess?: NodeJS.Timeout;

    // Listenners for events
    private listeners: { cb: Function; event: DaemonEvent }[] = [];

    // Private daemon ativity state
    private runningState: boolean = false;

    // I ignore varnings about undefined "redis" field beacuse it's checked when storage set to redis
    //  And if storage set to redis, this field will be initialized
    // @ts-ignore
    private readonly redis: QiwiDaemonRedis;

    constructor(config?: Partial<DaemonConfig>) {
        // If config passed, combining all values the default config values
        if (config) this.config = { ...this.config, ...config };

        // Checking required enviroment variables to be set
        envCheck();

        if (this.config.storage == "json") {
            if (!FileUtils.validFilename(config?.jsonName as string)) {
                logger.error("Failed to validate file name for JSON storage. It must me valid filename, not path.");
                throw new Error("Invalid filename");
            }
            FileUtils.setStorageDir(this.config.jsonFileDir);
            JsonStorageUtils.setStorageFilename(this.config.jsonName);
        } else if (this.config.storage == "redis") {
            this.redis = new QiwiDaemonRedis();
        }

        const transactionMinimal = parseFloat(env("TRANS_AMOUNT"));

        // Trasnactions minimal should not be less than zero and shoud be number
        if (isNaN(transactionMinimal) || transactionMinimal < 0) {
            logger.error("Failed to parse TRANS_AMOUNT enviroment variable. It must be positive number");
            throw new Error("Failed to parse TRANS_AMOUNT.");
        } else if (transactionMinimal === 0) {
            logger.warn("TRANS_AMOUNT set to 0. Daemon will accept any value when checking transaction sum.");
        }

        this.transactionMinimal = transactionMinimal;
        this.walletApiKey = env("QIWI_TOKEN");
    }

    // Getting sure that daemon has access to storage
    private connectStorage(): Promise<boolean> {
        return new Promise(async (res) => {
            const { storage: storageType, jsonName } = this.config;

            if (storageType == "redis") {
                this.redis.client.on("connect", () => {
                    logger.debug("Redis is connected...");

                    res(true);
                });
            } else if (storageType == "json") {
                const storageFileName = jsonName;

                const exists = await FileUtils.fileExists(storageFileName);

                if (!exists) {
                    await JsonStorageUtils.createStorageFile();
                    logger.info(`Created ${this.config.jsonName}`);
                }

                res(true);
            }
        });
    }

    /** This funtion forces daemon to work */
    async start() {
        await this.connectStorage();

        this.watch();
        this.emit("start");
    }

    /**
     *
     * @param msg optional data to be passed to callback for additional information
     */
    async stop(msg?: any) {
        clearTimeout(this.watchingProcess as NodeJS.Timeout);

        if (this.config.storage == "redis") {
            try {
                this.redis.client.quit();                
            } catch {    
                logger.warn("Redis quited with error");
            }
        }

        this.runningState = false;
        this.emit("stop", msg ?? "Stop function call.");
    }

    /** Shortcut for listen("transaction_confirm", cb) */
    onTransactionConfirm(listener: (id: string) => void) {
        this.listeners.push({ event: "confirm_transaction", cb: listener });
    }

    /**
     *  Add listener to the event
     * @param event - name for event to be listenned
     * @param listener - callback function to listen on event
     */
    listen(event: DaemonEvent, listener: Function) {
        this.listeners.push({ cb: listener, event });
    }

    private emit(event: DaemonEvent, data?: any) {
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
                if (!(await this.redis.asyncGet(potentialKeyword))) {
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
        if (this.config.storage == "redis") await this.redis.asyncSet(s.keyword, s.id);
        else if (this.config.storage == "json") {
            JsonStorageUtils.saveSession(s);
        }
    }

    private async getSessionId(comment: string): Promise<string | null> {
        if (this.config.storage == "redis") return await this.redis.asyncGet(comment);
        else if (this.config.storage == "json") {
            const session = JsonStorageUtils.getSession(comment);
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
            if (this.config.storage == "redis") {
                this.redis.client.del(keyword, keyword, () => {
                    res();
                });
            } else if (this.config.storage == "json") {
                JsonStorageUtils.deleteSession(keyword);
            }
        });
    }

    /**
     * Starts process of watching for new payments
     */
    private watch() {
        logger.info("QiWiDaemon Started");
        this.emit("watch_start");
        this.runningState = true;

        this.watchingProcess = setTimeout(async () => {
            // Comments that are already checked and user has been confirmed. Used to avoit double checking
            const confirmedComments: string[] = [];
            let transactions;

            try {
                transactions = await QiWi.getOperationsHistory(env("PHONE_NUMBER"), this.walletApiKey);
            } catch (e) {
                if (e.response && e.response.status == 401) {
                    logger.error("QiWi Api responsed with 401 code. This means you have set wrong cridentials for your daemon.");
                } else {
                    logger.error("Unknown error occured.");
                }

                logger.warn("Stopping Daemon.");
                return this.stop("Unable to process payment history");
            }

            if (transactions.data) {
                let payments: Transaction[] = transactions.data
                    .filter((tnx: any) => tnx.sum.amount >= this.transactionMinimal && tnx.comment)
                    .map((tnx: any) => {
                        return {
                            person: tnx.account,
                            comment: tnx.comment,
                            date: tnx.date,
                        };
                    });
                for (let payment of payments) {
                    if (confirmedComments.includes(payment.comment)) continue;

                    // Checking if daemon is actually running before requesting sessionId to avoid errors with disconnected Redis
                    if (this.isRunning) {
                        const sessionId = await this.getSessionId(payment.comment);

                        if (sessionId) {
                            confirmedComments.push(payment.comment);
                            this.emit("confirm_transaction", sessionId);
                            this.delSession(payment.comment);
                            transactionsLogger.log("info", `Payment for ${sessionId} has confirmed.`);
                        }
                    }
                }
            }
        }, this.config.updateTimout * 1000);
    }
}

export { QiWiDaemon };
