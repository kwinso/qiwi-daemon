import axios from "axios";

const personsApiUrl = "https://edge.qiwi.com/payment-history/v2/persons/";

export const QiWi = {
    async getOperationsHistory(phone: string, token: string) {
        const headers = {
            Accept: "application/json",
            "content-type": "application/json",
            Authorization: "Bearer " + token,
        };

        const requestUrl = `${personsApiUrl}/${phone}/payments`;

        const result = await axios.get(requestUrl, { headers, params: { rows: 50, operation: "IN" } });

        console.log(result.data);

        return result.data;
    },
};
