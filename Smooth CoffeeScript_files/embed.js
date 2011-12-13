/*jslint white: true, devel: true, onevar: true, browser: true, undef: true, nomen: true, regexp: false, plusplus: false, bitwise: true, newcap: true, maxerr: 50, indent: 4 */

/**
 * rdbEmbed
 *
 * This is the library that gets injected when the embed buttons are instantiated.
 * It handles rendering the embed button iframes and interaction with the host page (injecting scripts, etc).
**/
window.rdbEmbed = (function () {
    var inited               = false,
        baseUrl              = '//www.readability.com',
        embedCounter         = 0, /* the number of embeds we're converting. Used to unique identification of embeds. */
        frameBaseUrl         = baseUrl + '/static/embed/embed.html',
        frameStyles,
        frameContainerStyles,
        frameHtml,
        frameContainerHtml,
        rdbWrappers,
        messageCallbacks,
        waitingFrame; /* The frame that is waiting for a response from trigger_save */

    /******* UTILITY METHODS *******/

    /**
     * Inject a script into the current DOM.
     *
     * @param url string - the JS to inject
     * @return void
    **/
    function injectScript(url) {
        var h = document.createElement('script');
        h.setAttribute('type', 'text/javascript');
        h.setAttribute('charset', 'UTF-8');
        h.setAttribute('src', url);
        document.documentElement.appendChild(h);
    }

    /**
     * Turn a dash-case-string into lowerCamelCase
     *
     * @param dashCaseString string - The string to convert
     * @return string the lowerCamelCase equivalent
    **/
    function dashCaseToLowerCamelCase(dashCaseString) {
        return dashCaseString.replace(/-\w/g, function ($0) {
            return $0.substr($0.length - 1).toUpperCase();
        });
    }

    /**
     * Given a relative URL (blog.html), resolve it to a full URL (http://blah.com/blog.html)
     * Additionally cleans the URL to be properly URI encoded - works around a safari bug
     * where window.location.href is not fully URI encoded.
     *
     * @param url string - the url to absolutize.
     * @return string - the resultant absolute URL.
    **/
    function resolveUrl(url) {
        var a = document.createElement('a');
        a.href = url;
        return a.href;
    }

    /******* EVENT HANDLING *******/

    /**
     * Proxy an event out to the frame that is waiting for a response, if one exists.
     * @param eventName The event to be passed
     * @param args a dictionary of arguments to be passed with the event
     * @param stopWaiting boolean - true if the frame should stop waiting for any events as a result of this event.
    **/
    function proxyEvent(eventName, args, stopWaiting) {
        if (waitingFrame) {
            waitingFrame.postMessage(JSON.stringify({
                "event": eventName,
                "args": args || {}
            }), '*');

            if (stopWaiting) {
                waitingFrame = null;
            }
        }
    }

    /**
     * The callbacks that we'll be listening for from our iframe. These are currently only relevant for save.
     * Each callback expects an Object of arguments.
    **/
    messageCallbacks = {
        /**
         * Given a token, set our current window's token to same.
         *
         * @param args Object - containing "token" to set readabilityToken to.
         * @return void
        **/
        "set_token": function (args) {
            window.readabilityToken = args.token;
        },

        /**
         * "Read Now" was clicked, so inject the reading script to trigger it.
         *
         * @param args Object - optionally containing "url" to denote a different URL than the current one.
         * @return void
        **/
        "trigger_read": function (args) {
            window.readabilityUrl = args.hasOwnProperty('url') && args.url ? args.url : "";
            injectScript(baseUrl + '/bookmarklet/read.js');
        },

        /**
         * "Read Later" was clicked, so inject the reading script to trigger it.
         *
         * @param args Object - optionally containing "url" to denote a different URL than the current one.
         * @return void
        **/
        "trigger_save": function (args, event) {
            waitingFrame = event.source;

            window.readabilityUrl = args.hasOwnProperty('url') && args.url ? args.url : "";
            injectScript(baseUrl + '/bookmarklet/save.js');
        },

        /**
         * "Print" was clicked, so trigger the read now script, passing print to it.
         *
         * @param args Object - optionally containing "url" to denote a different URL than the current one.
         * @return void
        **/
        "trigger_print": function (args) {
            window.readabilityUrl = args.hasOwnProperty('url') && args.url ? args.url : "";
            
            injectScript(baseUrl + '/bookmarklet/print.js');
        },

        /**
         * "Send to Kindle" was clicked, so inject the reading script to trigger it.
         *
         * @param args Object - optionally containing "url" to denote a different URL than the current one.
         * @return void
        **/
        "trigger_send_to_kindle": function (args, event) {
            waitingFrame = event.source;

            window.readabilityKindleAction = '';
            window.readabilityUrl          = args.hasOwnProperty('url') && args.url ? args.url : "";

            injectScript(baseUrl + '/bookmarklet/send-to-kindle.js');
        },

        /**
         * "Setup Kindle" was clicked.
         *
         * @param args Object - optionally containing "url" to denote a different URL than the current one.
         * @return void
        **/
        "trigger_setup_kindle": function (args, event) {
            if (!waitingFrame) {
                waitingFrame = event.source;

                window.readabilityKindleAction = 'showSetup';
                window.readabilityUrl          = args.hasOwnProperty('url') && args.url ? args.url : "";

                injectScript(baseUrl + '/bookmarklet/send-to-kindle.js');
            }
        },

        /**
         * "Read Later" succeeded, so let the waiting frame know so that it can run any logic it needs to.
         *
         * @param args Object - unused currently.
         * @return void
        **/
        "queue_success": function (args) {
            proxyEvent('queue_success', {}, true);
        },

        /**
         * "Send to Kindle" succeeded, so let the waiting frame know so that it can run any logic it needs to.
         *
         * @param args Object - unused currently.
         * @return void
        **/
        "send_to_kindle_success": function (args) {
            proxyEvent('send_to_kindle_success', {}, true);
        },

        /**
         * Proxy out kindle_setup_cancelled to our waiting frame.
         *
         * @param args Object - unused currently.
         * @return void
        **/
        "kindle_setup_cancelled": function (args) {
            proxyEvent('kindle_setup_cancelled', {}, true);
        },

        /**
         * Proxy out kindle_setup_success to our waiting frame.
         *
         * @param args Object - unused currently.
         * @return void
        **/
        "kindle_setup_success": function (args) {
            proxyEvent('kindle_setup_success', {}, true);
        }
    };

    /**
     * Cross browser addEventListener from http://snipplr.com/view.php?codeview&id=3116
     *
     * @param evnt - the event to listen for, like "click"
     * @param elem - the element onto which to attach said event
     * @param func - the callback which will be called on event.
     * @return boolean True on successful attach.
    **/
    function listen(evnt, elem, func) {
        if (elem.addEventListener) { // W3C DOM
            elem.addEventListener(evnt, func, false);
        } else if (elem.attachEvent) { // IE DOM
            elem.attachEvent("on" + evnt, func);
        } else {
            return false;
        }

        return true;
    }

    /**
     * receiveMessage support in the format that we're expecting.
     *
     * @param event - the event
     * @return void
    **/
    function receiveMessage(event) {
        var eventObject,
            eventName,
            eventArgs;

        try {
            eventObject = JSON.parse(event.data);
        } catch(e) {
            return false;
        }

        /** The event was passed in a way we're not expecting. Fail. **/
        if (typeof eventObject !== "object") {
            return false;
        }

        eventName = eventObject.event;
        eventArgs = eventObject.args;

        if (messageCallbacks.hasOwnProperty(eventName)) {
            return messageCallbacks[eventName](eventArgs, event);
        }
    }


    /******* SESSION METHODS *******/

    /**
     * Look for a token cookie, and set readabilityToken if we had one.
     *
     * @return void
    **/
    function checkToken() {
        var hasToken = document.cookie.indexOf('readabilityToken=') !== -1;

        if (hasToken) {
            window.readabilityToken = document.cookie.match(/readabilityToken=([^;]+)/)[1];
        } else {
            window.readabilityToken = null;
        }
    }


    /******* DOM MANIPULATION METHODS *******/

    /**
     * Given an rdbWrapper element, convert it into an iframe that will allow read now/later.
     *
     * @param rdbWrapper Element - the rdbWrapper to convert.
     * @return void
    **/
    function convertEmbed(rdbWrapper) {
        var queryStrings  = [],
            frameUrl      = frameBaseUrl,
            customAttribs = {
                "text-color": null,
                "bg-color": null,
                "url": null,
                "show-send-to-kindle": null,
                "show-read": null,
                "show-print": null,
                "show-email": null,
                "orientation": null,
                "version":null
            },
            customAttribValue,
            lCaseName,
            attrib;

        /**
         * Look for any custom attributes like data-bg-color or data-url to be appended to our frame src.
        **/
        for (attrib in customAttribs) {
            if (customAttribs.hasOwnProperty(attrib)) {
                customAttribValue = rdbWrapper.getAttribute('data-' + attrib);
                if (customAttribValue) {
                    lCaseName = dashCaseToLowerCamelCase(attrib);

                    /* Special resolving for URLs */
                    if (attrib === "url") {
                        customAttribValue = resolveUrl(customAttribValue);
                    }

                    queryStrings.push(lCaseName + '=' + encodeURIComponent(customAttribValue));
                }
            }
        }

        /**
         * If we weren't passed our url explicitly, inherit the current page's URL
        **/
        if (rdbWrapper.getAttribute('data-url') === null) {
            queryStrings.push('url=' + encodeURIComponent(resolveUrl(window.location.href)));
        }

        /**
         * Set new height on frame if we're using vertical orientation.
        **/
        if (rdbWrapper.getAttribute('data-orientation') === "1") {
            frameStyles = "height: 175px; overflow: hidden; border-width: 0; white-space: nowrap; width: 100%;";
            frameContainerStyles = "height: 175px; padding: 0; margin: 0; z-index: 50000";

        } else {
            frameStyles = "height: 35px; overflow: hidden; border-width: 0; white-space: nowrap; width: 100%;";
            frameContainerStyles = "height: 35px; padding: 0; margin: 0; z-index: 50000";

        }

        if (queryStrings.length > 0) {
            frameUrl += '?' + queryStrings.join('&');
        }

        frameHtml = [
            '<iframe id="readabilityEmbedIFrame-', embedCounter, '" ',
            'name="readabilityEmbedIFrame-', embedCounter, '" ',
            'scrolling="no" ',
            'frameborder="0" ',
            'style="', frameStyles, '" ',
            'src="', frameUrl, '">',
            '</iframe>'
        ].join('');

        frameContainerHtml = [
            '<div id="readabilityEmbedContainer"',
            'name="readabilityEmbedContainer"',
            'style="' + frameContainerStyles + '"',
            '>', frameHtml, '</div>'
        ].join(' ');

        rdbWrapper.innerHTML = frameContainerHtml;

        embedCounter++;
    }


    /******* INITIALIZATION METHODS *******/

    /**
     * Starts listening for events and converts all rdbWrappers into iframes.
     *
     * @return void
    **/
    function init() {
        var i,
            il,
            rdbWrapper;

        if (inited) {
            return;
        }
        inited = true;
        /* Start listening for any events */
        listen("message", window, receiveMessage);

        checkToken();

        /* Initialize all of the wrappers we're aware of */
        rdbWrappers = document.querySelectorAll('.rdbWrapper, #rdbWrapper');
        for (i = 0, il = rdbWrappers.length; i < il; i++) {
            rdbWrapper = rdbWrappers[i];
            convertEmbed(rdbWrapper);
        }
    }

    /**
     * Kill our inited flag so that we can reset an embed preview.
     *
     * @return callback
    **/
    function reInitialize(reset, callback) {
        inited = (reset ? false : true);

        if (typeof callback === "function") {
            callback();
        }
    }

    /**
     * If we're on a legacy browser, just hide our wrappers.
     *
     * @return void
    **/
    function legacyBrowserFail() {
        var head  = document.getElementsByTagName('head')[0],
            style = document.createElement('style'),
            rules = document.createTextNode('.rdbWrapper, #rdbWrapper { display: none; }');

        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = rules.nodeValue;
        } else {
            style.appendChild(rules);
        }
        head.appendChild(style);
    }

    return {
        "init": init,
        "reInitialize": reInitialize,
        "legacyBrowserFail": legacyBrowserFail
    };

}());


/**
 * Ensure we have enough capability to handle embeds, should work in
 * IE8+, FF3.5+, Safari4+, iOS Safari 4+, Chrome, Android 2.1+
 * Inspired by Pareto Browser Filter by Filipe Fortes: http://www.fortes.com/2011/the-pareto-browser-filter
**/
if (document.querySelectorAll && window.postMessage && window.JSON) {
    /**
     * Bind on DOMContentLoaded if we have it, otherwise just onload.
     * We could be smarter here by doing the scroll hack, but I'm not sure it's worth the code overhead.
    **/
    if (document.readyState === "complete") {
        /* We were already ready - just init immediately. */
        window.rdbEmbed.init();
    } else {
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", window.rdbEmbed.init, false);
            window.addEventListener("load", window.rdbEmbed.init, false);
        } else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", window.rdbEmbed.init);
            window.attachEvent("onload", window.rdbEmbed.init);
        }
    }
} else {
    window.rdbEmbed.legacyBrowserFail();
}
