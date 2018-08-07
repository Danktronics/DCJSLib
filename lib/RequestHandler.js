const http = require("http");
const https = require("https");

/**
 * Handles internal requests from the library. (Highly discouraged to use.)
 */
class RequestHandler {
    constructor() {

    }

    /**
     * Makes a request to a URL. (Smart security.)
     * @param {String} method 
     * @param {String} url 
     * @returns {Object | String} Parsed data. (Completed chunks)
     */
    request(method, url) {
        return new Promise((resolve, reject) => {
            let secure;
            if (url.slice(0, 6) === "https:") {
                secure = true;
            } else if (url.slice(0, 5) === "http:") {
                secure = false;
            } else {
                return new Error("Invalid URL.");
            }
    
            switch (method) {
                case "GET":
                    secure ? resolve(this.sendSecuredRequest(method, url)) : resolve(this.sendUnsecuredRequest(method, url));
                    break;
            }
        });
    }

    sendSecuredRequest(method, url) {
        return new Promise((resolve, reject) => {
            https.get(url, response => {
                let responseData = '';

                response.on("data", chunk => {
                    responseData += chunk;
                });

                response.on("end", () => {
                    resolve(JSON.parse(responseData));
                });
            }).on("error", error => {
                resolve(new Error(`Failed to get data from ${url}. Error: ${error}`));
            });
        });
    }

    sendUnsecuredRequest(method, url) {
        return new Promise((resolve, reject) => {
            http.get(url, response => {
                let responseData = '';

                response.on("data", chunk => {
                    responseData += chunk;
                });

                response.on("end", () => {
                    resolve(JSON.parse(responseData));
                });
            }).on("error", error => {
                resolve(new Error(`Failed to get data from ${url}. Error: ${error}`));
            });
        });
    }
}

module.exports = RequestHandler;