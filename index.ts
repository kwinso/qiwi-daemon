declare type DaemonEvents = "start" | "confirm_transaction" | "watch_start" | "stop";
interface DaemonConfig {
    /** Where to store temporary payment sessions */
    storage: "redis" | "json";
    /** Timeout between each wallet history check */
    updateTimout: number;
    /** JSON Storage name */
    jsonName: string;
}
declare class QiWiDaemon {
    private readonly config;
    private readonly wallet;
    private watchingProcess?;
    private listeners;
    private runningState;
    get isRunning(): boolean;
    constructor(config?: Partial<DaemonConfig>);
    private connectStorage;
    /** This function start bot to check history */
    start(): Promise<void>;
    stop(): Promise<void>;
    onTransactionConfirm(listener: (id: string) => void): void;
    /**
     *  Add listener to the event
     * @param event name for event to be listenned
     * @param listener callback function to listen on event
     */
    listen(event: DaemonEvents, listener: Function): void;

    private emit;
    /**
     *  Creates new session for user
     * @param id - any string that could be considered as user identifier
     * @param customKeyword - custom keyword (if you want use your way to generate keywords)
     * @returns Generated keyword
     *
     * You have to be sure that redis is connected.
     * Note: to be sure it's will be set, use it in on("ready") callback
     */
    createPaymentSession(id: string, customKeyword?: string): Promise<string>;
    private saveSession;
    private getSessionId;
    private delSession;
    /**
     * Starts process of watching for new payments
     */
    private watch;
}
export { QiWiDaemon };
