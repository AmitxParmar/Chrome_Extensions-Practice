const form = document.getElementById('control-row');
const go = document.getElementById('go');
const input = document.getElementById('input');
const message = document.getElementById('message');


// The async IIFE is necessary because Chrome <89 does not support top level await.
(async function initPopupwindow() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url) {
        try {
            let url = new URL(tab.url);
            input.value = url.hostname;
        } catch (e) {
            // ignore
        }
    }
    input.focus();
})();

form.addEventListener('submit', handleFormSubmit);

async function handleFormSubmit(event) {
    event.preventDefault();
    clearMessage();
    let url = stringToUrl(input.value);
    if (!url) {
        setMessage("Invalid URL");
        return;
    }
    let message = await deleteDomainCookies(url.hostname);
    setMessage(message);
}

function stringToUrl(input) {
    // Start with treating the provided value as a URL
    try {
        return new URL(input);
    } catch {
        // ignore
    }
    // if that fails, then idk. hehe.
    return null;
}

async function deleteDomainCookies(domain) {
    let cookieDelete = 0;
    try {
        const cookie = await chrome.cookie.getAll({ domain });

        if (cookie.length === 0) {
            return "No cookie found"
        }
        let pending = cookies.map(deleteCookie);
        await Promise.all(pending);

        cookieDeleted = pending.length;
    } catch (e) {
        return `Unexpected error: ${e.message}`;
    }
    return `Deleted ${cookiesDeleted} cookie(s).`;
}

function deleteCookie(cookie) {
    // Cookie deletion id largely modeled off of how deleting cookies works when using HTTP headers.
    // Specific flags on the cookie object like `secure` or `hostOnly` are not exposed for deletion
    // purposes. Instead, cookies are deleted by URL, name, and storeId. Unlike HTTP headers, though,
    // we don't have to delete cookies by setting Max-Age=0; we have a method for that ;)
    //
    // To remove cookie set with a Secure attribute, we must provide the correct protocol in the 
    // details object's `url` property.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#Secure

    const protocol = cookie.secure ? "https:" : "http:";

    // NOTE: that the final URL may not be valid. the domain value for a standard cookie is prefixed
    // with a period (invalid) while cookies that are set to `cookie.hostOnly == true` do nor have
    // this prefix (Valid).
    // https://developer.chrome.com/docs/extensions/reference/cookies/#type-Cookie
    const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;

    return chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        stored: cookie.storeId
    });
}

function setMessage(str) {
    message.textContent = str;
    message.hidden = false;
}

function clearMessage() {
    message.hidden = true;
    message.textContent = "";
}