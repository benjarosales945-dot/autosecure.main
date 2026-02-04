const axios = require("axios");
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

const config = require("../../../config.json");

function isValidUrl(urlString) {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
}

class HttpClient {
    constructor() {
        this.cookies = [];
        this.axios = axios.create({
            timeout: 10000,
            maxRedirects: 0,
            withCredentials: true,
            validateStatus: (status) => status >= 200 && status < 600,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
        });

        // Initialize proxy agent once if enabled
        this.httpAgent = null;
        this.httpsAgent = null;
        if (config.useproxy === true || config.useproxy === "true") {
            try {
                let proxyString = config.proxy;
                
                // Handle array of proxies (pick random)
                if (Array.isArray(proxyString)) {
                    if (proxyString.length > 0) {
                        proxyString = proxyString[Math.floor(Math.random() * proxyString.length)];
                    } else {
                        proxyString = null;
                    }
                }

                if (proxyString && typeof proxyString === 'string') {
                    const parts = proxyString.split(':');
                    if (parts.length >= 2) {
                        let PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_PASS;
                        if (parts.length === 2) {
                            [PROXY_HOST, PROXY_PORT] = parts;
                        } else if (parts.length === 4) {
                            [PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_PASS] = parts;
                        }
                        
                        let proxyUrl;
                        if (PROXY_USER && PROXY_PASS) {
                            proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
                        } else {
                            proxyUrl = `http://${PROXY_HOST}:${PROXY_PORT}`;
                        }
                        
                        this.httpAgent = new HttpProxyAgent(proxyUrl);
                        this.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    }
                }
            } catch (error) {
                console.error('Error setting up proxy agents:', error);
            }
        }

        this.axios.interceptors.request.use(axiosConfig => {
            if (this.cookies.length > 0) {
                axiosConfig.headers['Cookie'] = this.cookies.join("; ");
            }
            return axiosConfig;
        });

        this.axios.interceptors.response.use(response => {
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
                setCookieHeader.forEach(cookie => this.setCookie(cookie));
            }
            return response;
        });

        this.axios.interceptors.request.use(async (axiosConfig) => {
            // Check for explicit skip flag
            if ((config.useproxy === true || config.useproxy === "true") && !axiosConfig._skipProxy) {
                if (this.httpAgent && this.httpsAgent) {
                    axiosConfig.httpAgent = this.httpAgent;
                    axiosConfig.httpsAgent = this.httpsAgent;
                }
            }
            return axiosConfig;
        });
    }

    getCookie(cName) {
        const cookie = this.cookies.find(cookie => cookie.startsWith(`${cName}=`));
        return cookie ? cookie.split(';')[0].split('=')[1] : null;
    }

    setCookie(cookie) {
        const [cName] = cookie.split("=");
        const cookieIndex = this.cookies.findIndex(c => c.startsWith(`${cName}=`));
        if (cookieIndex !== -1) {
            this.cookies[cookieIndex] = cookie;
        } else {
            this.cookies.push(cookie);
        }
    }

    deleteCookie(cName) {
        this.cookies = this.cookies.filter(cookie => !cookie.startsWith(`${cName}=`));
    }

    clearCookies() {
        this.cookies = [];
    }

    async checkProxy() {
        if (!this.httpAgent && !this.httpsAgent) return true;

        try {
            console.log('Checking proxy connection...');
            await this.axios.get('https://www.google.com', {
                timeout: 5000
            });
            console.log('Proxy connection successful.');
            return true;
        } catch (error) {
            console.error('Proxy check failed:', error.message);
            return false;
        }
    }

    disableProxy() {
        this.httpAgent = null;
        this.httpsAgent = null;
        console.log('Proxy disabled.');
    }

    async get(url, axiosConfig = {}, retries = 2) {
        if (!isValidUrl(url)) throw new Error(`Invalid URL ${url}`);
        return this._requestWithRetry('get', url, axiosConfig, retries);
    }

    async post(url, data, axiosConfig = {}, retries = 2) {
        if (!isValidUrl(url)) throw new Error("Invalid URL");
        return this._requestWithRetry('post', url, data, axiosConfig, retries);
    }

    async put(url, data, axiosConfig = {}, retries = 2) {
        if (!isValidUrl(url)) throw new Error("Invalid URL");
        return this._requestWithRetry('put', url, data, axiosConfig, retries);
    }

    async delete(url, axiosConfig = {}, retries = 2) {
        if (!isValidUrl(url)) throw new Error("Invalid URL");
        return this._requestWithRetry('delete', url, axiosConfig, retries);
    }

    async _requestWithRetry(method, url, ...args) {
        const retries = args[args.length - 1];
        const requestArgs = args.slice(0, -1);
        let useProxy = (config.useproxy === true || config.useproxy === "true");

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await this.axios[method](url, ...requestArgs);
            } catch (error) {
                console.log(`Retry ${attempt + 1} failed${useProxy ? ' with proxy' : ''}. ${attempt < retries - 1 ? 'Retrying.' : 'All retries exhausted.'}`);
                
                // If proxy is enabled and we failed, try next attempt without proxy if it's the last retry or we want to try alternate immediately
                if (useProxy && attempt === retries - 1) {
                    try {
                        console.log('Proxy failed, attempting request without proxy...');
                        // Clone the config and add _skipProxy flag
                        const originalConfig = requestArgs[requestArgs.length - 1] || {};
                        const configWithoutProxy = { ...originalConfig, _skipProxy: true };
                        
                        // Reconstruct args with new config
                        const finalArgs = [...requestArgs.slice(0, -1), configWithoutProxy];
                        if (requestArgs.length === 1 && method !== 'get' && method !== 'delete') {
                             // Handling post/put where data is involved (args: data, config)
                             // RequestArgs was [data, config]
                             // We replaced config
                        } else if (method === 'get' || method === 'delete') {
                             // RequestArgs was [config]
                             // We replaced config
                        }
                        
                        return await this.axios[method](url, ...finalArgs);
                    } catch (finalError) {
                        throw finalError;
                    }
                }

                if (attempt === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
}

module.exports = HttpClient;