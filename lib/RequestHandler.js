const http = require("http");
const https = require("https");
const { URL } = require("url");

/**
 * Handles internal requests from the library.
 */
class RequestHandler {
    constructor(client) {
        this._client = client;
    }

    /**
     * Makes a request to a URL.
     * @param {String} method 
     * @param {String} url 
     * @param {Boolean} [auth=false] Send Authentication header
     * @returns {Object | String} Parsed data
     */
    request(method, url, auth = false) {
        return new Promise((resolve, reject) => {
            url = new URL(url);

            const headers = {
                "User-Agent": "Bot"
            }
            if (auth) headers["Authorization"] = this._client.token;

            const requestParams = {
                method,
                headers,
                host: url.hostname,
                path: url.pathname + url.search,
            }

            let req;
            if (url.protocol === "https:") req = https.request(requestParams);
            else req = http.request(requestParams);

            req.once("abort", () => reject(new Error("Request aborted by client")))
            .once("aborted", () => reject(new Error("Request aborted by server")))
            .once("error", error => {
                this._client.emit("error", error);
                req.abort();
            }).once("response", res => {
                let response = [];

                res.on("data", chunk => response.push(chunk));

                res.on("end", () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error("Server returned error code"))
                        return;
                    }

                    if (response.length > 0) {
                        //if (res.headers["content-type"].startsWith("application/json")) {
                            try {
                                response = JSON.parse(response.join(""));
                            } catch(jsonException) {
                                console.log(jsonException)
                                reject(new Error("Failed to parse JSON"));
                                return;
                            }
                        //}
                    }

                    resolve(response);
                });
            });

            req.setTimeout(20000, () => reject(new Error("Connection timed out")));

            req.end();
        });
    }
}

module.exports = RequestHandler;