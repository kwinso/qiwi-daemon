"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QiWiDaemon = void 0;
const logger_1 = require("./tools/logger");
// @ts-ignore <fuck node-qiwi-api>
const node_qiwi_api_1 = require("node-qiwi-api");
const env_1 = require("./tools/env");
const redis_1 = require("./tools/redis");
const wordlist_1 = require("./tools/wordlist");
const utils_1 = require("./utils");
class QiWiDaemon {
    constructor(config) {
        this.config = {
            updateTimout: 30,
            database: "redis",
            jsonName: "qiwi-daemon.db.json",
        };
        this.listeners = [];
        // If config passed, combining all values the default config values
        if (config)
            this.config = Object.assign(Object.assign({}, this.config), config);
        env_1.envCheck();
        this.wallet = new node_qiwi_api_1.asyncApi(env_1.env("QIWI_TOKEN"));
    }
    connectDatabase() {
        return new Promise((res) => __awaiter(this, void 0, void 0, function* () {
            const { database: databaseType, jsonName } = this.config;
            if (databaseType == "redis") {
                redis_1.redisClient.on("connect", () => {
                    logger_1.logger.debug("Redis connected...");
                    res(true);
                });
            }
            else if (databaseType == "json") {
                const databaseFileName = jsonName;
                const exists = yield utils_1.FileUtils.fileExists(databaseFileName);
                if (!exists) {
                    yield utils_1.JsonDBUtils.createDatabaseFile(databaseFileName);
                    logger_1.logger.info(`Created ${this.config.jsonName}`);
                }
                res(true);
            }
        }));
    }
    /** This function start bot to check history */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectDatabase();
            this.watch();
            this.emit("ready");
        });
    }
    onPaymentConfirm(listener) {
        this.listeners.push({ event: "confirm_payment", cb: listener });
    }
    /**
     *  Add listener to the event
     * @param event - name for event to be listenned
     * @param listener - callback function to listen on event
     */
    listen(event, listener) {
        this.listeners.push({ cb: listener, event });
    }
    emit(event, data) {
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
    createPaymentSession(id, customKeyword) {
        return __awaiter(this, void 0, void 0, function* () {
            let keyword;
            if (!customKeyword) {
                while (true) {
                    const potentialKeyword = wordlist_1.getKeyword();
                    if (!(yield redis_1.redisGet(potentialKeyword))) {
                        keyword = potentialKeyword;
                        break;
                    }
                }
            }
            else
                keyword = customKeyword;
            logger_1.logger.debug(`Created new payment for ${id} with keyword: ${keyword}`);
            yield this.saveSession({ keyword, id });
            return keyword;
        });
    }
    saveSession(s) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.database == "redis")
                yield redis_1.redisSet(s.keyword, s.id);
            else if (this.config.database == "json") {
                utils_1.JsonDBUtils.saveSession(s, this.config.jsonName);
            }
        });
    }
    getSessionId(comment) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.database == "redis")
                return yield redis_1.redisGet(comment);
            else if (this.config.database == "json") {
                const session = utils_1.JsonDBUtils.getSession(comment, this.config.jsonName);
                if (session)
                    return session.id;
                else
                    return null;
            }
            else {
                return null;
            }
        });
    }
    delSession(keyword) {
        return __awaiter(this, void 0, void 0, function* () {
            // Creating promise to make sure code can await deletion
            return new Promise((res) => {
                // I don't know what is 2nd argument for, so just throw the same keyword
                if (this.config.database == "redis") {
                    redis_1.redisClient.del(keyword, keyword, () => {
                        res();
                    });
                }
                else if (this.config.database == "json") {
                    utils_1.JsonDBUtils.deleteSession(keyword, this.config.jsonName);
                }
            });
        });
    }
    /**
     * Starts process of watching for new payments
     */
    watch() {
        logger_1.logger.info("QiWiDaemon Started");
        this.emit("watch_start");
        const checkTimeout = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            // Comments that are already checked and user has been confirmed. Used to avoit double checking
            const confirmedComments = [];
            let transactions;
            try {
                transactions = yield this.wallet.getOperationHistory(env_1.env("PHONE_NUMBER"), { rows: 50, operation: "IN" });
            }
            catch (_a) {
                logger_1.logger.error("Failed to get your transactions history. Probably, you have set bad credentials.");
                logger_1.logger.warn("Stopping Daemon.");
                this.emit("stop");
                clearTimeout(checkTimeout);
                return;
            }
            if (transactions.data) {
                let payments = transactions.data
                    .filter((tnx) => tnx.sum.amount >= Number(env_1.env("PAYMENT_AMOUNT")) && tnx.comment)
                    .map((tnx) => {
                    return {
                        person: tnx.account,
                        comment: tnx.comment,
                        date: tnx.date,
                    };
                });
                for (let payment of payments) {
                    if (confirmedComments.includes(payment.comment))
                        continue;
                    const sessionId = yield this.getSessionId(payment.comment);
                    if (sessionId) {
                        confirmedComments.push(payment.comment);
                        this.emit("confirm_payment", sessionId);
                        this.delSession(payment.comment);
                        logger_1.paymentsLogger.log("info", `Payment for ${sessionId} has confirmed.`);
                    }
                }
            }
        }), this.config.updateTimout * 1000);
    }
}
exports.QiWiDaemon = QiWiDaemon;
