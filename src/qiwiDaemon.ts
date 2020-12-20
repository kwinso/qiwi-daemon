import { logger, paymentsLogger } from "./tools/logger";
// @ts-ignore <fuck node-qiwi-api>
import { asyncApi as asyncQiWi } from "node-qiwi-api";
import { env, envCheck } from "./tools/env";
import { redisClient, redisGet, redisSet } from "./tools/redis";
import { getKeyword } from "./tools/wordlist";

type DaemonEvents = "ready" | "confirm_payment" | "watch_start";
interface Payment {
    person: any;
    comment: string;
    date: Date;
}

envCheck();

class QiWiDaemon {
    private readonly wallet;
    private listeners: { cb: Function; event: DaemonEvents }[] = [];

    constructor() {
        this.wallet = new asyncQiWi(env("QIWI_TOKEN"));
        redisClient.on("connect", () => {
            logger.debug("Redis connected...");
            logger.info("QiWi Daemon ready.");
            this.emit("ready");
        });
    }

    onPaymentConfirm(listener: (id: string) => void) {
        this.listeners.push({ event: "confirm_payment", cb: listener });
    }

    /**
     *  Adds listenter for event
     * @param event - name for event to be listenned
     * @param listener - callback function to listen on event
     */
    on(event: DaemonEvents, listener: Function) {
        this.listeners.push({ cb: listener, event });
    }

    private emit(event: DaemonEvents, data?: any) {
        this.listeners
            .filter((e) => e.event == event)
            .forEach((e) => e.cb(data));
    }

    /**
     *  Creates new session for user
     * @param id - any string that could be considered as user identifier
     * @param customKeyword - custom keyword (if you want use your way to generate keywords)
     *
     * You have to be sure that redis is connected.
     * Note: to be sure it's will be set, use it in on("ready") callback
     */
    async createPaymentSession(id: string, customKeyword?: string) {
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

        await redisSet(keyword, id);
    }

    /**
     * Starts process of watching for new payments
     */
    watch() {
        logger.debug("QiWiDaemon Started");
        this.emit("watch_start");

        setTimeout(async () => {
            // Comments that are already checked and user has been confirmed.
            const confirmedComments: string[] = [];

            const transactions = await this.wallet.getOperationHistory(
                env("PHONE_NUMBER"),
                { rows: 50, operation: "IN" }
            );

            if (transactions.data) {
                let payments: Payment[] = transactions.data
                    .filter(
                        (tnx: any) =>
                            tnx.sum.amount >= Number(env("PAYMENT_AMOUNT")) &&
                            tnx.comment
                    )
                    .map((tnx: any) => {
                        return {
                            person: tnx.account,
                            comment: tnx.comment,
                            date: tnx.date,
                        };
                    });
                for (let payment of payments) {
                    if (confirmedComments.includes(payment.comment)) continue;
                    const session = await redisGet(payment.comment);
                    if (session) {
                        confirmedComments.push(payment.comment);
                        this.emit("confirm_payment", session);
                        paymentsLogger.log(
                            "info",
                            `Payment for ${session} has confirmed.`
                        );
                    }
                }
            }
        }, 1000 * 30);
    }
}

export { QiWiDaemon };
