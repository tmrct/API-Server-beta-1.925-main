import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";

let CachedRequestsExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

// Request caches
global.cachedRequests = [];
global.CachedRequestsCleanerStarted = false;

export default class CachedRequestsManager {
    static add(url, content, ETag = "") {
        if (!CachedRequestsCleanerStarted) {
            CachedRequestsCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsCleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url); // Supprimer les anciennes entrées en cache pour cette URL
            cachedRequests.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + CachedRequestsExpirationTime
            });
            console.log(BgWhite + FgBlue,`[Cache added] URL: ${url}`);
        }
    }

    // Démarre un processus de nettoyage périodique des caches périmées
    static startCachedRequestsCleaner() {
        setInterval(CachedRequestsManager.flushExpired, CachedRequestsExpirationTime * 1000);
        console.log(BgWhite + FgBlue, "[Periodic repositories data caches cleaning process started...]");
    }

    // Efface la cache associée à une URL donnée
    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of cachedRequests) {
                if (cache.url == url) indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(cachedRequests, indexToDelete);
            console.log(`[Cache cleared for URL: ${url}]`);
        }
    }

    // Retourne la cache associée à l'URL, si elle existe
    static find(url) {
        try {
            if (url != "") {
                for (let cache of cachedRequests) {
                    if (cache.url == url) {
                        // Renouvelle le temps d'expiration de la cache
                        cache.Expire_Time = utilities.nowInSeconds() + CachedRequestsExpirationTime;
                        console.log(BgWhite + FgBlue, `[${cache.url} data retrieved from cache]`);
                        return { content: cache.content, ETag: cache.ETag };
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[repository cache error!]", error);
        }
        return null;
    }

    // Efface toutes les caches expirées
    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of cachedRequests) {
            if (cache.Expire_Time <= now) {
                console.log(`[Cached data for URL: ${cache.url} has expired]`);
            }
        }
        cachedRequests = cachedRequests.filter(cache => cache.Expire_Time > now);
    }

    // Retourne la réponse à partir de la cache, si elle existe
    static get(HttpContext) {
        let cachedData = CachedRequestsManager.find(HttpContext.req.url);
        if (cachedData) {
            console.log(`[Serving response from cache for URL: ${HttpContext.req.url}]`);
            HttpContext.response.JSON(cachedData.content, cachedData.ETag, true /* from cache */);
            return true;
        }
        return false;
    }
}
